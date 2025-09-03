import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FuelTransaction } from '../entities/fuel-transaction.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { OrgAccount } from '../../organizations/entities/org-account.entity';
import { Card } from '../../cards/entities/card.entity';
import { CardLimitRule } from '../../usage/entities/card-limit-rule.entity';
import { CardUsageBucket } from '../../usage/entities/card-usage-bucket.entity';
import { TransactionResponseDto } from '../dto/transaction-response.dto';
import { randomUUID } from 'crypto';

type Incoming = {
  cardNumber?: string; // we will hash in real impl
  amountCents: string;
  currency: string;
  occurredAt: string;
  externalRef?: string;
};

@Injectable()
export class TransactionsService {
  constructor(private ds: DataSource) {}

  async execute(dto: Incoming, stationId?: string): Promise<TransactionResponseDto> {
    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      // 1) Resolve card + organization (demo: by last4; in prod: by hash)
      const card = await qr.manager.findOne(Card, { where: { last4: '4242', status: 'active' } });
      if (!card) throw new Error('Card not found');

      const org = await qr.manager.findOneByOrFail(Organization, { id: card.organizationId });
      const acc = await qr.manager.findOneByOrFail(OrgAccount, { organizationId: org.id });

      const amount = BigInt(dto.amountCents);

      // 2) Fetch active rules (e.g., DAILY + MONTHLY)
      const rules = await qr.manager.find(CardLimitRule, {
        where: { cardId: card.id, active: true },
      });

      // 3) For each rule, compute bucket [start,end) then upsert + check limits
      const occurredAt = new Date(dto.occurredAt);
      for (const rule of rules) {
        const { start, end } = this.computeBucket(rule, occurredAt);
        // Upsert the bucket
        let bucket = await qr.manager.findOne(CardUsageBucket, {
          where: {
            cardId: card.id,
            periodType: rule.periodType as any,
            bucketStart: start as any,
            bucketEnd: end as any,
          },
        });
        if (!bucket) {
          bucket = qr.manager.create(CardUsageBucket, {
            cardId: card.id,
            periodType: rule.periodType as any,
            bucketStart: start,
            bucketEnd: end,
            spentCents: '0',
          });
        }
        const current = BigInt(bucket.spentCents);
        if (current + amount > BigInt(rule.limitCents)) {
          // reject
          const txId = randomUUID();
          await qr.manager.save(FuelTransaction, {
            id: txId,
            occurredAt,
            cardId: card.id,
            organizationId: org.id,
            stationId,
            externalRef: dto.externalRef ?? null,
            amountCents: dto.amountCents,
            currency: dto.currency,
            status: 'rejected',
            declineReason: 'limit_exceeded',
            meta: {},
          });
          await qr.rollbackTransaction();
          return new TransactionResponseDto({ status: 'rejected', reason: 'Limit exceeded' });
        }
        // stage update
        bucket.spentCents = (current + amount).toString();
        await qr.manager.save(bucket);
      }

      // 4) Check org balance and debit
      const available = BigInt(acc.availableCents);
      if (available < amount) {
        const txId = randomUUID();
        await qr.manager.save(FuelTransaction, {
          id: txId,
          occurredAt,
          cardId: card.id,
          organizationId: org.id,
          stationId,
          externalRef: dto.externalRef ?? null,
          amountCents: dto.amountCents,
          currency: dto.currency,
          status: 'rejected',
          declineReason: 'insufficient_balance',
          meta: {},
        });
        await qr.rollbackTransaction();
        return new TransactionResponseDto({ status: 'rejected', reason: 'Insufficient balance' });
      }

      acc.availableCents = (available - amount).toString();
      await qr.manager.save(acc);

      // 5) Insert approved transaction (Timescale hypertable)
      const txId = randomUUID();
      await qr.manager.save(FuelTransaction, {
        id: txId,
        occurredAt,
        cardId: card.id,
        organizationId: org.id,
        stationId,
        externalRef: dto.externalRef ?? null,
        amountCents: dto.amountCents,
        currency: dto.currency,
        status: 'approved',
        meta: {},
      });

      await qr.commitTransaction();
      return new TransactionResponseDto({ status: 'approved', transactionId: txId });
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  private computeBucket(rule: CardLimitRule, at: Date): { start: Date; end: Date } {
    const start = new Date(at);
    const end = new Date(at);
    switch (rule.windowMode) {
      case 'CALENDAR':
        if (rule.periodType === 'DAILY') {
          start.setUTCHours(0, 0, 0, 0);
          end.setUTCDate(start.getUTCDate() + 1);
          end.setUTCHours(0, 0, 0, 0);
        } else if (rule.periodType === 'WEEKLY') {
          const day = start.getUTCDay(); // 0..6
          const diff = (day + 6) % 7; // start Monday
          start.setUTCDate(start.getUTCDate() - diff);
          start.setUTCHours(0, 0, 0, 0);
          end.setUTCDate(start.getUTCDate() + 7);
        } else if (rule.periodType === 'MONTHLY') {
          start.setUTCDate(1); start.setUTCHours(0,0,0,0);
          end.setUTCMonth(start.getUTCMonth() + 1, 1); end.setUTCHours(0,0,0,0);
        }
        break;
      case 'ANCHOR':
        // e.g., day 10 for N days
        const aDay = rule.anchorDayOfMonth ?? 1;
        const len = rule.anchorLengthDays ?? 30;
        start.setUTCDate(aDay); start.setUTCHours(0,0,0,0);
        end.setUTCDate(aDay + len); end.setUTCHours(0,0,0,0);
        break;
      case 'ROLLING':
        const hours = rule.rollingHours ?? 24;
        start.setTime(at.getTime() - hours * 3600 * 1000);
        break;
    }
    return { start, end };
  }
}
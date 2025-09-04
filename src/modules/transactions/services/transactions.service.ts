import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { IncomingTransactionDto } from '../../webhooks/dto/incoming-transaction.dto';
import { Organization } from '../../organizations/entities/organization.entity';
import { OrgAccount } from '../../organizations/entities/org-account.entity';
import { Card } from '../../cards/entities/card.entity';
import { CardLimitRule } from '../../usage/entities/card-limit-rule.entity';
import { CardUsageBucket } from '../../usage/entities/card-usage-bucket.entity';
import { FuelTransaction } from '../entities/fuel-transaction.entity';
import * as crypto from 'crypto';
import { ProcessResult } from '../../webhooks/services/webhooks.service';

@Injectable()
export class TransactionsService {
  constructor(private ds: DataSource) {}

  /**
   * Executes the fuel transaction end-to-end inside a single DB transaction.
   * Validates org balance and DAILY/MONTHLY limits, updates buckets, and persists the final state.
   */
  async execute(dto: IncomingTransactionDto, stationId: string): Promise<ProcessResult> {
    const amount = BigInt(dto.amountCents);
    const occurredAt = new Date(dto.occurredAt);

    // Derive identifiers from incoming payload
    const last4 = dto.cardNumber.replace(/\D/g, '').slice(-4);
    const hash = 'sha256:' + crypto.createHash('sha256').update(dto.cardNumber).digest('hex');

    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // 1) Identify card (prefer hash; fallback to last4 for demo)
      let card = await qr.manager.findOne(Card, { where: { cardNumberHash: hash } });
      if (!card) {
        card = await qr.manager.findOne(Card, { where: { last4 } });
      }
      
      if (!card) {
        await qr.commitTransaction();
        return { kind: 'BAD_REQUEST', code: 'CARD_NOT_FOUND', message: 'Card not found' };
      }

      // Organization & account (FOR UPDATE for balance mutation)
      const org = await qr.manager.findOneBy(Organization, { id: card.organizationId });
      if (!org) {
        await qr.commitTransaction();
        return { kind: 'BAD_REQUEST', code: 'ORG_NOT_FOUND', message: 'Organization not found' };
      }
      if (org.currency !== dto.currency) {
        await qr.commitTransaction();
        return { kind: 'BAD_REQUEST', code: 'CURRENCY_MISMATCH', message: 'Currency mismatch' };
      }

      const account = await qr.manager.findOne(OrgAccount, {
        where: { organizationId: org.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!account) {
        await qr.commitTransaction();
        return { kind: 'BAD_REQUEST', code: 'ORG_NOT_FOUND', message: 'Organization account not found' };
      }

      // Card status
      if (card.status === 'blocked') {
        await qr.commitTransaction();
        return { kind: 'REJECTED', code: 'CARD_BLOCKED', message: 'Card is blocked' };
      }

      // 2) Limits: fetch rules (active)
      const rules = await qr.manager.find(CardLimitRule, { where: { cardId: card.id, active: true } });
      const dailyRule = rules.find((r) => r.periodType === 'DAILY');
      const monthlyRule = rules.find((r) => r.periodType === 'MONTHLY');

      // Compute current windows (UTC)
      const dayStart = new Date(Date.UTC(occurredAt.getUTCFullYear(), occurredAt.getUTCMonth(), occurredAt.getUTCDate(), 0, 0, 0, 0));
      const dayEnd = new Date(Date.UTC(occurredAt.getUTCFullYear(), occurredAt.getUTCMonth(), occurredAt.getUTCDate() + 1, 0, 0, 0, 0));
      const monthStart = new Date(Date.UTC(occurredAt.getUTCFullYear(), occurredAt.getUTCMonth(), 1, 0, 0, 0, 0));
      const monthEnd = new Date(Date.UTC(occurredAt.getUTCFullYear(), occurredAt.getUTCMonth() + 1, 1, 0, 0, 0, 0));

      // ---- Usage read WITHOUT creating buckets on failure
      const [dailyBucket, monthlyBucket] = await Promise.all([
        qr.manager.findOne(CardUsageBucket, { where: { cardId: card.id, periodType: 'DAILY', bucketStart: dayStart, bucketEnd: dayEnd }, lock: { mode: 'pessimistic_read' } }),
        qr.manager.findOne(CardUsageBucket, { where: { cardId: card.id, periodType: 'MONTHLY', bucketStart: monthStart, bucketEnd: monthEnd }, lock: { mode: 'pessimistic_read' } }),
      ]);

      // Current spent
      const dailySpent = BigInt(dailyBucket?.spentCents ?? '0' as unknown as string);
      const monthlySpent = BigInt(monthlyBucket?.spentCents ?? '0' as unknown as string);

      // Check limits
      if (dailyRule && dailySpent + amount > BigInt(dailyRule.limitCents as any)) {
        await qr.commitTransaction();
        return { kind: 'REJECTED', code: 'DAILY_LIMIT_EXCEEDED', message: 'Daily limit exceeded' };
      }
      if (monthlyRule && monthlySpent + amount > BigInt(monthlyRule.limitCents as any)) {
        await qr.commitTransaction();
        return { kind: 'REJECTED', code: 'MONTHLY_LIMIT_EXCEEDED', message: 'Monthly limit exceeded' };
      }

      // Funds
      const currentBalance = BigInt(account.availableCents as any);
      if (currentBalance < amount) {
        await qr.commitTransaction();
        return { kind: 'REJECTED', code: 'INSUFFICIENT_FUNDS', message: 'Insufficient organization balance' };
      }

      // 3) Apply mutations
      account.availableCents = (currentBalance - amount).toString();
      await qr.manager.save(account);
      const dailyToSave = dailyBucket ?? qr.manager.create(CardUsageBucket, {
        cardId: card.id, periodType: 'DAILY', bucketStart: dayStart, bucketEnd: dayEnd, spentCents: '0',
      });
      const monthlyToSave = monthlyBucket ?? qr.manager.create(CardUsageBucket, {
        cardId: card.id, periodType: 'MONTHLY', bucketStart: monthStart, bucketEnd: monthEnd, spentCents: '0',
      });
      dailyToSave.spentCents = (BigInt(dailyToSave.spentCents as any) + amount).toString();
      monthlyToSave.spentCents = (BigInt(monthlyToSave.spentCents as any) + amount).toString();
      await qr.manager.save([dailyToSave, monthlyToSave]);


      const tx = qr.manager.create(FuelTransaction, {
        id: crypto.randomUUID(),
        cardId: card.id,
        organizationId: org.id,
        stationId,
        externalRef: dto.externalRef ?? null,
        amountCents: dto.amountCents,
        currency: dto.currency,
        occurredAt,
        status: 'approved',
        meta: {},
      });
      await qr.manager.save(tx);

      await qr.commitTransaction();
      return { kind: 'APPROVED', txId: tx.id };
    } catch {
      try {
        await qr.rollbackTransaction();
      } catch {}
      return { kind: 'BAD_REQUEST', code: 'INTERNAL_ERROR', message: 'Unexpected error' };
    } finally {
      await qr.release();
    }
  }
}
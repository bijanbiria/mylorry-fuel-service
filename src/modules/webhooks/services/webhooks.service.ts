import { Injectable } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { IncomingTransactionDto } from '../dto/incoming-transaction.dto';
import { WebhookEvent } from '../entities/webhook-event.entity';
import { TransactionsService } from '../../transactions/services/transactions.service';
import { Station } from '../../stations/entities/station.entity';
import { CacheService } from 'src/common/cache/cache.service';
import { CacheKeys } from '../../../common/cache/cache-keys.util';

export type ProcessResult =
  | { kind: 'DUPLICATE' }
  | { kind: 'BAD_REQUEST'; code: 'STATION_INVALID' | 'CARD_NOT_FOUND' | 'ORG_NOT_FOUND' | 'CURRENCY_MISMATCH' | 'INTERNAL_ERROR'; message: string }
  | { kind: 'REJECTED'; code: 'INSUFFICIENT_FUNDS' | 'DAILY_LIMIT_EXCEEDED' | 'MONTHLY_LIMIT_EXCEEDED' | 'CARD_BLOCKED'; message: string }
  | { kind: 'APPROVED'; txId: string };

@Injectable()
export class WebhooksService {
  constructor(
    private ds: DataSource, 
    private txSvc: TransactionsService,
    private cache: CacheService,
  ) { }

  /**
   * Idempotency + routing to domain service. Never throws; returns a discriminated union
   * that the controller maps to HTTP codes and the standard envelope.
   */
  async processIncoming(dto: IncomingTransactionDto, idemKey?: string) {
    const em = this.ds.manager;

    // Resolve/create station (for demo). In production, validate provisioned stations instead.
    let station = await this.cache.getOrSetJson(
      CacheKeys.stationByCode(dto.stationCode),
      () => em.findOneBy(Station, { code: dto.stationCode }),
      600,
    );
    if (!station) {
      // for stricter behavior return BAD_REQUEST instead of auto-creating
      station = await em.save(Station, { code: dto.stationCode, name: dto.stationCode });
    }

    // Idempotency per station
    const where = idemKey
      ? { stationId: station.id, idempotencyKey: idemKey }
      : { stationId: station.id, idempotencyKey: IsNull() };

    let event = await em.findOne(WebhookEvent, { where });
    if (!event) {
      event = await em.save(
        em.create(WebhookEvent, {
          stationId: station.id,
          idempotencyKey: idemKey ?? null,
          rawPayload: dto,
          status: 'received',
        }),
      );
    } else if (event.status === 'processed') {
      // treat duplicate ONLY if a previous run was approved/successfully finalized
      return { kind: 'DUPLICATE' } as const;
    }

    // Delegate to domain service for the rules & mutations
    const result = await this.txSvc.execute(dto, station.id);

    // Mark outcome: only APPROVED -> processed, otherwise -> failed (allows retry without 409)
    if (result.kind === 'APPROVED') {
      await em.update(WebhookEvent, { id: event.id }, { status: 'processed', processedAt: new Date(), errorMessage: null });
    } else {
      await em.update(WebhookEvent, { id: event.id }, { status: 'failed', processedAt: new Date(), errorMessage: result.kind === 'BAD_REQUEST' || result.kind === 'REJECTED' ? result.code : 'UNKNOWN' });
    }

    return result;
  }
}
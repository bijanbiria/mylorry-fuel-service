import { Injectable } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { IncomingTransactionDto } from '../dto/incoming-transaction.dto';
import { WebhookEvent } from '../entities/webhook-event.entity';
import { TransactionsService } from '../../transactions/services/transactions.service';
import { Station } from '../../stations/entities/station.entity';

@Injectable()
export class WebhooksService {
  constructor(private ds: DataSource, private txSvc: TransactionsService) {}

  async processIncoming(dto: IncomingTransactionDto, idemKey?: string) {
    const em = this.ds.manager;

    // Resolve/create station (demo-friendly)
    let station = await em.findOneBy(Station, { code: dto.stationCode });
    if (!station) station = await em.save(Station, { code: dto.stationCode, name: dto.stationCode });

    // Idempotency check (use IsNull() when no idempotency key is provided)
    const where = idemKey
      ? { stationId: station.id, idempotencyKey: idemKey }
      : { stationId: station.id, idempotencyKey: IsNull() };

    let event = await em.findOne(WebhookEvent, { where });

    if (!event) {
      event = em.create(WebhookEvent, {
        stationId: station.id,
        idempotencyKey: idemKey ?? null,
        rawPayload: dto,
        status: 'received',
      });
      event = await em.save(event);
    } else if (event.status === 'processed') {
      // Optional: return cached response if you stored it in meta
      return { status: 'ok', note: 'duplicate ignored' };
    }

    // Map to internal DTO (typically you’d resolve card/org by hash)
    const result = await this.txSvc.execute(dto, station.id);

    // Mark processed
    await em.update(WebhookEvent, { id: event.id }, { status: 'processed', processedAt: new Date() });

    return result;
  }
}
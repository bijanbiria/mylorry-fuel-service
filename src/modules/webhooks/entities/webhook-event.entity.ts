import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Station } from '../../stations/entities/station.entity';

@Entity({ name: 'webhook_events' })
@Unique(['stationId', 'idempotencyKey'])
/**
 * WebhookEvent entity mapping to `webhook_events`. Stores inbound webhook
 * payloads and processing status for deduplication and auditing.
 */
export class WebhookEvent {
  /**
   * Primary key for the webhook event (UUID).
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Originating station for the webhook (nullable).
   */
  @ManyToOne(() => Station, { onDelete: 'SET NULL' })
  station: Station;

  /**
   * Station identifier (FK to stations.id, nullable).
   */
  @Column({ name: 'station_id', type: 'uuid', nullable: true })
  stationId?: string | null;

  /**
   * Idempotency key used to deduplicate events per station.
   */
  @Column({ name: 'idempotency_key', type: 'text', nullable: true })
  idempotencyKey?: string | null;

  /**
   * Raw payload received from the webhook.
   */
  @Column({ name: 'raw_payload', type: 'jsonb' })
  rawPayload: any;

  /**
   * Optional signature or HMAC used for verification.
   */
  @Column({ type: 'text', nullable: true })
  signature?: string | null;

  /**
   * When the event was received by the system.
   */
  @CreateDateColumn({ name: 'received_at' })
  receivedAt: Date;

  /**
   * When the event was processed (nullable if pending or failed early).
   */
  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt?: Date | null;

  /**
   * Processing state of the event lifecycle.
   */
  @Column({ type: 'text', default: 'received' })
  status: 'received' | 'processed' | 'failed';

  /**
   * Error message captured if processing failed.
   */
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null;
}

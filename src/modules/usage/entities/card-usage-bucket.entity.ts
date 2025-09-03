import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Card } from '../../cards/entities/card.entity';

@Entity({ name: 'card_usage_buckets' })
@Index(['cardId', 'periodType', 'bucketStart'])
/**
 * CardUsageBucket entity mapping to `card_usage_buckets`. Aggregates spend
 * over defined windows to track usage against limits.
 */
export class CardUsageBucket {
  /**
   * Primary key for the usage bucket (UUID).
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Card for which usage is tracked.
   */
  @ManyToOne(() => Card, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card: Card;

  /**
   * Card identifier (FK to cards.id).
   */
  @Column({ name: 'card_id', type: 'uuid' })
  cardId: string;

  /**
   * Period type for aggregation (e.g., DAILY, WEEKLY).
   */
  @Column({ name: 'period_type', type: 'text' })
  periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';

  /**
   * Start of the usage bucket interval (inclusive).
   */
  @Column({ name: 'bucket_start', type: 'timestamptz' })
  bucketStart: Date;

  /**
   * End of the usage bucket interval (exclusive or inclusive by convention).
   */
  @Column({ name: 'bucket_end', type: 'timestamptz' })
  bucketEnd: Date;

  /**
   * Total spent in the bucket (minor currency units; string for bigint).
   */
  @Column({ name: 'spent_cents', type: 'bigint', default: 0 })
  spentCents: string;

  /**
   * Timestamp updated whenever the bucket aggregates change.
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

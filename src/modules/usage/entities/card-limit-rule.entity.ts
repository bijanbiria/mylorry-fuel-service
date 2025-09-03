import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Card } from '../../cards/entities/card.entity';

@Entity({ name: 'card_limit_rules' })
@Index(['cardId', 'periodType'])
/**
 * CardLimitRule entity mapping to `card_limit_rules`. Defines spending
 * limits for a card over configurable periods/windows.
 */
export class CardLimitRule {
  /**
   * Primary key for the limit rule (UUID).
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Card to which this limit applies. Cascade on card deletion.
   */
  @ManyToOne(() => Card, { onDelete: 'CASCADE' })
  card: Card;

  /**
   * Card identifier (FK to cards.id).
   */
  @Column({ name: 'card_id', type: 'uuid' })
  cardId: string;

  /**
   * Type of period over which the limit is evaluated.
   */
  @Column({ name: 'period_type', type: 'text' })
  periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';

  /**
   * Spending limit in minor currency units (string for bigint).
   */
  @Column({ name: 'limit_cents', type: 'bigint' })
  limitCents: string;

  /**
   * Window mode controlling how the period is computed.
   */
  @Column({ name: 'window_mode', type: 'text', default: 'CALENDAR' })
  windowMode: 'CALENDAR' | 'ANCHOR' | 'ROLLING';

  /**
   * Day of month used as anchor start (for ANCHOR mode).
   */
  @Column({ name: 'anchor_day_of_month', type: 'smallint', nullable: true })
  anchorDayOfMonth?: number | null;

  /**
   * Length in days for the anchored window (for ANCHOR mode).
   */
  @Column({ name: 'anchor_length_days', type: 'smallint', nullable: true })
  anchorLengthDays?: number | null;

  /**
   * Rolling window size in hours (for ROLLING mode).
   */
  @Column({ name: 'rolling_hours', type: 'int', nullable: true })
  rollingHours?: number | null;

  /**
   * Whether the rule is currently enforced.
   */
  @Column({ type: 'boolean', default: true })
  active: boolean;

  /**
   * Creation timestamp for the limit rule row.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

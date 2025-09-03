import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryColumn, JoinColumn } from 'typeorm';
import { Card } from '../../cards/entities/card.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Station } from '../../stations/entities/station.entity';

@Entity({ name: 'fuel_transactions' })
@Index(['cardId', 'occurredAt'])
@Index(['organizationId', 'occurredAt'])
@Index(['status', 'occurredAt'])
/**
 * FuelTransaction entity mapping to `fuel_transactions`. Captures card-based
 * fuel purchases with composite PK (id, occurred_at).
 */
export class FuelTransaction {
  /**
   * Transaction identifier (UUID). Part of a composite primary key.
   */
  @PrimaryColumn('uuid')
  id: string;

  /**
   * When the transaction occurred. Part of the composite primary key.
   */
  @PrimaryColumn({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;

  /**
   * Related card used for the transaction.
   */
  @ManyToOne(() => Card, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'card_id' })
  card: Card;

  /**
   * Identifier for the card (FK to cards.id).
   */
  @Column({ name: 'card_id', type: 'uuid' })
  cardId: string;

  /**
   * Organization that owns the card/transaction.
   */
  @ManyToOne(() => Organization, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  /**
   * Organization identifier (FK to organizations.id).
   */
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  /**
   * Station where the transaction occurred (nullable).
   */
  @ManyToOne(() => Station, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'station_id' })
  station: Station;

  /**
   * Station identifier (FK to stations.id, nullable).
   */
  @Column({ name: 'station_id', type: 'uuid', nullable: true })
  stationId?: string | null;

  /**
   * Optional external reference/id from the provider.
   */
  @Column({ name: 'external_ref', type: 'text', nullable: true })
  externalRef?: string | null;

  /**
   * Transaction amount in minor currency units (string for bigint).
   */
  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents: string;

  /**
   * ISO currency code of the transaction.
   */
  @Column({ type: 'text' })
  currency: string;

  /**
   * Processing status of the transaction.
   */
  @Column({ type: 'text' })
  status: 'approved' | 'rejected' | 'pending';

  /**
   * Reason for a declined transaction, when applicable.
   */
  @Column({ name: 'decline_reason', type: 'text', nullable: true })
  declineReason?: string | null;

  /**
   * Arbitrary metadata associated with the transaction.
   */
  @Column({ type: 'jsonb', default: {} })
  meta: any;

  /**
   * Creation timestamp for the transaction row.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

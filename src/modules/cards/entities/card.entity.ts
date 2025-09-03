import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity({ name: 'cards' })
@Index(['organizationId'])
@Index(['organizationId', 'cardNumberHash'], { unique: true })
/**
 * Card entity mapping to `cards` table. Represents a fuel/charge card
 * belonging to an organization, identified by a hash of the PAN.
 */
export class Card {
  /**
   * Primary key for the card (UUID).
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Owning organization relation. Deleting an organization cascades to its cards.
   */
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  /**
   * Owning organization identifier (FK to organizations.id).
   */
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  /**
   * Hash of the PAN/card number used for lookup and uniqueness within org.
   */
  @Column({ name: 'card_number_hash', type: 'text' })
  cardNumberHash: string;

  /**
   * Last 4 digits of the card number (non-sensitive display).
   */
  @Column({ type: 'text' })
  last4: string;

  /**
   * Operational status of the card.
   */
  @Column({ type: 'text', default: 'active' })
  status: 'active' | 'blocked';

  /**
   * Optional vehicle linkage for this card.
   */
  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId?: string | null;

  /**
   * Timestamp when the card record was created.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

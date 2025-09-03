import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Organization } from './organization.entity';

@Entity({ name: 'org_accounts' })
/**
 * OrgAccount entity mapping to `org_accounts`. Holds balance and
 * accounting state for an organization.
 */
export class OrgAccount {
  /**
   * Primary key for the organization account (UUID).
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Owning organization (1:1). Deleting org cascades to its account.
   */
  @OneToOne(() => Organization, (org) => org.account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  /**
   * Organization identifier (FK to organizations.id).
   */
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  /**
   * Available balance in minor currency units (stored as string for bigint).
   */
  @Column({ name: 'available_cents', type: 'bigint' })
  availableCents: string; // store as string

  /**
   * Optimistic concurrency/version column.
   */
  @Column({ type: 'bigint', default: 0 })
  version: string;

  /**
   * Creation timestamp for the account row.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

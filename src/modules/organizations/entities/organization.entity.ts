import { Column, CreateDateColumn, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { OrgAccount } from './org-account.entity';

@Entity({ name: 'organizations' })
/**
 * Organization entity mapping to `organizations`. Represents a customer
 * or account owner using the system.
 */
export class Organization {
  /**
   * Primary key for the organization (UUID).
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Display name of the organization.
   */
  @Column({ type: 'text' })
  name: string;

  /**
   * Current status of the organization.
   */
  @Column({ type: 'text', default: 'active' })
  status: 'active' | 'suspended';

  /**
   * ISO currency code used for the org's account/billing.
   */
  @Column({ type: 'text', default: 'USD' })
  currency: string;

  /**
   * Creation timestamp for the organization row.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Linked account entity (1:1) for balances and billing.
   */
  @OneToOne(() => OrgAccount, (acc) => acc.organization)
  account: OrgAccount;
}

import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'stations' })
@Unique(['code'])
/**
 * Station entity mapping to `stations`. Defines fueling locations with
 * a unique station code.
 */
export class Station {
  /**
   * Primary key for the station (UUID).
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Unique station code used for identification.
   */
  @Column({ type: 'text' })
  code: string;

  /**
   * Human-friendly station name.
   */
  @Column({ type: 'text' })
  name: string;

  /**
   * Creation timestamp for the station row.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

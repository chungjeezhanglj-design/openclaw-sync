import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('gps_location_cache')
export class GpsLocationCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'decimal', precision: 10, scale: 6, name: 'gpsLat' })
  gpsLat: number;

  @Index()
  @Column({ type: 'decimal', precision: 10, scale: 6, name: 'gpsLng' })
  gpsLng: number;

  @Column({ type: 'varchar', length: 500, name: 'locationName' })
  locationName: string;

  @Column({ type: 'json', nullable: true, name: 'addressComponents' })
  addressComponents: {
    province?: string;
    city?: string;
    district?: string;
    street?: string;
    detail?: string;
  };

  @Column({ type: 'int', default: 1, name: 'requestCount' })
  requestCount: number;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}

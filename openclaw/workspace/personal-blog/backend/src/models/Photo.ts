import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Post } from './Post';

@Entity('photos')
export class Photo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  postId: string | null;

  @ManyToOne(() => Post, (post) => post.photos)
  @JoinColumn({ name: 'postId' })
  post: Post;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'text', nullable: true })
  caption: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  aiTitle: string;

  @Column({ type: 'float', nullable: true })
  aiConfidence: number;

  @Column({ type: 'simple-json', nullable: true })
  aiTags: string[];

  @Column({ type: 'float', nullable: true })
  gpsLat: number;

  @Column({ type: 'float', nullable: true })
  gpsLng: number;

  @Column({ type: 'float', nullable: true, name: 'gps_altitude' })
  gpsAltitude: number;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'gps_latitude_ref' })
  gpsLatitudeRef: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'gps_longitude_ref' })
  gpsLongitudeRef: string;

  @Column({ type: 'varchar', length: 255, name: 'location_name', nullable: true })
  locationName: string | null;

  @Column({ type: 'varchar', length: 255, name: 'device_name', nullable: true })
  deviceName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'device_make' })
  deviceMake: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'device_model' })
  deviceModel: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  software: string;

  @Column({ type: 'int', nullable: true, name: 'image_width' })
  imageWidth: number;

  @Column({ type: 'int', nullable: true, name: 'image_height' })
  imageHeight: number;

  @Column({ type: 'int', nullable: true })
  orientation: number;

  @Column({ type: 'datetime', nullable: true })
  takenAt: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'exposure_time' })
  exposureTime: string;

  @Column({ type: 'float', nullable: true, name: 'f_number' })
  fNumber: number;

  @Column({ type: 'int', nullable: true, name: 'iso_speed' })
  isoSpeed: number;

  @Column({ type: 'float', nullable: true, name: 'focal_length' })
  focalLength: number;

  @Column({ type: 'int', nullable: true, name: 'focal_length_35mm' })
  focalLength35mm: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  flash: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'white_balance' })
  whiteBalance: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'metering_mode' })
  meteringMode: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'exposure_mode' })
  exposureMode: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'lens_model' })
  lensModel: string;

  @Column({ type: 'text', nullable: true, name: 'exif_data' })
  exifData: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';
import { Post } from './Post';

@Entity('user_behavior_logs')
export class UserBehaviorLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 用户标识
  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  sessionId: string;

  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true })
  deviceId: string;

  // 行为类型
  @Index()
  @Column({
    type: 'varchar',
    length: 20,
  })
  eventType: 'page_view' | 'article_view' | 'scroll' | 'click' | 'resize';

  // 页面信息
  @Column({ type: 'varchar', length: 2048 })
  pageUrl: string;

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  pageType: string;

  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true })
  articleId: string;

  // 行为数据
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  scrollDepth: number;

  @Column({ type: 'int', nullable: true })
  scrollCount: number;

  @Column({ type: 'int', nullable: true })
  stayDuration: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  clickTarget: string;

  // 设备信息
  @Column({ type: 'varchar', length: 50 })
  ip: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ipv4: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ipv6: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  screenResolution: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  viewportSize: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  locationName: string;

  // GPS 坐标（用于精确位置）
  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  gpsLat: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  gpsLng: number;

  // 来源信息
  @Column({ type: 'varchar', length: 2048, nullable: true })
  referrer: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;
}

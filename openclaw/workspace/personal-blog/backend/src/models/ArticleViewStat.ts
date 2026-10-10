import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('article_view_stats')
@Unique(['articleId', 'date'])
export class ArticleViewStat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  articleId: string;

  // 每日统计
  @Index()
  @Column({ type: 'date' })
  date: Date;

  // 浏览量
  @Column({ type: 'int', default: 0 })
  totalViews: number;

  @Column({ type: 'int', default: 0 })
  uniqueViews: number;

  // 行为指标
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  avgStayDuration: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  avgScrollDepth: number;

  // 用户类型
  @Column({ type: 'int', default: 0 })
  loggedInView: number;

  @Column({ type: 'int', default: 0 })
  guestView: number;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}

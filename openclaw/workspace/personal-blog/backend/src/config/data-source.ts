import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../models/User';
import { Post } from '../models/Post';
import { Photo } from '../models/Photo';
import { Tag } from '../models/Tag';
import { Comment } from '../models/Comment';
import { Like } from '../models/Like';
import { AiPromptPreset } from '../models/AiPromptPreset';
import { Follow } from '../models/Follow';
import { OperationLog } from '../models/OperationLog';
import { UserBehaviorLog } from '../models/UserBehaviorLog';
import { ArticleViewStat } from '../models/ArticleViewStat';
import { GpsLocationCache } from '../models/GpsLocationCache';

// 显式 import migration 类 — 避免 glob ['src/migrations/*.ts']
// 在编译后路径不可用 + TypeORM 0.3.x 在 Node 26 下走 ESM/CJS dual load 时丢 MigrationInterface
import { AddFollowsTable1772104606548 } from '../migrations/1772104606548-add-follows-table';
import { CreateLogsTables1772198000000 } from '../migrations/1772198000000-CreateLogsTables';
import { AddLocationNameToBehaviorLog1772200000000 } from '../migrations/1772200000000-AddLocationNameToBehaviorLog';
import { CreateGpsLocationCache1772260000000 } from '../migrations/1772260000000-CreateGpsLocationCache';

config();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'personal_blog',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Post, Photo, Tag, Comment, Like, AiPromptPreset, Follow, OperationLog, UserBehaviorLog, ArticleViewStat, GpsLocationCache],
  migrations: [
    AddFollowsTable1772104606548,
    CreateLogsTables1772198000000,
    AddLocationNameToBehaviorLog1772200000000,
    CreateGpsLocationCache1772260000000,
  ],
  // 手动运行迁移: cd backend && npm run migration:run
  // ⚠️ 不启用 migrationsRun: true — 当 migrations 表为空但表已存在时会报错
  //       重复执行迁移会报 Table 'xxx' already exists
  //       生产部署后手动验证 + 跑迁移更可控
  migrationsRun: false,
  subscribers: [],
});

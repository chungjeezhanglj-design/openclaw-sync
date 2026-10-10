import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || '192.168.1.141',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER || 'zhanglj',
  password: process.env.DB_PASSWORD || '19781206aB*#',
  database: process.env.DB_NAME || 'personal_blog',
});

async function addAiTitleColumn() {
  try {
    await dataSource.initialize();
    console.log('数据库连接成功');

    await dataSource.query('ALTER TABLE photos ADD COLUMN aiTitle VARCHAR(100) NULL');
    console.log('✓ aiTitle 字段已添加');

    await dataSource.destroy();
    console.log('完成');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('aiTitle 字段已存在');
    } else {
      console.error('错误:', error.message);
    }
    process.exit(1);
  }
}

addAiTitleColumn();

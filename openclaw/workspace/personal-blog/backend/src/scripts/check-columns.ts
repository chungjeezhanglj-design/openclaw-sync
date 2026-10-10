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

async function checkColumns() {
  try {
    await dataSource.initialize();
    console.log('数据库连接成功');

    const result = await dataSource.query('DESCRIBE photos');
    console.log('\n=== photos 表字段 ===');
    console.log(JSON.stringify(result, null, 2));

    await dataSource.destroy();
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

checkColumns();

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

async function deleteOrphanedPhotos() {
  try {
    await dataSource.initialize();
    console.log('Database connected');

    const result = await dataSource.query('DELETE FROM photos WHERE postId IS NULL OR postId = ""');
    console.log(`Deleted ${result.affectedRows} orphaned photos`);

    await dataSource.destroy();
    console.log('Done');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteOrphanedPhotos();

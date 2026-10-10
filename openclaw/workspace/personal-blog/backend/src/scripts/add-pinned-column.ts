import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'personal_blog',
});

async function addPinnedColumn() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    await AppDataSource.query('ALTER TABLE `comments` ADD COLUMN `pinned` BOOLEAN DEFAULT FALSE AFTER `content`');
    console.log('Added pinned column to comments table');

    await AppDataSource.destroy();
    console.log('Done');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addPinnedColumn();

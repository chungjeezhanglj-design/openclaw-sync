import { DataSource } from 'typeorm';
import 'dotenv/config';

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'personal_blog',
});

async function migrate() {
  await dataSource.initialize();
  console.log('Adding location_name and device_name columns to photos table...');
  
  try {
    await dataSource.query(`
      ALTER TABLE photos 
      ADD COLUMN location_name VARCHAR(255) NULL,
      ADD COLUMN device_name VARCHAR(255) NULL
    `);
    console.log('Migration completed successfully!');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Columns already exist, skipping...');
    } else {
      console.error('Migration failed:', error.message);
    }
  }
  
  await dataSource.destroy();
  process.exit(0);
}

migrate();

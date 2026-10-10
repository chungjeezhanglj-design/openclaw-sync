import { AppDataSource } from '../config/data-source';

async function createDatabase() {
  try {
    const connection = await AppDataSource.initialize();
    console.log('Database tables created successfully');
    await connection.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error creating database:', error);
    process.exit(1);
  }
}

createDatabase();

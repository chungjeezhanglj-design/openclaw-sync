import 'reflect-metadata';
import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '192.168.1.141',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'zhanglj',
    password: process.env.DB_PASSWORD || '19781206aB*#',
    database: process.env.DB_NAME || 'personal_blog',
  });

  console.log('Connected to database');

  // Create ai_prompt_presets table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS ai_prompt_presets (
      id CHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      prompt TEXT NOT NULL,
      user_id CHAR(36) NOT NULL,
      is_default BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('Created ai_prompt_presets table');

  // Add columns to users table if they don't exist
  const [columns] = await connection.execute('SHOW COLUMNS FROM users');
  const columnNames = (columns as any[]).map((c) => c.Field);

  const columnsToAdd = [
    { name: 'ollama_base_url', type: 'VARCHAR(255)', after: 'avatar' },
    { name: 'ollama_model', type: 'VARCHAR(100)', after: 'ollama_base_url' },
    { name: 'custom_api_url', type: 'VARCHAR(255)', after: 'ollama_model' },
    { name: 'custom_api_model', type: 'VARCHAR(100)', after: 'custom_api_url' },
    { name: 'ai_provider', type: 'VARCHAR(100) DEFAULT "ollama"', after: 'custom_api_model' },
    { name: 'ai_prompt_preset_id', type: 'CHAR(36)', after: 'ai_provider' },
  ];

  for (const col of columnsToAdd) {
    if (!columnNames.includes(col.name)) {
      await connection.execute(
        `ALTER TABLE users ADD COLUMN ${col.name} ${col.type} ${col.name === 'ai_provider' ? '' : 'NULL'} AFTER ${col.after}`
      );
      console.log(`Added column ${col.name}`);
    } else {
      console.log(`Column ${col.name} already exists`);
    }
  }

  await connection.end();
  console.log('Done!');
}

main().catch(console.error);

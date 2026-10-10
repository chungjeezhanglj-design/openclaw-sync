import 'reflect-metadata'
import { AppDataSource } from './src/config/data-source'

async function main() {
  await AppDataSource.initialize()
  
  try {
    await AppDataSource.query(
      "ALTER TABLE posts ADD COLUMN visibility ENUM('public', 'friends', 'followers', 'private') NOT NULL DEFAULT 'public'"
    )
    console.log('Migration completed: added visibility column')
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists')
    } else {
      throw error
    }
  }
  
  await AppDataSource.destroy()
}

main()

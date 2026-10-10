import 'dotenv/config';
import { AppDataSource } from '../config/data-source';
import { Photo } from '../models/Photo';
import { config } from 'dotenv';

config();

async function migrate() {
  console.log('=== 添加 EXIF 字段到数据库 ===\n');

  try {
    await AppDataSource.initialize();
    console.log('数据库连接成功');

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    const columns = [
      { name: 'gps_altitude', type: 'float', nullable: true },
      { name: 'gps_latitude_ref', type: 'varchar', length: 50, nullable: true },
      { name: 'gps_longitude_ref', type: 'varchar', length: 50, nullable: true },
      { name: 'device_make', type: 'varchar', length: 255, nullable: true },
      { name: 'device_model', type: 'varchar', length: 255, nullable: true },
      { name: 'software', type: 'varchar', length: 255, nullable: true },
      { name: 'image_width', type: 'int', nullable: true },
      { name: 'image_height', type: 'int', nullable: true },
      { name: 'orientation', type: 'int', nullable: true },
      { name: 'exposure_time', type: 'varchar', length: 50, nullable: true },
      { name: 'f_number', type: 'float', nullable: true },
      { name: 'iso_speed', type: 'int', nullable: true },
      { name: 'focal_length', type: 'float', nullable: true },
      { name: 'focal_length_35mm', type: 'int', nullable: true },
      { name: 'flash', type: 'varchar', length: 50, nullable: true },
      { name: 'white_balance', type: 'varchar', length: 50, nullable: true },
      { name: 'metering_mode', type: 'varchar', length: 50, nullable: true },
      { name: 'exposure_mode', type: 'varchar', length: 50, nullable: true },
      { name: 'lens_model', type: 'varchar', length: 100, nullable: true },
    ];

    for (const col of columns) {
      try {
        await queryRunner.query(`
          ALTER TABLE photos ADD COLUMN ${col.name} ${col.type}${col.length ? `(${col.length})` : ''} ${col.nullable ? 'NULL' : 'NOT NULL'}
        `);
        console.log(`✓ 添加列: ${col.name}`);
      } catch (error: any) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`- 列已存在: ${col.name}`);
        } else {
          console.log(`✗ 添加列失败: ${col.name} - ${error.message}`);
        }
      }
    }

    await queryRunner.release();
    console.log('\n迁移完成！');
    await AppDataSource.destroy();
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

migrate();

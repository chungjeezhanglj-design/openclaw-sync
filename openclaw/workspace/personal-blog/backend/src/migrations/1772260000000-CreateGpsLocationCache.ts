// import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";
import { Table, TableIndex } from 'typeorm';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGpsLocationCache1772260000000  {
    public async up(queryRunner: any): Promise<void> {
        await queryRunner.createTable(new (Table as any)({
            name: 'gps_location_cache',
            columns: [
                {
                    name: 'id',
                    type: 'varchar',
                    length: '36',
                    isPrimary: true,
                },
                {
                    name: 'gpsLat',
                    type: 'decimal',
                    precision: 10,
                    scale: 6,
                },
                {
                    name: 'gpsLng',
                    type: 'decimal',
                    precision: 10,
                    scale: 6,
                },
                {
                    name: 'locationName',
                    type: 'varchar',
                    length: '500',
                },
                {
                    name: 'addressComponents',
                    type: 'json',
                    isNullable: true,
                },
                {
                    name: 'requestCount',
                    type: 'int',
                    default: 1,
                },
                {
                    name: 'createdAt',
                    type: 'datetime',
                    default: 'CURRENT_TIMESTAMP',
                },
                {
                    name: 'updatedAt',
                    type: 'datetime',
                    default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
                },
            ],
        }), true);

        // 创建索引
        await queryRunner.createIndex('gps_location_cache', new (TableIndex as any)({
            name: 'idx_lat_lng',
            columnNames: ['gpsLat', 'gpsLng'],
        }));

        await queryRunner.createIndex('gps_location_cache', new (TableIndex as any)({
            name: 'idx_location_name',
            columnNames: ['locationName'],
        }));
    }

    public async down(queryRunner: any): Promise<void> {
        await queryRunner.dropTable('gps_location_cache');
    }
}

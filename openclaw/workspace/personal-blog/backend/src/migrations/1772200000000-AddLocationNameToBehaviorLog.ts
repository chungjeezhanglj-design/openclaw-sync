// import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";
import { TableColumn } from 'typeorm';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLocationNameToBehaviorLog1772200000000  {
    public async up(queryRunner: any): Promise<void> {
        // 检查字段是否已存在
        const table = await queryRunner.getTable('user_behavior_logs');
        const column = table?.findColumnByName('locationName');
        
        if (!column) {
            await queryRunner.addColumn('user_behavior_logs', new (TableColumn as any)({
                name: 'locationName',
                type: 'varchar',
                length: '255',
                isNullable: true,
                comment: '位置名称（城市/地区）'
            }));
        }
    }

    public async down(queryRunner: any): Promise<void> {
        const table = await queryRunner.getTable('user_behavior_logs');
        const column = table?.findColumnByName('locationName');
        
        if (column) {
            await queryRunner.dropColumn('user_behavior_logs', 'locationName');
        }
    }
}

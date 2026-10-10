// import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from "typeorm";
import { Table, TableIndex, TableForeignKey } from 'typeorm';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLogsTables1772198000000  {
    public async up(queryRunner: any): Promise<void> {
        // 创建操作日志表
        await queryRunner.createTable(new (Table as any)({
            name: 'operation_logs',
            columns: [
                {
                    name: 'id',
                    type: 'varchar',
                    length: '36',
                    isPrimary: true,
                },
                {
                    name: 'userId',
                    type: 'varchar',
                    length: '36',
                    isNullable: true,
                },
                {
                    name: 'action',
                    type: 'varchar',
                    length: '100',
                },
                {
                    name: 'module',
                    type: 'varchar',
                    length: '50',
                },
                {
                    name: 'ip',
                    type: 'varchar',
                    length: '50',
                },
                {
                    name: 'userAgent',
                    type: 'varchar',
                    length: '500',
                    isNullable: true,
                },
                {
                    name: 'status',
                    type: 'varchar',
                    length: '20',
                },
                {
                    name: 'message',
                    type: 'text',
                },
                {
                    name: 'metadata',
                    type: 'json',
                    isNullable: true,
                },
                {
                    name: 'createdAt',
                    type: 'datetime',
                    default: 'CURRENT_TIMESTAMP',
                },
            ],
        }), true);

        // 创建用户行为日志表
        await queryRunner.createTable(new (Table as any)({
            name: 'user_behavior_logs',
            columns: [
                {
                    name: 'id',
                    type: 'varchar',
                    length: '36',
                    isPrimary: true,
                },
                {
                    name: 'userId',
                    type: 'varchar',
                    length: '36',
                    isNullable: true,
                },
                {
                    name: 'sessionId',
                    type: 'varchar',
                    length: '36',
                },
                {
                    name: 'deviceId',
                    type: 'varchar',
                    length: '36',
                    isNullable: true,
                },
                {
                    name: 'eventType',
                    type: 'varchar',
                    length: '20',
                },
                {
                    name: 'pageUrl',
                    type: 'varchar',
                    length: '2048',
                },
                {
                    name: 'pageType',
                    type: 'varchar',
                    length: '50',
                    isNullable: true,
                },
                {
                    name: 'articleId',
                    type: 'varchar',
                    length: '36',
                    isNullable: true,
                },
                {
                    name: 'scrollDepth',
                    type: 'decimal',
                    precision: 5,
                    scale: 2,
                    isNullable: true,
                },
                {
                    name: 'scrollCount',
                    type: 'int',
                    isNullable: true,
                },
                {
                    name: 'stayDuration',
                    type: 'int',
                    isNullable: true,
                },
                {
                    name: 'clickTarget',
                    type: 'varchar',
                    length: '500',
                    isNullable: true,
                },
                {
                    name: 'ip',
                    type: 'varchar',
                    length: '50',
                },
                {
                    name: 'userAgent',
                    type: 'varchar',
                    length: '500',
                    isNullable: true,
                },
                {
                    name: 'screenResolution',
                    type: 'varchar',
                    length: '20',
                    isNullable: true,
                },
                {
                    name: 'viewportSize',
                    type: 'varchar',
                    length: '20',
                    isNullable: true,
                },
                {
                    name: 'referrer',
                    type: 'varchar',
                    length: '2048',
                    isNullable: true,
                },
                {
                    name: 'createdAt',
                    type: 'datetime',
                    default: 'CURRENT_TIMESTAMP',
                },
            ],
        }), true);

        // 创建文章浏览统计表
        await queryRunner.createTable(new (Table as any)({
            name: 'article_view_stats',
            columns: [
                {
                    name: 'id',
                    type: 'varchar',
                    length: '36',
                    isPrimary: true,
                },
                {
                    name: 'articleId',
                    type: 'varchar',
                    length: '36',
                },
                {
                    name: 'date',
                    type: 'date',
                },
                {
                    name: 'totalViews',
                    type: 'int',
                    default: 0,
                },
                {
                    name: 'uniqueViews',
                    type: 'int',
                    default: 0,
                },
                {
                    name: 'avgStayDuration',
                    type: 'decimal',
                    precision: 10,
                    scale: 2,
                    default: 0,
                },
                {
                    name: 'avgScrollDepth',
                    type: 'decimal',
                    precision: 5,
                    scale: 2,
                    default: 0,
                },
                {
                    name: 'loggedInView',
                    type: 'int',
                    default: 0,
                },
                {
                    name: 'guestView',
                    type: 'int',
                    default: 0,
                },
                {
                    name: 'createdAt',
                    type: 'datetime',
                    default: 'CURRENT_TIMESTAMP',
                },
                {
                    name: 'updatedAt',
                    type: 'datetime',
                    default: 'CURRENT_TIMESTAMP',
                    onUpdate: 'CURRENT_TIMESTAMP',
                },
            ],
        }), true);

        // 创建索引
        await queryRunner.createIndex('operation_logs', new (TableIndex as any)({
            name: 'idx_operation_userId',
            columnNames: ['userId'],
        }));
        await queryRunner.createIndex('operation_logs', new (TableIndex as any)({
            name: 'idx_operation_action',
            columnNames: ['action'],
        }));
        await queryRunner.createIndex('operation_logs', new (TableIndex as any)({
            name: 'idx_operation_module',
            columnNames: ['module'],
        }));
        await queryRunner.createIndex('operation_logs', new (TableIndex as any)({
            name: 'idx_operation_status',
            columnNames: ['status'],
        }));
        await queryRunner.createIndex('operation_logs', new (TableIndex as any)({
            name: 'idx_operation_createdAt',
            columnNames: ['createdAt'],
        }));

        await queryRunner.createIndex('user_behavior_logs', new (TableIndex as any)({
            name: 'idx_behavior_userId',
            columnNames: ['userId'],
        }));
        await queryRunner.createIndex('user_behavior_logs', new (TableIndex as any)({
            name: 'idx_behavior_sessionId',
            columnNames: ['sessionId'],
        }));
        await queryRunner.createIndex('user_behavior_logs', new (TableIndex as any)({
            name: 'idx_behavior_deviceId',
            columnNames: ['deviceId'],
        }));
        await queryRunner.createIndex('user_behavior_logs', new (TableIndex as any)({
            name: 'idx_behavior_eventType',
            columnNames: ['eventType'],
        }));
        await queryRunner.createIndex('user_behavior_logs', new (TableIndex as any)({
            name: 'idx_behavior_pageType',
            columnNames: ['pageType'],
        }));
        await queryRunner.createIndex('user_behavior_logs', new (TableIndex as any)({
            name: 'idx_behavior_articleId',
            columnNames: ['articleId'],
        }));
        await queryRunner.createIndex('user_behavior_logs', new (TableIndex as any)({
            name: 'idx_behavior_createdAt',
            columnNames: ['createdAt'],
        }));

        await queryRunner.createIndex('article_view_stats', new (TableIndex as any)({
            name: 'idx_stats_articleId',
            columnNames: ['articleId'],
        }));
        await queryRunner.createIndex('article_view_stats', new (TableIndex as any)({
            name: 'idx_stats_date',
            columnNames: ['date'],
        }));

        // 创建唯一约束
        await queryRunner.query(`
            ALTER TABLE article_view_stats 
            ADD UNIQUE INDEX idx_unique_article_date (articleId, date)
        `);

        // 添加外键
        await queryRunner.createForeignKey('operation_logs', new (TableForeignKey as any)({
            columnNames: ['userId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'SET NULL',
        }));

        await queryRunner.createForeignKey('user_behavior_logs', new (TableForeignKey as any)({
            columnNames: ['userId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'SET NULL',
        }));

        await queryRunner.createForeignKey('user_behavior_logs', new (TableForeignKey as any)({
            columnNames: ['articleId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'posts',
            onDelete: 'SET NULL',
        }));

        await queryRunner.createForeignKey('article_view_stats', new (TableForeignKey as any)({
            columnNames: ['articleId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'posts',
            onDelete: 'CASCADE',
        }));
    }

    public async down(queryRunner: any): Promise<void> {
        await queryRunner.dropTable('article_view_stats');
        await queryRunner.dropTable('user_behavior_logs');
        await queryRunner.dropTable('operation_logs');
    }
}

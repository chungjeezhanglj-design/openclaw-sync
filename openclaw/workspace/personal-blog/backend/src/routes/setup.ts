import { Router } from 'express';
import { DataSource } from 'typeorm';
import { User } from '../models/User';
import { Post } from '../models/Post';
import { Photo } from '../models/Photo';
import { Tag } from '../models/Tag';
import { Comment } from '../models/Comment';
import { Like } from '../models/Like';
import { adminConfig, markSetupComplete, updateEnvConfig } from '../config/app-config';

const router = Router();

interface SetupRequest {
  dbHost: string;
  dbPort: number;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  adminEmail: string;
  adminPassword: string;
  nickname: string;
}

// 测试数据库连接
router.post('/test-connection', async (req, res) => {
  const { dbHost, dbPort, dbUser, dbPassword, dbName } = req.body;

  const testDataSource = new DataSource({
    type: 'mysql',
    host: dbHost,
    port: dbPort,
    username: dbUser,
    password: dbPassword,
    database: dbName,
    synchronize: false,
    logging: false,
    entities: [User, Post, Photo, Tag, Comment, Like],
  });

  try {
    await testDataSource.initialize();
    const tables = await testDataSource.query('SHOW TABLES');
    const tableCount = tables.length;
    const hasData = tableCount > 0;
    await testDataSource.destroy();
    res.json({ 
      status: 'success', 
      message: '连接成功',
      data: { exists: hasData, tableCount }
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || '连接失败',
    });
  }
});

// 连接现有数据库（不删除数据）
router.post('/connect', async (req, res) => {
  const { dbHost, dbPort, dbUser, dbPassword, dbName, adminEmail, adminPassword, nickname } = req.body as SetupRequest;

  // 验证可以连接
  const testDataSource = new DataSource({
    type: 'mysql',
    host: dbHost,
    port: dbPort,
    username: dbUser,
    password: dbPassword,
    database: dbName,
    synchronize: false,
    logging: false,
    entities: [User, Post, Photo, Tag, Comment, Like],
  });

  try {
    await testDataSource.initialize();
    const tables = await testDataSource.query('SHOW TABLES');
    
    if (tables.length === 0) {
      throw new Error('数据库为空，请选择"删除并初始化"');
    }

    await testDataSource.destroy();

    // 更新配置文件
    updateEnvConfig({
      DB_HOST: dbHost,
      DB_PORT: dbPort.toString(),
      DB_USERNAME: dbUser,
      DB_PASSWORD: dbPassword,
      DB_DATABASE: dbName,
    });

    // 标记设置完成
    markSetupComplete();

    res.json({
      status: 'success',
      message: '连接成功',
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || '连接失败',
    });
  }
});

// 初始化数据库
router.post('/init', async (req, res) => {
  const {
    dbHost,
    dbPort,
    dbUser,
    dbPassword,
    dbName,
    adminEmail,
    adminPassword,
    nickname,
  } = req.body as SetupRequest;

  // 更新环境变量
  process.env.DB_HOST = dbHost;
  process.env.DB_PORT = dbPort.toString();
  process.env.DB_USERNAME = dbUser;
  process.env.DB_PASSWORD = dbPassword;
  process.env.DB_DATABASE = dbName;

  // 更新管理员配置
  if (adminEmail) process.env.ADMIN_EMAIL = adminEmail;
  if (adminPassword) process.env.ADMIN_PASSWORD = adminPassword;

  const initDataSource = new DataSource({
    type: 'mysql',
    host: dbHost,
    port: dbPort,
    username: dbUser,
    password: dbPassword,
    database: dbName,
    synchronize: true,
    logging: true,
    entities: [User, Post, Photo, Tag, Comment, Like],
  });

  try {
    // 先连接到 MySQL 服务器（不指定数据库）
    const tempDataSource = new DataSource({
      type: 'mysql',
      host: dbHost,
      port: dbPort,
      username: dbUser,
      password: dbPassword,
      synchronize: false,
      logging: false,
    });
    await tempDataSource.initialize();
    
    // 删除旧数据库并重新创建
    await tempDataSource.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await tempDataSource.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await tempDataSource.destroy();

    // 初始化表
    await initDataSource.initialize();
    
    // 同步创建表（忽略重复键错误）
    try {
      await initDataSource.synchronize();
      console.log('Database tables created successfully');
    } catch (syncError: any) {
      if (syncError.message.includes('Duplicate key')) {
        console.log('Some tables already exist, continuing...');
      } else {
        throw syncError;
      }
    }

    // 创建超级管理员用户
    const userRepo = initDataSource.getRepository(User);
    const existingAdmin = await userRepo.findOne({ where: { email: adminEmail } });
    
    if (!existingAdmin) {
      try {
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        const adminUser = userRepo.create({
          email: adminEmail,
          password: hashedPassword,
          nickname: nickname || '管理员',
          role: 'admin',
        });
        await userRepo.save(adminUser);
        console.log('Admin user created');
      } catch (userError: any) {
        if (userError.message.includes('Duplicate entry')) {
          console.log('Admin user already exists');
        } else {
          throw userError;
        }
      }
    } else {
      console.log('Admin user already exists');
    }

    await initDataSource.destroy();

    // 更新配置文件
    updateEnvConfig({
      DB_HOST: dbHost,
      DB_PORT: dbPort.toString(),
      DB_USERNAME: dbUser,
      DB_PASSWORD: dbPassword,
      DB_DATABASE: dbName,
      ADMIN_EMAIL: adminEmail,
      ADMIN_PASSWORD: adminPassword,
    });

    // 标记设置完成
    markSetupComplete();

    res.json({
      status: 'success',
      message: '初始化成功',
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || '初始化失败',
    });
  }
});

// 获取管理员配置（用于初始化页面显示）
router.get('/config', (req, res) => {
  res.json({
    status: 'success',
    data: {
      adminEmail: adminConfig.email,
      dbHost: process.env.DB_HOST || '',
      dbPort: parseInt(process.env.DB_PORT || '3306'),
      dbUser: process.env.DB_USERNAME || '',
      dbName: process.env.DB_DATABASE || '',
    },
  });
});

export default router;

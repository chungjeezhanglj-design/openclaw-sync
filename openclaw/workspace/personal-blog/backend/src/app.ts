import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { AppDataSource } from './config/data-source';
import { adminConfig, isConfigured, isSetupComplete, validateProductionEnv } from './config/app-config';
import { errorHandler } from './middlewares/errorHandler';
import { authRouter } from './routes/auth';
import { postsRouter } from './routes/posts';
import { photosRouter } from './routes/photos';
import { tagsRouter } from './routes/tags';
import { commentsRouter } from './routes/comments';
import aiPromptPresetsRouter from './routes/aiPromptPresets';
import usersRouter from './routes/users';
import setupRouter from './routes/setup';
import searchRouter from './routes/search';
import followsRouter from './routes/follows';
import logsRouter from './routes/logs';
import behaviorConfigRouter from './routes/behaviorConfig';
import monitoringRouter from './routes/monitoring';
import { User } from './models/User';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// 启用反向代理支持（信任 X-Forwarded-For 头）
app.set('trust proxy', true);

// 中间件
const allowedOrigins = [
  'http://localhost:1177',
  'http://127.0.0.1:1177',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://chungjee.cc.cd',
  'http://chungjee.cc.cd',
  'http://chungjee.cc.cd:1177',
  'http://chungjee.familyds.org:8888',
  'http://192.168.1.141:3000',
  'http://192.168.1.141:8888',
  'http://192.168.1.102:1177',
  'http://192.168.1.102:3000',
];

// 检查是否为允许的局域网 IP
const isAllowedLanIp = (origin: string | undefined) => {
  if (!origin) return false;
  return origin.match(/^http:\/\/192\.168\.\d+\.\d+:\d+$/) !== null;
};

const isProduction = process.env.NODE_ENV === 'production';

app.use(cors({
  origin: function (origin, callback) {
    // 开发环境允许所有
    if (!isProduction) {
      callback(null, true);
      return;
    }
    // 允许局域网 IP 访问
    if (isAllowedLanIp(origin)) {
      callback(null, true);
      return;
    }
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Liveness probe (k8s 标准) — 仅检查进程存活, 不查 DB
// 用于 k8s livenessProbe / Docker HEALTHCHECK / 外部 ping
// 即使 DB 挂掉, 只要 Node 进程还活着就返回 200
app.get('/health/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe (k8s 标准) — 检查是否能服务请求
// 用于 k8s readinessProbe / 负载均衡器健康检查 / 部署门禁
// 任何关键依赖 (DB) 不可用都返回 503
app.get('/health/ready', async (req, res) => {
  const checks = {
    dbConfigured: false,
    dbConnected: false,
    dbReachable: false,
    setupComplete: false,
  };

  try {
    checks.dbConfigured = isConfigured();
    if (checks.dbConfigured && AppDataSource.isInitialized) {
      checks.dbConnected = true;
      // 实际查询一次 DB, 确认连接可用 (而不是只看 isInitialized 标志)
      const userRepo = AppDataSource.getRepository(User);
      await userRepo.query('SELECT 1');
      checks.dbReachable = true;
      checks.setupComplete = isSetupComplete();
    }
  } catch (error) {
    return res.status(503).json({
      status: 'not_ready',
      checks,
      error: error instanceof Error ? error.message : 'unknown',
      timestamp: new Date().toISOString(),
    });
  }

  const ready =
    checks.dbConfigured && checks.dbConnected && checks.dbReachable && checks.setupComplete;

  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});

// 系统状态检查
app.get('/api/system/status', async (req, res) => {
  const dbConfigured = isConfigured();
  const setupComplete = isSetupComplete();
  let dbConnected = false;
  let dbInitialized = false;
  let hasUsers = false;

  if (dbConfigured && AppDataSource.isInitialized) {
    dbConnected = true;
    try {
      const userRepo = AppDataSource.getRepository(User);
      const count = await userRepo.count();
      hasUsers = count > 0;
      dbInitialized = true;
    } catch (error) {
      console.error('Error checking database:', error);
    }
  }

  res.json({
    status: 'success',
    data: {
      dbConfigured,
      dbConnected,
      dbInitialized,
      hasUsers,
      setupComplete,
      adminEmail: adminConfig.email,
    },
  });
});

// 初始化路由（无需数据库）
app.use('/api/setup', setupRouter);

// API路由（需要数据库）
app.use('/api/auth', authRouter);
app.use('/api/posts', postsRouter);
app.use('/api/photos', photosRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/ai-prompts', aiPromptPresetsRouter);
app.use('/api/search', searchRouter);
app.use('/api/logs', logsRouter);
app.use('/api/users', usersRouter);
app.use('/api', followsRouter);
app.use('/api/behavior', behaviorConfigRouter);
app.use('/api/monitoring', monitoringRouter);

// 错误处理
app.use(errorHandler);

// 根据数据库配置决定启动方式
const startServer = async () => {
  // 生产环境强制校验必填 env (未设或为占位符直接拒绝启动)
  validateProductionEnv();

  if (!isConfigured()) {
    console.log('Database not configured, starting in setup mode...');
    app.listen(PORT, '::', () => {
      console.log(`Server is running on port ${PORT} (setup mode)`);
    });
    return;
  }

  try {
    await AppDataSource.initialize();
    console.log('Database connected successfully');
    app.listen(PORT, '::', () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Database connection failed:', error);
    console.log('Starting server in setup mode...');
    app.listen(PORT, '::', () => {
      console.log(`Server is running on port ${PORT} (setup mode - database error)`);
    });
  }
};

// 仅在直接运行时启动 server (导入时不启动, 避免测试时端口冲突)
if (require.main === module || process.env.NODE_ENV !== 'test') {
  startServer();
}

// 导出 app 以便测试 (supertest 需要一个 app 实例, 不需要监听端口)
export { app };

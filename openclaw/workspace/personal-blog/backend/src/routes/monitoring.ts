import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { isAdmin } from '../middlewares/authorize';
import { getIPStatsHandler, clearCacheHandler } from '../controllers/monitoring';

const router = Router();

// 监控接口（需要管理员权限）
router.get('/ip-stats', authenticate, isAdmin, getIPStatsHandler);

// 清除缓存（需要管理员权限）
router.post('/clear-cache', authenticate, isAdmin, clearCacheHandler);

export default router;

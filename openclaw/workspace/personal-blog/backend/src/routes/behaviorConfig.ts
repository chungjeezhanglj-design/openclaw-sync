import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { isAdmin } from '../middlewares/authorize';
import {
  getBehaviorConfig,
  updateBehaviorConfig,
  batchUpdateBehaviorConfig,
  getClientConfig,
} from '../controllers/behaviorConfig';
import { recordOperationLog } from '../middlewares/recordOperationLog';

const router = Router();

// 公开接口 - 客户端获取配置
router.get('/client-config', getClientConfig);

// 需要管理员权限
router.get('/config', authenticate, isAdmin, getBehaviorConfig);
router.put(
  '/config',
  authenticate,
  isAdmin,
  recordOperationLog({
    action: 'CONFIG_UPDATE',
    module: 'SYSTEM',
    getMessage: (req) => `更新配置：${req.body.configKey}`,
  }),
  updateBehaviorConfig
);
router.post(
  '/config/batch',
  authenticate,
  isAdmin,
  recordOperationLog({
    action: 'CONFIG_BATCH_UPDATE',
    module: 'SYSTEM',
  }),
  batchUpdateBehaviorConfig
);

export default router;

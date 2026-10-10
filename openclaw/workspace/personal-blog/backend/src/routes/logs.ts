import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { isAdmin } from '../middlewares/authorize';
import {
  trackBehavior,
  getArticleBehavior,
  getUserBehavior,
  getBehaviorStats,
  getOperationLogs,
  clearOldLogs,
  previewClearLogs,
  getClientIP,
  convertGPSAddresses,
} from '../controllers/logs';
import { logsStream, configStream } from '../controllers/logsStream';

const router = Router();

// 公开接口 - 行为上报
router.post('/track', trackBehavior);

// 公开接口 - 获取客户端 IP（供前端 SDK 使用）
router.get('/ip', (req, res) => {
  const ip = getClientIP(req);
  // 判断是 IPv4 还是 IPv6
  const ipv4 = ip.includes(':') ? null : ip;
  const ipv6 = ip.includes(':') ? ip : null;
  res.json({ ipv4, ipv6 });
});

// 需要认证 - 行为分析
router.get('/stats', authenticate, isAdmin, getBehaviorStats);
router.get('/article/:articleId', authenticate, isAdmin, getArticleBehavior);
router.get('/user/:userId', authenticate, isAdmin, getUserBehavior);

// 需要管理员 - 操作日志
router.get('/operations', authenticate, isAdmin, getOperationLogs);

// 需要管理员 - 预览清理日志
router.get('/clear/preview', authenticate, isAdmin, previewClearLogs);

// 需要管理员 - 清理日志
router.delete(
  '/clear',
  authenticate,
  isAdmin,
  clearOldLogs
);

// 需要管理员 - GPS 地址转换
router.post('/convert-gps', authenticate, isAdmin, convertGPSAddresses);

// SSE 配置推送 - 公开端点（无需认证）
router.get('/config/stream', configStream);

// SSE 实时推送 - 需要管理员（支持 URL 参数 token）
router.get('/stream', (req, res, next) => {
  // 从 URL 参数获取 token
  if (req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  authenticate(req, res, () => {
    isAdmin(req, res, () => {
      logsStream(req, res);
    });
  });
});

export default router;

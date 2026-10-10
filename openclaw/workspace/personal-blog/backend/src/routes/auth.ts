import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { register, login, logout, getWechatAuthUrl, wechatCallback, getProfile, updateProfile, updateSettings, getLikedPosts, getCommentedPosts, changePassword } from '../controllers/auth';
import { authenticate } from '../middlewares/auth';
import { recordOperationLog } from '../middlewares/recordOperationLog';

const router = Router();

// 登录速率限制：每分钟最多 20 次
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { status: 'error', message: '登录尝试过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 注册速率限制：每分钟最多 10 次
const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { status: 'error', message: '注册尝试过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 邮箱注册
router.post(
  '/register',
  registerLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('nickname').trim().isLength({ min: 2, max: 50 }),
  ],
  recordOperationLog({ 
    action: 'USER_REGISTER', 
    module: 'AUTH',
    getMessage: (req) => `用户注册：${req.body.email}`,
  }),
  register
);

// 邮箱登录
router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').exists(),
  ],
  recordOperationLog({ 
    action: 'USER_LOGIN', 
    module: 'AUTH',
    getMessage: (req, res) => {
      // 从响应中获取用户昵称
      const nickname = res.locals.user?.nickname || req.body.email;
      return `用户登录：${nickname}`;
    },
    getUserId: (req, res) => {
      // 从响应中获取用户 ID
      return res.locals.user?.id || null;
    },
  }),
  login
);

// 微信登录
router.get('/wechat', getWechatAuthUrl);
router.get('/wechat/callback', wechatCallback);

// 获取用户信息
router.get('/profile', authenticate, getProfile);

// 更新用户信息
router.put('/profile', authenticate, updateProfile);

// 更新用户设置
router.put('/settings', authenticate, updateSettings);

// 修改密码
router.put(
  '/password',
  authenticate,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
  ],
  recordOperationLog({ 
    action: 'PASSWORD_CHANGE', 
    module: 'AUTH',
  }),
  changePassword
);

// 获取用户点赞的文章
router.get('/liked-posts', authenticate, getLikedPosts);

// 获取用户评论的文章
router.get('/commented-posts', authenticate, getCommentedPosts);

// 退出登录（需要认证）
router.post(
  '/logout',
  authenticate,
  recordOperationLog({
    action: 'USER_LOGOUT',
    module: 'AUTH',
    getMessage: (req: any, res) => {
      const nickname = (res as any).locals.user?.nickname || (req as any).user?.nickname || '用户';
      return `${nickname} 退出登录`;
    },
    getUserId: (req: any, res) => {
      return (req as any).user?.id || (res as any).locals.user?.id || null;
    },
  }),
  logout
);

export { router as authRouter };

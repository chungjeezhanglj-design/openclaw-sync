import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { AppDataSource } from '../config/data-source';
import { User } from '../models/User';
import { AppError } from '../middlewares/errorHandler';
import { adminConfig } from '../config/app-config';

const userRepository = AppDataSource.getRepository(User);

// 生成 JWT Token
const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  });
};

// 邮箱注册
export const register = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'error', errors: errors.array() });
  }

  const { email, password, nickname } = req.body;

  // 检查邮箱是否已存在
  const existingUser = await userRepository.findOne({ where: { email } });
  if (existingUser) {
    throw new AppError('Email already registered', 400);
  }

  // 加密密码
  const hashedPassword = await bcrypt.hash(password, 10);

  // 创建用户
  const user = userRepository.create({
    email,
    password: hashedPassword,
    nickname,
    role: 'user',
    isActive: true,
  });

  await userRepository.save(user);

  // 生成 Token
  const token = generateToken(user.id);

  res.status(201).json({
    status: 'success',
    data: {
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
      },
      token,
    },
  });
};

// 邮箱登录
export const login = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', errors: errors.array() });
    }

    const { email, password } = req.body;

    // 检查是否是配置文件中的管理员
    if (email === adminConfig.email && password === adminConfig.password) {
      // 检查数据库是否有用户
      const userCount = await userRepository.count();
      
      if (userCount === 0) {
        // 数据库没有用户，需要先初始化
        throw new AppError('系统未初始化，请先完成初始化配置', 401);
      }

      // 查找数据库中的管理员用户
      const adminUser = await userRepository.findOne({ 
        where: { email: adminConfig.email } 
      });

      if (adminUser) {
        const token = generateToken(adminUser.id);
        // 将用户信息设置到 res.locals，供操作日志中间件使用
        (res as any).locals.user = {
          id: adminUser.id,
          nickname: adminUser.nickname,
        };
        return res.json({
          status: 'success',
          data: {
            user: {
              id: adminUser.id,
              email: adminUser.email,
              nickname: adminUser.nickname,
              avatar: adminUser.avatar,
              role: adminUser.role,
            },
            token,
            isAdmin: true,
          },
        });
      }

      throw new AppError('管理员账户未找到，请先初始化系统', 401);
    }

    // 查找用户
    const user = await userRepository.findOne({ where: { email } });
    if (!user || !user.password) {
      throw new AppError('Invalid email or password', 401);
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is inactive', 403);
    }

    // 生成 Token
    const token = generateToken(user.id);

    // 将用户信息设置到 res.locals，供操作日志中间件使用
    (res as any).locals.user = {
      id: user.id,
      nickname: user.nickname,
    };

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          avatar: user.avatar,
          role: user.role,
        },
        token,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Login failed' });
  }
};

// 退出登录
export const logout = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const nickname = req.user?.nickname || '用户';
  
  // 将用户信息设置到 res.locals，供操作日志中间件使用
  (res as any).locals.user = {
    id: userId,
    nickname,
  };
  
  res.json({
    status: 'success',
    message: `${nickname} 已退出登录`,
    data: { nickname },
  });
};

// 获取微信授权 URL
export const getWechatAuthUrl = (req: Request, res: Response) => {
  const { redirectUri } = req.query;
  
  const appid = process.env.WECHAT_APPID;
  const callbackUrl = process.env.WECHAT_REDIRECT_URI;
  
  if (!appid || !callbackUrl) {
    throw new AppError('WeChat configuration not set', 500);
  }

  const state = Buffer.from(JSON.stringify({ redirectUri })).toString('base64');
  
  const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appid}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=snsapi_userinfo&state=${state}#wechat_redirect`;

  res.json({
    status: 'success',
    data: { authUrl },
  });
};

// 微信回调处理
export const wechatCallback = async (req: Request, res: Response) => {
  const { code, state } = req.query;

  if (!code) {
    throw new AppError('Authorization code not provided', 400);
  }

  // TODO: 实现微信授权码换取 access_token 和用户信息
  // 这里简化处理，实际开发需要调用微信 API
  
  // 模拟微信登录成功
  let user = await userRepository.findOne({ where: { openid: 'mock_openid' } });
  
  if (!user) {
    user = userRepository.create({
      openid: 'mock_openid',
      nickname: '微信用户',
      avatar: '',
      role: 'user',
      isActive: true,
    });
    await userRepository.save(user);
  }

  const token = generateToken(user.id);

  // 重定向到前端，带上 token
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const redirectUrl = state ? JSON.parse(Buffer.from(state as string, 'base64').toString()).redirectUri : frontendUrl;
  res.redirect(`${redirectUrl}?token=${token}`);
};

// 获取用户信息
export const getProfile = async (req: any, res: Response) => {
  const user = req.user;
  
  res.json({
    status: 'success',
    data: {
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
        bio: user.bio,
        phone: user.phone,
        location: user.location,
        website: user.website,
        gender: user.gender,
        birthday: user.birthday,
        displayTimePreference: user.displayTimePreference,
        displayOrderPreference: user.displayOrderPreference,
        aiPromptPresetId: user.aiPromptPresetId,
        role: user.role,
        createdAt: user.createdAt,
      },
    },
  });
};

// 更新用户信息
export const updateProfile = async (req: any, res: Response) => {
  const user = req.user;
  const { nickname, avatar, bio, phone, location, website, gender, birthday } = req.body;

  if (nickname) user.nickname = nickname;
  if (avatar) user.avatar = avatar;
  if (bio !== undefined) user.bio = bio;
  if (phone !== undefined) user.phone = phone;
  if (location !== undefined) user.location = location;
  if (website !== undefined) user.website = website;
  if (gender !== undefined && gender !== '') user.gender = gender;
  if (birthday !== undefined && birthday !== '') user.birthday = birthday;

  await userRepository.save(user);

  res.json({
    status: 'success',
    data: {
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
        bio: user.bio,
        phone: user.phone,
        location: user.location,
        website: user.website,
        gender: user.gender,
        birthday: user.birthday,
      },
    },
  });
};

// 更新用户设置
export const updateSettings = async (req: any, res: Response) => {
  const user = req.user;
  const { displayTimePreference, displayOrderPreference, aiPromptPresetId } = req.body;

  if (displayTimePreference) {
    if (!['createdAt', 'takenAt'].includes(displayTimePreference)) {
      throw new AppError('Invalid displayTimePreference value', 400);
    }
    user.displayTimePreference = displayTimePreference;
  }
  if (displayOrderPreference) {
    if (!['asc', 'desc'].includes(displayOrderPreference)) {
      throw new AppError('Invalid displayOrderPreference value', 400);
    }
    user.displayOrderPreference = displayOrderPreference;
  }
  if (aiPromptPresetId !== undefined) user.aiPromptPresetId = aiPromptPresetId;

  await userRepository.save(user);

  res.json({
    status: 'success',
    data: {
      displayTimePreference: user.displayTimePreference,
      displayOrderPreference: user.displayOrderPreference,
      aiPromptPresetId: user.aiPromptPresetId,
    },
  });
};

// 修改密码
export const changePassword = async (req: any, res: Response) => {
  const user = req.user;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('Current password and new password are required', 400);
  }

  if (newPassword.length < 8) {
    throw new AppError('New password must be at least 8 characters', 400);
  }

  // 如果用户没有密码（可能是微信登录），直接设置密码
  if (!user.password) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await userRepository.save(user);

    res.json({
      status: 'success',
      message: 'Password set successfully',
    });
    return;
  }

  // 验证当前密码
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordValid) {
    throw new AppError('Current password is incorrect', 401);
  }

  // 更新密码
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await userRepository.save(user);

  res.json({
    status: 'success',
    message: 'Password changed successfully',
  });
};

// 获取用户点赞的文章
export const getLikedPosts = async (req: any, res: Response) => {
  const { page = 1, limit = 20 } = req.query;
  
  const userId = req.user.id;
  
  const likes = await AppDataSource.query(
    'SELECT p.*, l.createdAt as liked_at FROM likes l JOIN posts p ON l.postId = p.id WHERE l.userId = ? AND p.status = ? ORDER BY l.createdAt DESC LIMIT ? OFFSET ?',
    [userId, 'published', Number(limit), (Number(page) - 1) * Number(limit)]
  );
  
  const totalResult = await AppDataSource.query(
    'SELECT COUNT(*) as total FROM likes l JOIN posts p ON l.postId = p.id WHERE l.userId = ? AND p.status = ?',
    [userId, 'published']
  );
  const total = totalResult[0]?.total || 0;
  
  res.json({
    status: 'success',
    data: {
      posts: likes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
};

// 获取用户评论的文章
export const getCommentedPosts = async (req: any, res: Response) => {
  const { page = 1, limit = 20 } = req.query;
  
  const userId = req.user.id;
  
  const comments = await AppDataSource.query(
    'SELECT DISTINCT p.*, c.createdAt as commented_at FROM comments c JOIN posts p ON c.postId = p.id WHERE c.userId = ? AND p.status = ? AND c.approved != 0 ORDER BY c.createdAt DESC LIMIT ? OFFSET ?',
    [userId, 'published', Number(limit), (Number(page) - 1) * Number(limit)]
  );
  
  const totalResult = await AppDataSource.query(
    'SELECT COUNT(DISTINCT p.id) as total FROM comments c JOIN posts p ON c.postId = p.id WHERE c.userId = ? AND p.status = ? AND c.approved != 0',
    [userId, 'published']
  );
  const total = totalResult[0]?.total || 0;
  
  res.json({
    status: 'success',
    data: {
      posts: comments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
};

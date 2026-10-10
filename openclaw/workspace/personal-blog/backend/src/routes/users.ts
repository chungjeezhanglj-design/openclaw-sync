import { Router, Response } from 'express';
import { AppDataSource } from '../config/data-source';
import { User } from '../models/User';
import { authenticate } from '../middlewares/auth';
import { isAdmin } from '../middlewares/authorize';
import { AppError } from '../middlewares/errorHandler';
import { recordOperationLog } from '../middlewares/recordOperationLog';

const router = Router();
const userRepository = AppDataSource.getRepository(User);

// 获取所有用户（仅管理员）
router.get('/', authenticate, isAdmin, async (req, res: Response) => {
  const { page = 1, limit = 20, role, search } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const queryBuilder = userRepository.createQueryBuilder('user');

  if (role) {
    queryBuilder.andWhere('user.role = :role', { role });
  }

  if (search) {
    queryBuilder.andWhere(
      '(user.nickname LIKE :search OR user.email LIKE :search)',
      { search: `%${search}%` }
    );
  }

  const [users, total] = await queryBuilder
    .orderBy('user.createdAt', 'DESC')
    .skip(skip)
    .take(Number(limit))
    .getManyAndCount();

  const usersWithoutPassword = users.map((u) => ({
    id: u.id,
    email: u.email,
    nickname: u.nickname,
    avatar: u.avatar,
    bio: u.bio,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));

  res.json({
    status: 'success',
    data: {
      users: usersWithoutPassword,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

// 获取所有用户列表（仅管理员，不分页）
router.get('/all', authenticate, isAdmin, async (req, res: Response) => {
  const users = await userRepository.find({
    order: { createdAt: 'DESC' },
  });

  const usersWithoutPassword = users.map((u) => ({
    id: u.id,
    email: u.email,
    nickname: u.nickname,
    avatar: u.avatar,
    bio: u.bio,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));

  res.json({
    status: 'success',
    data: {
      users: usersWithoutPassword,
    },
  });
});

// 获取单个用户信息（公开）
router.get('/:id', async (req, res: Response) => {
  const { id } = req.params;
  const user = await userRepository.findOne({ where: { id } });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    status: 'success',
    data: {
      user: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        bio: user.bio,
        createdAt: user.createdAt,
      },
    },
  });
});

// 获取单个用户（仅管理员）
router.get('/:id/admin', authenticate, isAdmin, async (req, res: Response) => {
  const { id } = req.params;
  const user = await userRepository.findOne({ where: { id } });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    status: 'success',
    data: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      bio: user.bio,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});

// 更新用户角色（仅管理员）
router.put(
  '/:id/role',
  authenticate,
  isAdmin,
  recordOperationLog({
    action: 'USER_ROLE_CHANGE',
    module: 'USER',
    getMessage: (req, res) => `修改用户角色为 ${req.body.role}`,
  }),
  async (req, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'editor', 'admin'].includes(role)) {
      throw new AppError('Invalid role', 400);
    }

    const user = await userRepository.findOne({ where: { id } });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.role = role;
    await userRepository.save(user);

    res.json({
      status: 'success',
      data: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
      },
    });
  }
);

// 启用/禁用用户（仅管理员）
router.put(
  '/:id/status',
  authenticate,
  isAdmin,
  recordOperationLog({
    action: 'USER_STATUS_CHANGE',
    module: 'USER',
    getMessage: (req, res) => `修改用户状态为 ${req.body.isActive ? '启用' : '禁用'}`,
  }),
  async (req, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await userRepository.findOne({ where: { id } });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.isActive = isActive;
    await userRepository.save(user);

    res.json({
      status: 'success',
      data: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        isActive: user.isActive,
      },
    });
  }
);

// 删除用户（仅管理员）
router.delete(
  '/:id',
  authenticate,
  isAdmin,
  recordOperationLog({
    action: 'USER_DELETE',
    module: 'USER',
  }),
  async (req, res: Response) => {
    const { id } = req.params;

    const user = await userRepository.findOne({ where: { id } });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.role === 'admin') {
      throw new AppError('Cannot delete admin user', 400);
    }

    await userRepository.remove(user);

    res.json({
      status: 'success',
      message: 'User deleted successfully',
    });
  }
);

export default router;

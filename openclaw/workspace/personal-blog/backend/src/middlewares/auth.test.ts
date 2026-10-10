/**
 * auth.test.ts (authenticate 中间件)
 *
 * 覆盖:
 * - 无 token → 401
 * - token 解析错误 → 401
 * - token 验证失败 → 401
 * - 用户不存在 → 401
 * - 用户已禁用 → 401
 * - 正常路径 → next() + req.user 赋值
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import jwt from 'jsonwebtoken';

vi.mock('../config/data-source', () => ({
  AppDataSource: {
    getRepository: vi.fn(),
  },
}));

import { authenticate } from './auth';
import { AppDataSource } from '../config/data-source';

const mockUserRepo = {
  findOne: vi.fn(),
};
vi.mocked(AppDataSource.getRepository).mockReturnValue(mockUserRepo as any);

describe('authenticate middleware', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { headers: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
    // 重新设置 mockReturnValue,因为 clearAllMocks 会清掉
    vi.mocked(AppDataSource.getRepository).mockReturnValue(mockUserRepo as any);
  });

  it('无 Authorization header → 401', async () => {
    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Access token required',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('Authorization 不带 Bearer 前缀时,即使有 token 也会 401', async () => {
    req.headers.authorization = 'some-token-without-bearer';

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('Bearer 后无 token → 401', async () => {
    req.headers.authorization = 'Bearer ';

    await authenticate(req, res, next);

    // 'Bearer '.split(' ')[1] = '' (空字符串,falsy)
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('token 签名错误 → 401', async () => {
    req.headers.authorization = 'Bearer invalid.token.here';

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Invalid token',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('token 已过期 → 401', async () => {
    const expiredToken = jwt.sign(
      { userId: 'u1' },
      process.env.JWT_SECRET!,
      { expiresIn: '-1h' }, // 立即过期
    );
    req.headers.authorization = `Bearer ${expiredToken}`;

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('用户不存在 → 401', async () => {
    const token = jwt.sign({ userId: 'nonexistent' }, process.env.JWT_SECRET!);
    req.headers.authorization = `Bearer ${token}`;
    mockUserRepo.findOne.mockResolvedValueOnce(null);

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'User not found or inactive',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('用户已禁用 (isActive=false) → 401', async () => {
    const token = jwt.sign({ userId: 'u1' }, process.env.JWT_SECRET!);
    req.headers.authorization = `Bearer ${token}`;
    mockUserRepo.findOne.mockResolvedValueOnce({
      id: 'u1',
      isActive: false,
    });

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('有效 token + 活跃用户 → next() + req.user 赋值', async () => {
    const user = {
      id: 'u1',
      email: 'test@example.com',
      role: 'user',
      isActive: true,
    };
    const token = jwt.sign({ userId: 'u1' }, process.env.JWT_SECRET!);
    req.headers.authorization = `Bearer ${token}`;
    mockUserRepo.findOne.mockResolvedValueOnce(user);

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual(user);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('数据库查询抛错时返回 401 (而不是 500)', async () => {
    const token = jwt.sign({ userId: 'u1' }, process.env.JWT_SECRET!);
    req.headers.authorization = `Bearer ${token}`;
    mockUserRepo.findOne.mockRejectedValueOnce(new Error('DB connection lost'));

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

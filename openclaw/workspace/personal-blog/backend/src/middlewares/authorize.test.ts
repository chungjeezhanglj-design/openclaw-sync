/**
 * authorize.test.ts
 *
 * 覆盖:
 * - authorize(...permissions): 任一权限匹配即放行
 * - isAdmin: 仅 admin 角色
 * - isEditor: admin 或 editor
 * - 401 / 403 路径
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authorize, isAdmin, isEditor } from './authorize';
import { UserRole } from './roles';

describe('authorize middleware', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    req = { user: undefined };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  describe('authorize(...permissions)', () => {
    it('req.user 不存在 → 401', () => {
      const middleware = authorize('read:posts');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('用户拥有任一所需权限 → next()', () => {
      req.user = { role: UserRole.EDITOR };
      const middleware = authorize('create:posts', 'delete:posts'); // editor 有 create
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('用户缺少所有权限 → 403', () => {
      req.user = { role: UserRole.USER };
      const middleware = authorize('manage:users');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Insufficient permissions',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('多权限时,只要满足一个就放行 (OR 语义)', () => {
      req.user = { role: UserRole.USER };
      const middleware = authorize('manage:users', 'read:posts'); // user 有 read
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('无权限列表时返回 403 (空 for 循环直接 fall through)', () => {
      // 源码语义: permissions 为空数组 → for 循环不执行 → 走到 403 分支
      // 这是个潜在的安全陷阱: 调用者很容易以为 authorize() 表示 "无约束",实际是 "无匹配"
      req.user = { role: UserRole.USER };
      const middleware = authorize(); // 无参数
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('isAdmin', () => {
    it('req.user 不存在 → 401', () => {
      isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('admin 用户 → next()', () => {
      req.user = { role: UserRole.ADMIN };
      isAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('editor 用户 → 403', () => {
      req.user = { role: UserRole.EDITOR };
      isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Admin access required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('普通 user → 403', () => {
      req.user = { role: UserRole.USER };
      isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('isEditor', () => {
    it('req.user 不存在 → 401', () => {
      isEditor(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('admin 用户可访问 editor 端点', () => {
      req.user = { role: UserRole.ADMIN };
      isEditor(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('editor 用户 → next()', () => {
      req.user = { role: UserRole.EDITOR };
      isEditor(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('普通 user → 403', () => {
      req.user = { role: UserRole.USER };
      isEditor(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Editor access required',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});

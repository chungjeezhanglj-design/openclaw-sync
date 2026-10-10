/**
 * roles.test.ts
 *
 * 纯函数测试,无依赖
 * 覆盖所有 role × 所有 permission 组合
 */

import { describe, it, expect } from 'vitest';
import { UserRole, RolePermissions, hasPermission } from './roles';

describe('UserRole', () => {
  it('定义三个角色', () => {
    expect(UserRole.USER).toBe('user');
    expect(UserRole.EDITOR).toBe('editor');
    expect(UserRole.ADMIN).toBe('admin');
  });
});

describe('RolePermissions', () => {
  it('USER 有读权限但无管理权限', () => {
    expect(RolePermissions[UserRole.USER]).toContain('read:posts');
    expect(RolePermissions[UserRole.USER]).not.toContain('create:posts');
    expect(RolePermissions[UserRole.USER]).not.toContain('manage:users');
  });

  it('EDITOR 包含 USER 的权限 + 编辑权限', () => {
    const userPerms = RolePermissions[UserRole.USER];
    const editorPerms = RolePermissions[UserRole.EDITOR];

    // EDITOR 是 USER 的超集
    for (const p of userPerms) {
      expect(editorPerms).toContain(p);
    }

    expect(editorPerms).toContain('create:posts');
    expect(editorPerms).toContain('publish:posts');
    expect(editorPerms).not.toContain('manage:users'); // 编辑无用户管理
  });

  it('ADMIN 包含 EDITOR 的权限 + 系统管理权限', () => {
    const editorPerms = RolePermissions[UserRole.EDITOR];
    const adminPerms = RolePermissions[UserRole.ADMIN];

    for (const p of editorPerms) {
      expect(adminPerms).toContain(p);
    }

    expect(adminPerms).toContain('manage:users');
    expect(adminPerms).toContain('manage:system');
  });
});

describe('hasPermission', () => {
  it('USER 有 read:posts', () => {
    expect(hasPermission(UserRole.USER, 'read:posts')).toBe(true);
  });

  it('USER 无 create:posts', () => {
    expect(hasPermission(UserRole.USER, 'create:posts')).toBe(false);
  });

  it('EDITOR 有 create:posts 但无 manage:users', () => {
    expect(hasPermission(UserRole.EDITOR, 'create:posts')).toBe(true);
    expect(hasPermission(UserRole.EDITOR, 'manage:users')).toBe(false);
  });

  it('ADMIN 有所有权限', () => {
    expect(hasPermission(UserRole.ADMIN, 'manage:users')).toBe(true);
    expect(hasPermission(UserRole.ADMIN, 'manage:system')).toBe(true);
    expect(hasPermission(UserRole.ADMIN, 'publish:posts')).toBe(true);
  });

  it('未知 permission 返回 false (不会抛错)', () => {
    expect(hasPermission(UserRole.ADMIN, 'unknown:permission')).toBe(false);
  });

  it('未知 role 返回 false (有 fallback)', () => {
    expect(hasPermission('guest' as UserRole, 'read:posts')).toBe(false);
    expect(hasPermission(undefined as any, 'read:posts')).toBe(false);
  });
});

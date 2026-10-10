/**
 * health.test.ts
 *
 * 集成测试 — 通过 supertest 测 HTTP 端点
 * 覆盖:
 * - /health/live 不依赖 DB, 进程存活就 200
 * - /health/ready 检查 DB + setup, 任一不通过就 503
 * - 错误路径: DB 连不上时返回 503 + 错误信息
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// 必须在导入 app 之前 mock 掉 data-source 和 app-config,
// 否则会触发真实的 DB 连接 (data-source 会在 import 时初始化)
vi.mock('../config/data-source', () => ({
  AppDataSource: {
    isInitialized: false,
    getRepository: vi.fn(),
  },
}));

vi.mock('../config/app-config', () => ({
  adminConfig: { email: 'admin@blog.com' },
  isConfigured: vi.fn(),
  isSetupComplete: vi.fn(),
}));

import request from 'supertest';
import { app } from '../app';
import { AppDataSource } from '../config/data-source';
import { isConfigured, isSetupComplete } from '../config/app-config';

const mockIsConfigured = vi.mocked(isConfigured);
const mockIsSetupComplete = vi.mocked(isSetupComplete);

describe('GET /health/live', () => {
  it('进程存活时返回 200 + alive 状态', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('alive');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('不依赖 DB,即使 AppDataSource 未初始化也返回 200', async () => {
    // 即便 AppDataSource.isInitialized = false, liveness 也不该受影响
    (AppDataSource as any).isInitialized = false;
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
  });
});

describe('GET /health/ready', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (AppDataSource as any).isInitialized = false;
    mockIsConfigured.mockReturnValue(false);
    mockIsSetupComplete.mockReturnValue(false);
  });

  it('DB 未配置时返回 503 + dbConfigured=false', async () => {
    mockIsConfigured.mockReturnValue(false);

    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('not_ready');
    expect(res.body.checks.dbConfigured).toBe(false);
    expect(res.body.checks.dbConnected).toBe(false);
  });

  it('DB 已配置但 AppDataSource 未初始化时返回 503', async () => {
    mockIsConfigured.mockReturnValue(true);
    (AppDataSource as any).isInitialized = false;

    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(503);
    expect(res.body.checks.dbConfigured).toBe(true);
    expect(res.body.checks.dbConnected).toBe(false);
  });

  it('DB 已连接但 setup 未完成时返回 503', async () => {
    mockIsConfigured.mockReturnValue(true);
    (AppDataSource as any).isInitialized = true;
    mockIsSetupComplete.mockReturnValue(false);

    const mockUserRepo = {
      query: vi.fn().mockResolvedValueOnce([{ '1': 1 }]),
    };
    (AppDataSource.getRepository as Mock).mockReturnValue(mockUserRepo);

    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(503);
    expect(res.body.checks.dbReachable).toBe(true);
    expect(res.body.checks.setupComplete).toBe(false);
  });

  it('DB 已连接且 setup 完成时返回 200 + ready', async () => {
    mockIsConfigured.mockReturnValue(true);
    (AppDataSource as any).isInitialized = true;
    mockIsSetupComplete.mockReturnValue(true);

    const mockUserRepo = {
      query: vi.fn().mockResolvedValueOnce([{ '1': 1 }]),
    };
    (AppDataSource.getRepository as Mock).mockReturnValue(mockUserRepo);

    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.checks).toEqual({
      dbConfigured: true,
      dbConnected: true,
      dbReachable: true,
      setupComplete: true,
    });
  });

  it('DB 查询失败时返回 503 + error 信息', async () => {
    mockIsConfigured.mockReturnValue(true);
    (AppDataSource as any).isInitialized = true;

    const mockUserRepo = {
      query: vi.fn().mockRejectedValueOnce(new Error('Connection lost')),
    };
    (AppDataSource.getRepository as Mock).mockReturnValue(mockUserRepo);

    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('not_ready');
    expect(res.body.error).toContain('Connection lost');
  });
});

describe('GET /api/health (向后兼容)', () => {
  it('保留旧端点,返回 200 + status=ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
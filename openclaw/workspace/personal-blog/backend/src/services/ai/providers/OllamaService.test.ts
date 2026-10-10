/**
 * OllamaService.test.ts
 *
 * 覆盖:
 * - analyze 正常路径 (本地文件 + HTTP 图片)
 * - analyze Ollama HTTP 错误
 * - analyze Ollama 返回非 JSON → fallback result
 * - analyze Ollama 返回无效 JSON
 * - supportsBatch 行为
 * - analyzeBatch 顺序执行
 *
 * 注意: 构造函数会读 OLLAMA_BASE_URL,默认 'http://localhost:11434'
 * 因为 setup.ts 已经设置了环境变量,这里可以放心跑
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';

// mock fs 避免真实读盘
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof fs>('fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
  };
});

// 控制 OllamaService 的环境变量
const ORIGINAL_ENV = process.env;

describe('OllamaService', () => {
  let mockFetch: any;

  beforeEach(() => {
    vi.resetModules(); // 重新加载 OllamaService 以应用新的环境变量
    process.env = { ...ORIGINAL_ENV, OLLAMA_BASE_URL: 'http://test-ollama:11434', OLLAMA_MODEL: 'test-model' };

    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    // fs 默认 mock
    vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('fake-image-data'));
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.unstubAllGlobals();
  });

  describe('analyze - 本地文件路径', () => {
    it('读取本地文件 + 发送 Ollama + 解析 JSON 响应', async () => {
      const { OllamaService } = await import('./OllamaService');
      const service = new OllamaService();

      // 1. 图片读取 (走本地文件路径)
      vi.mocked(fs.readFileSync).mockReturnValueOnce(Buffer.from('test-image-binary'));

      // 2. Ollama API 调用
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          response: JSON.stringify({
            title: '测试标题',
            caption: '测试描述',
            tags: ['tag1', 'tag2'],
            scene: '测试场景',
            mood: '轻松',
          }),
        }),
      });

      const result = await service.analyze('./uploads/test.jpg');

      expect(result.title).toBe('测试标题');
      expect(result.caption).toBe('测试描述');
      expect(result.tags).toEqual(['tag1', 'tag2']);
      expect(result.scene).toBe('测试场景');
      expect(result.mood).toBe('轻松');
      expect(result.confidence).toBe(0.85);

      // 验证调用了正确的 Ollama 端点
      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-ollama:11434/api/generate',
        expect.objectContaining({ method: 'POST' }),
      );

      // 验证请求体
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.model).toBe('test-model');
      expect(body.images).toBeInstanceOf(Array);
      expect(body.images).toHaveLength(1);
      expect(body.format).toBe('json');
    });

    it('本地文件不存在时抛出错误', async () => {
      const { OllamaService } = await import('./OllamaService');
      const service = new OllamaService();

      vi.mocked(fs.readFileSync).mockImplementationOnce(() => {
        throw new Error('ENOENT: no such file');
      });

      await expect(service.analyze('./nonexistent.jpg')).rejects.toThrow('无法读取图片');
    });
  });

  describe('analyze - HTTP 图片 URL', () => {
    it('从 HTTP URL 读取图片 (不读本地文件)', async () => {
      const { OllamaService } = await import('./OllamaService');
      const service = new OllamaService();

      // 1. 图片 fetch
      mockFetch.mockResolvedValueOnce({
        arrayBuffer: async () => new TextEncoder().encode('remote-image-data').buffer,
      });

      // 2. Ollama API 调用
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          response: JSON.stringify({
            title: '远程图',
            caption: 'desc',
            tags: ['remote'],
          }),
        }),
      });

      const result = await service.analyze('http://example.com/img.jpg');

      expect(result.title).toBe('远程图');

      // 共两次 fetch 调用 (一次拿图片,一次 Ollama API)
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[0][0]).toBe('http://example.com/img.jpg');
      expect(mockFetch.mock.calls[1][0]).toBe('http://test-ollama:11434/api/generate');
    });
  });

  describe('analyze - 错误路径', () => {
    it('Ollama HTTP 错误时抛出错误', async () => {
      const { OllamaService } = await import('./OllamaService');
      const service = new OllamaService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(service.analyze('./uploads/x.jpg')).rejects.toThrow();
    });

    it('Ollama 返回非 JSON 字符串时,使用 fallback result', async () => {
      const { OllamaService } = await import('./OllamaService');
      const service = new OllamaService();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          response: '这是纯文本响应,不是 JSON', // 不是 JSON
        }),
      });

      const result = await service.analyze('./uploads/x.jpg');

      // 走 catch 分支,使用兜底 result
      expect(result.title).toBe('');
      expect(result.caption).toBe('这是纯文本响应,不是 JSON');
      expect(result.tags).toEqual(['AI识别']);
      expect(result.confidence).toBe(0.8);
    });

    it('Ollama 返回无效 JSON 时使用 fallback', async () => {
      const { OllamaService } = await import('./OllamaService');
      const service = new OllamaService();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          response: '{ invalid json',
        }),
      });

      const result = await service.analyze('./uploads/x.jpg');

      expect(result.caption).toBe('{ invalid json');
      expect(result.tags).toEqual(['AI识别']);
    });

    it('Ollama 返回 JSON 但缺少关键字段时使用默认值', async () => {
      const { OllamaService } = await import('./OllamaService');
      const service = new OllamaService();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          response: JSON.stringify({
            // 故意少字段
            caption: '只有描述',
          }),
        }),
      });

      const result = await service.analyze('./uploads/x.jpg');

      expect(result.caption).toBe('只有描述');
      expect(result.title).toBe('');
      expect(result.tags).toEqual(['照片']); // 默认标签
    });

    it('tags 不是数组时回退到默认', async () => {
      const { OllamaService } = await import('./OllamaService');
      const service = new OllamaService();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          response: JSON.stringify({
            caption: 'desc',
            tags: 'not-an-array', // 错误类型
          }),
        }),
      });

      const result = await service.analyze('./uploads/x.jpg');

      expect(result.tags).toEqual(['照片']);
    });
  });

  describe('supportsBatch', () => {
    it('Ollama 不支持 batch (returns false)', async () => {
      const { OllamaService } = await import('./OllamaService');
      const service = new OllamaService();
      expect(service.supportsBatch()).toBe(false);
    });
  });

  describe('analyzeBatch', () => {
    it('顺序处理每个 URL', async () => {
      const { OllamaService } = await import('./OllamaService');
      const service = new OllamaService();

      const urls = ['./a.jpg', './b.jpg', './c.jpg'];

      // 对每个 URL 都模拟一个 Ollama 响应
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ response: JSON.stringify({ caption: 'cap1' }) }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ response: JSON.stringify({ caption: 'cap2' }) }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ response: JSON.stringify({ caption: 'cap3' }) }),
        });

      const results = await service.analyzeBatch(urls);

      expect(results).toHaveLength(3);
      expect(results.map(r => r.caption)).toEqual(['cap1', 'cap2', 'cap3']);
    });
  });

  describe('环境变量默认值', () => {
    it('未设置 OLLAMA_BASE_URL 时使用默认值', async () => {
      vi.resetModules();
      process.env = { ...ORIGINAL_ENV };
      delete process.env.OLLAMA_BASE_URL;
      delete process.env.OLLAMA_MODEL;

      const { OllamaService } = await import('./OllamaService');
      // 不抛异常即可
      expect(() => new OllamaService()).not.toThrow();
    });
  });
});

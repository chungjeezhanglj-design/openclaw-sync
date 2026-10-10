/**
 * searchIntent.test.ts
 *
 * 覆盖范围:
 * - parseSearchIntent 主流程 (Ollama + custom API 双路径)
 * - fallbackParse (通过 Ollama 错误/无效 JSON 触发)
 * - validateAndFix (未来日期重置)
 * - getUserAiConfig (用户/预设查找)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 注意: vi.mock 会被自动 hoist 到文件顶部
vi.mock('../config/data-source', () => ({
  AppDataSource: {
    getRepository: vi.fn(),
  },
}));

import { parseSearchIntent } from './searchIntent';
import { AppDataSource } from '../config/data-source';

// 仓库 mock 句柄
const mockUserRepo = { findOne: vi.fn() };
const mockPresetRepo = { findOne: vi.fn() };
const mockGetRepository = vi.mocked(AppDataSource.getRepository);

// fetch mock
const mockFetch = vi.fn();

describe('parseSearchIntent', () => {
  beforeEach(() => {
    // 关键: 用 mockReset 彻底清空 mock (含 mockResolvedValueOnce 的队列),
    // 否则不同测试间的 queued response 会乱套
    mockFetch.mockReset();
    mockGetRepository.mockReset();
    mockUserRepo.findOne.mockReset();
    mockPresetRepo.findOne.mockReset();

    // 默认: getRepository 根据 entity 名字分发
    mockGetRepository.mockImplementation((entity: any) => {
      if (entity?.name === 'User') return mockUserRepo as any;
      if (entity?.name === 'AiPromptPreset') return mockPresetRepo as any;
      return { findOne: vi.fn() } as any;
    });

    // 默认: 找不到用户 / 预设 → 使用默认配置
    mockUserRepo.findOne.mockResolvedValue(null);
    mockPresetRepo.findOne.mockResolvedValue(null);

    // 接管全局 fetch (每个测试都重新 stub,确保指向同一个 mockFetch 实例)
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ==================== 主流程: Ollama 路径 ====================

  describe('Ollama 默认路径', () => {
    it('解析 Ollama 正常响应为 SearchIntent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content:
              '{"startDate":null,"endDate":null,"location":"青岛","keywords":["海滩"]}',
          },
        }),
      } as Response);

      const result = await parseSearchIntent('青岛海滩');

      expect(result).toEqual({
        startDate: null,
        endDate: null,
        location: '青岛',
        keywords: ['海滩'],
      });

      // 验证调用了正确的 Ollama 端点
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('在响应文本中提取 JSON 块 (即使被 markdown 包裹)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content: '好的,这是结果:\n```json\n{"location":"北京","keywords":["雪"]}\n```',
          },
        }),
      } as Response);

      const result = await parseSearchIntent('北京雪景');

      expect(result.location).toBe('北京');
      expect(result.keywords).toEqual(['雪']);
    });

    it('无 userId 时不查数据库', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { content: '{"keywords":["日落"]}' },
        }),
      } as Response);

      await parseSearchIntent('日落');

      // 任何 DB 调用都不应该有
      expect(mockGetRepository).not.toHaveBeenCalled();
      expect(mockUserRepo.findOne).not.toHaveBeenCalled();
      expect(mockPresetRepo.findOne).not.toHaveBeenCalled();
    });
  });

  // ==================== Custom API 路径 ====================

  describe('Custom API 路径', () => {
    it('user.aiProvider="custom" 时切换到 custom API', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce({
        id: 'user-1',
        aiProvider: 'custom',
        customApiUrl: 'https://api.custom.com',
        customApiModel: 'custom-model-v1',
        ollamaBaseUrl: 'http://unused',
        ollamaModel: 'unused',
        aiPromptPresetId: null,
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"location":"上海","keywords":["外滩"]}' } }],
        }),
      } as Response);

      const result = await parseSearchIntent('上海外滩', 'user-1');

      expect(result.location).toBe('上海');

      // 验证调用了 custom API 端点 (而非 Ollama)
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toContain('https://api.custom.com/v1/chat/completions');
      expect(fetchCall[0]).not.toContain('/api/chat');

      // 验证请求体是 OpenAI 兼容格式
      const body = JSON.parse(fetchCall[1].body);
      expect(body.model).toBe('custom-model-v1');
    });

    it('custom API 但 URL/Model 缺失时降级到 Ollama', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce({
        id: 'user-2',
        aiProvider: 'custom',
        customApiUrl: null, // 缺失
        customApiModel: null,
        ollamaBaseUrl: 'http://fallback.com',
        ollamaModel: 'fallback-model',
        aiPromptPresetId: null,
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: { content: '{"keywords":["fallback"]}' } }),
      } as Response);

      const result = await parseSearchIntent('test', 'user-2');

      expect(result.keywords).toEqual(['fallback']);
      expect(mockFetch.mock.calls[0][0]).toContain('http://fallback.com/api/chat');
    });
  });

  // ==================== 用户配置 ====================

  describe('用户预设查找', () => {
    it('使用用户指定的预设提示词', async () => {
      const customPrompt = '你是一个自定义 prompt';

      mockUserRepo.findOne.mockResolvedValueOnce({
        id: 'user-3',
        aiProvider: 'ollama',
        aiPromptPresetId: 'preset-1',
        ollamaBaseUrl: 'http://localhost:11434',
        ollamaModel: 'm',
      } as any);
      mockPresetRepo.findOne.mockResolvedValueOnce({
        id: 'preset-1',
        prompt: customPrompt,
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: { content: '{"keywords":["x"]}' } }),
      } as Response);

      await parseSearchIntent('test', 'user-3');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.messages[0].content).toBe(customPrompt);
    });

    it('用户无 presetId 时使用系统默认预设', async () => {
      const systemPrompt = '系统默认 prompt';

      mockUserRepo.findOne.mockResolvedValueOnce({
        id: 'user-4',
        aiProvider: 'ollama',
        aiPromptPresetId: null,
      } as any);
      // 用户没选 preset,代码只会调用一次 findOne 查系统默认预设
      // (不需要 mockResolvedValueOnce 链,直接 mockResolvedValue 即可)
      mockPresetRepo.findOne.mockResolvedValue({
        prompt: systemPrompt,
        isDefault: true,
        userId: 'system',
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: { content: '{"keywords":["y"]}' } }),
      } as Response);

      await parseSearchIntent('test', 'user-4');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.messages[0].content).toBe(systemPrompt);
    });

    it('DB 查询失败时当前会向上抛错 (TODO: 源码应改为回退默认配置)', async () => {
      // 已知问题: getUserAiConfig 在 parseSearchIntent 的 try/catch 之外,
      // DB 异常会直接逃逸。后续可以补一个 follow-up 修源码。
      mockUserRepo.findOne.mockRejectedValueOnce(new Error('DB down'));

      await expect(parseSearchIntent('test', 'user-broken')).rejects.toThrow('DB down');
    });
  });

  // ==================== 失败路径 → fallbackParse ====================

  describe('Fallback 路径', () => {
    it('Ollama HTTP 错误时回退到 fallbackParse', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const result = await parseSearchIntent('青岛 海滩,日落');

      expect(result.startDate).toBeNull();
      expect(result.endDate).toBeNull();
      expect(result.location).toBeNull();
      expect(result.keywords).toEqual(['青岛', '海滩', '日落']);
    });

    it('Ollama 返回内容不含 JSON 时回退到 fallbackParse', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { content: '抱歉,我无法解析这个查询' },
        }),
      } as Response);

      const result = await parseSearchIntent('海边 沙滩 椰树');

      expect(result.location).toBeNull();
      expect(result.keywords).toEqual(['海边', '沙滩', '椰树']);
    });

    it('Ollama 返回无效 JSON 时回退到 fallbackParse', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { content: '{ invalid json' },
        }),
      } as Response);

      const result = await parseSearchIntent('foo bar');

      expect(result.keywords).toEqual(['foo', 'bar']);
    });

    it('网络异常时回退到 fallbackParse', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await parseSearchIntent('关键词');

      expect(result.keywords).toEqual(['关键词']);
    });

    it('空查询的 fallback 返回空数组', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const result = await parseSearchIntent('');

      expect(result.keywords).toEqual([]);
      expect(result.location).toBeNull();
    });

    it('中英文逗号混合的 fallback 正确分词', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const result = await parseSearchIntent('青岛,上海,北京，杭州');

      expect(result.keywords).toEqual(['青岛', '上海', '北京', '杭州']);
    });
  });

  // ==================== validateAndFix (未来日期重置) ====================

  describe('validateAndFix - 未来日期重置', () => {
    it('endDate 是未来日期时, startDate 和 endDate 都被重置', async () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      const futureStr = future.toISOString().slice(0, 10);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content: `{"startDate":"2020-01-01","endDate":"${futureStr}","location":"火星","keywords":[]}`,
          },
        }),
      } as Response);

      const result = await parseSearchIntent('火星');

      expect(result.startDate).toBeNull();
      expect(result.endDate).toBeNull();
      expect(result.location).toBe('火星'); // location 不被影响
    });

    it('startDate 是未来日期时也被重置', async () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 2);
      const futureStr = future.toISOString().slice(0, 10);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content: `{"startDate":"${futureStr}","endDate":"${futureStr}","location":"未来城","keywords":[]}`,
          },
        }),
      } as Response);

      const result = await parseSearchIntent('未来');

      expect(result.startDate).toBeNull();
      expect(result.endDate).toBeNull();
    });

    it('历史日期正常保留', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content: '{"startDate":"2020-01-01","endDate":"2020-12-31","location":"老照片","keywords":[]}',
          },
        }),
      } as Response);

      const result = await parseSearchIntent('老照片');

      expect(result.startDate).toBe('2020-01-01');
      expect(result.endDate).toBe('2020-12-31');
    });

    it('keywords 不是数组时被重置为空数组', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content: '{"keywords":"not-an-array"}',
          },
        }),
      } as Response);

      const result = await parseSearchIntent('x');

      expect(result.keywords).toEqual([]);
    });
  });
});

/**
 * MockAIService.test.ts
 *
 * Mock 服务跑的是固定场景,无外部依赖,可放心走真实 setTimeout
 * 用 vi.useFakeTimers 加速,避免每个 analyze 等 1-2 秒
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MockAIService } from './MockAIService';

describe('MockAIService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('analyze', () => {
    it('返回合法 AIAnalysisResult', async () => {
      const service = new MockAIService();
      const promise = service.analyze('http://example.com/img.jpg');

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toHaveProperty('caption');
      expect(result).toHaveProperty('tags');
      expect(result).toHaveProperty('confidence');
      expect(typeof result.caption).toBe('string');
      expect(result.caption.length).toBeGreaterThan(0);
      expect(Array.isArray(result.tags)).toBe(true);
      expect(result.tags.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('confidence 在合理范围内 (0, 1]', async () => {
      const service = new MockAIService();
      const results = [];

      // 跑多次,确认 confidence 都在合理范围
      for (let i = 0; i < 10; i++) {
        const p = service.analyze(`http://example.com/${i}.jpg`);
        await vi.runAllTimersAsync();
        results.push(await p);
      }

      for (const r of results) {
        expect(r.confidence).toBeGreaterThan(0);
        expect(r.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('customPrompt 参数不影响结果', async () => {
      const service = new MockAIService();
      const p1 = service.analyze('a.jpg', 'prompt A');
      const p2 = service.analyze('b.jpg', 'prompt B');

      await vi.runAllTimersAsync();
      const r1 = await p1;
      const r2 = await p2;

      // 都是合法的 AIAnalysisResult
      expect(r1).toHaveProperty('caption');
      expect(r2).toHaveProperty('caption');
    });
  });

  describe('supportsBatch', () => {
    it('返回 true', () => {
      const service = new MockAIService();
      expect(service.supportsBatch()).toBe(true);
    });
  });

  describe('analyzeBatch', () => {
    it('返回与输入等长的结果数组', async () => {
      const service = new MockAIService();
      const urls = ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'];

      const promise = service.analyzeBatch(urls);
      // analyzeBatch 是顺序执行,需要多次推进 timer
      // 每个 analyze 调用一次 setTimeout,所以要跑多次
      for (let i = 0; i < urls.length; i++) {
        await vi.runAllTimersAsync();
      }
      const results = await promise;

      expect(results).toHaveLength(urls.length);
      for (const r of results) {
        expect(r).toHaveProperty('caption');
        expect(r).toHaveProperty('tags');
      }
    });

    it('空数组返回空结果', async () => {
      const service = new MockAIService();
      const results = await service.analyzeBatch([]);
      expect(results).toEqual([]);
    });
  });
});

/**
 * AIServiceFactory.test.ts
 *
 * 覆盖 5 个 provider 的路由 + 默认 fallback
 */

import { describe, it, expect } from 'vitest';
import { AIServiceFactory } from './AIServiceFactory';
import { MockAIService } from './providers/MockAIService';
import { TongyiService } from './providers/TongyiService';
import { MiniMaxService } from './providers/MiniMaxService';
import { MoonshotService } from './providers/MoonshotService';
import { OllamaService } from './providers/OllamaService';

describe('AIServiceFactory.create', () => {
  it('tongyi → TongyiService', () => {
    expect(AIServiceFactory.create('tongyi')).toBeInstanceOf(TongyiService);
  });

  it('minimax → MiniMaxService', () => {
    expect(AIServiceFactory.create('minimax')).toBeInstanceOf(MiniMaxService);
  });

  it('moonshot → MoonshotService', () => {
    expect(AIServiceFactory.create('moonshot')).toBeInstanceOf(MoonshotService);
  });

  it('ollama → OllamaService', () => {
    expect(AIServiceFactory.create('ollama')).toBeInstanceOf(OllamaService);
  });

  it('mock → MockAIService', () => {
    expect(AIServiceFactory.create('mock')).toBeInstanceOf(MockAIService);
  });

  it('未知 provider → 默认 MockAIService (兜底)', () => {
    expect(AIServiceFactory.create('unknown')).toBeInstanceOf(MockAIService);
    expect(AIServiceFactory.create('')).toBeInstanceOf(MockAIService);
    expect(AIServiceFactory.create('gpt-4')).toBeInstanceOf(MockAIService);
  });

  it('返回的对象都实现 IImageAnalysisService 接口', () => {
    const providers = ['tongyi', 'minimax', 'moonshot', 'ollama', 'mock'];
    for (const p of providers) {
      const service = AIServiceFactory.create(p);
      expect(typeof service.analyze).toBe('function');
      expect(typeof service.supportsBatch).toBe('function');
      expect(typeof service.analyzeBatch).toBe('function');
      expect(typeof service.supportsBatch()).toBe('boolean');
    }
  });
});

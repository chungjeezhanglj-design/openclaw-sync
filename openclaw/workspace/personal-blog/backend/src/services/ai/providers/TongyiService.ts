import { IImageAnalysisService, AIAnalysisResult } from '../types';

export class TongyiService implements IImageAnalysisService {
  private apiKey: string;
  private endpoint: string;

  constructor() {
    this.apiKey = process.env.TONGYI_API_KEY || '';
    this.endpoint = process.env.TONGYI_ENDPOINT || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
    
    if (!this.apiKey) {
      console.warn('TONGYI_API_KEY not configured, using mock service');
    }
  }

  async analyze(imageUrl: string, _customPrompt?: string): Promise<AIAnalysisResult> {
    // TODO: 实现真实的通义千问API调用
    // 这里提供一个示例实现框架

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen-vl-plus',
          input: {
            messages: [
              {
                role: 'user',
                content: [
                  { image: imageUrl },
                  { text: '请描述这张图片的场景，并给出适合配文的一段话。请以JSON格式返回：{caption: "配文", tags: ["标签1", "标签2"], scene: "场景类型", mood: "氛围"}' }
                ]
              }
            ]
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data: any = await response.json();
      
      // 解析AI返回的内容
      // 注意：实际实现需要根据通义千问的返回格式进行调整
      const content = data?.output?.choices?.[0]?.message?.content || '';
      
      // 尝试解析JSON
      try {
        const parsed = JSON.parse(content);
        return {
          caption: parsed.caption || '这是一张美好的照片',
          tags: parsed.tags || ['照片'],
          confidence: 0.9,
          scene: parsed.scene,
          mood: parsed.mood,
        };
      } catch {
        // 如果不是JSON格式，直接使用文本
        return {
          caption: content,
          tags: ['AI识别'],
          confidence: 0.85,
        };
      }
    } catch (error) {
      console.error('Tongyi API error:', error);
      // 失败时回退到mock
      const { MockAIService } = require('./MockAIService');
      const mock = new MockAIService();
      return mock.analyze(imageUrl);
    }
  }

  supportsBatch(): boolean {
    return false;
  }

  async analyzeBatch(imageUrls: string[]): Promise<AIAnalysisResult[]> {
    const results: AIAnalysisResult[] = [];
    for (const url of imageUrls) {
      const result = await this.analyze(url);
      results.push(result);
    }
    return results;
  }
}

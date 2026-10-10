import { IImageAnalysisService, AIAnalysisResult } from '../types';
import { MockAIService } from './MockAIService';

interface MiniMaxError {
  message: string;
  code?: string;
  details?: string;
}

export class MiniMaxService implements IImageAnalysisService {
  private apiKey: string;
  private endpoint: string;

  constructor() {
    this.apiKey = process.env.MINIMAX_API_KEY || '';
    this.endpoint = process.env.MINIMAX_API_HOST || 'https://api.minimaxi.com/anthropic/v1/messages';
    
    if (!this.apiKey) {
      console.warn('⚠️ MINIMAX_API_KEY 未配置');
    } else {
      console.log('✓ MiniMax 服务已配置');
      console.log('  端点:', this.endpoint);
    }
  }

  async analyze(imageUrl: string, _customPrompt?: string): Promise<AIAnalysisResult> {
    if (!this.apiKey) {
      console.log('使用 Mock 服务（无 API Key）');
      const mock = new MockAIService();
      return mock.analyze(imageUrl);
    }

    try {
      console.log('调用 MiniMax API...');
      console.log('图片:', imageUrl);

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'MiniMax-M2.1',
          max_tokens: 1000,
          system: '你是一个图片分析助手，请用JSON格式返回分析结果，包含字段：caption(配文), tags(标签数组), scene(场景类型), mood(氛围情感)。只返回JSON，不要其他内容。',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `请分析这张图片，返回JSON格式：{"caption":"...", "tags":[...], "scene":"...", "mood":"..."}`
                }
              ]
            }
          ]
        })
      });

      console.log('响应状态:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('MiniMax API 错误:', errorText);
        
        const error: MiniMaxError = {
          message: `API 请求失败 (${response.status})`,
          code: response.status.toString(),
          details: errorText,
        };
        
        throw new Error(JSON.stringify(error));
      }

      const data = await response.json() as any;
      
      // 提取文本内容
      const textContent = data.content
        ?.filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('');

      console.log('响应内容:', textContent);

      // 尝试解析JSON
      try {
        const parsed = JSON.parse(textContent || '{}');
        return {
          caption: parsed.caption || '这是一张美好的照片',
          tags: Array.isArray(parsed.tags) ? parsed.tags : ['照片'],
          confidence: 0.9,
          scene: parsed.scene,
          mood: parsed.mood,
        };
      } catch {
        // 如果返回的不是JSON，直接使用文本作为配文
        return {
          caption: textContent || '图片分析完成',
          tags: ['AI识别'],
          confidence: 0.8,
        };
      }
    } catch (error: any) {
      console.error('MiniMax API error:', error);
      
      let errorMessage = 'MiniMax API 调用失败';
      try {
        const errorObj = JSON.parse(error.message);
        errorMessage = `${errorObj.message}: ${errorObj.details || errorObj.code || ''}`;
      } catch {
        errorMessage = error.message || '未知错误';
      }
      
      console.log('错误详情:', errorMessage);
      console.log('回退到 Mock 服务');
      
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

import { IImageAnalysisService, AIAnalysisResult } from '../types';
import { MockAIService } from './MockAIService';
import * as fs from 'fs';
import * as path from 'path';

interface OllamaError {
  message: string;
  code?: string;
  details?: string;
}

export class OllamaService implements IImageAnalysisService {
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'openbmb/minicpm-v4.5:8b';
    
    if (this.baseUrl === 'http://localhost:11434') {
      console.warn('⚠️ OLLAMA_BASE_URL 未配置，使用默认 localhost:11434');
    } else {
      console.log('✓ Ollama 服务已配置');
      console.log('  端点:', this.baseUrl);
      console.log('  模型:', this.model);
    }
  }

  private async getImageAsBase64(imageUrl: string): Promise<string> {
    try {
      if (imageUrl.startsWith('http')) {
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
      } else {
        const filePath = path.resolve(process.cwd(), imageUrl);
        const imageBuffer = fs.readFileSync(filePath);
        return imageBuffer.toString('base64');
      }
    } catch (error) {
      console.error('读取图片失败:', error);
      throw new Error('无法读取图片');
    }
  }

  async analyze(imageUrl: string, customPrompt?: string): Promise<AIAnalysisResult> {
    try {
      console.log('调用 Ollama API...');
      console.log('图片:', imageUrl);
      console.log('模型:', this.model);

      const base64Image = await this.getImageAsBase64(imageUrl);

      const defaultPrompt = `请分析这张图片，返回JSON格式结果：
{"title":"标题","caption":"描述","tags":["标签"],"scene":"场景","mood":"氛围"}`;
      const prompt = customPrompt || defaultPrompt;

      const requestBody = {
        model: this.model,
        prompt: prompt,
        images: [base64Image],
        format: 'json',
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 500,
        }
      };

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('响应状态:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ollama API 错误:', errorText);
        
        const error: OllamaError = {
          message: `API 请求失败 (${response.status})`,
          code: response.status.toString(),
          details: errorText,
        };
        
        throw new Error(JSON.stringify(error));
      }

      const data = await response.json() as any;
      console.log('原始响应:', data.response);

      try {
        const parsed = JSON.parse(data.response || '{}');
        return {
          title: parsed.title || '',
          caption: parsed.caption || '这是一张美好的照片',
          tags: Array.isArray(parsed.tags) ? parsed.tags : ['照片'],
          confidence: 0.85,
          scene: parsed.scene,
          mood: parsed.mood,
        };
      } catch {
        return {
          title: '',
          caption: data.response || '图片分析完成',
          tags: ['AI识别'],
          confidence: 0.8,
        };
      }
    } catch (error: any) {
      console.error('Ollama API error:', error);
      throw error;
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

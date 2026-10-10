import { IImageAnalysisService, AIAnalysisResult } from '../types'
import { MockAIService } from './MockAIService'

interface MoonshotResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

export class MoonshotService implements IImageAnalysisService {
  private apiKey: string
  private endpoint: string

  constructor() {
    this.apiKey = process.env.MOONSHOT_API_KEY || ''
    this.endpoint = process.env.MOONSHOT_ENDPOINT || 'https://api.moonshot.cn/v1/chat/completions'
    
    if (!this.apiKey) {
      console.warn('⚠️ MOONSHOT_API_KEY 未配置，将使用 Mock 服务')
    } else {
      console.log('✓ Moonshot AI 服务已配置')
      console.log('  端点:', this.endpoint)
    }
  }

  async analyze(imageUrl: string, _customPrompt?: string): Promise<AIAnalysisResult> {
    if (!this.apiKey) {
      console.log('使用 Mock 服务（无 API Key）')
      const mock = new MockAIService()
      return mock.analyze(imageUrl)
    }

    try {
      console.log('调用 Kimi AI 图片理解...')
      console.log('图片:', imageUrl)

      // 下载图片并转为 base64
      console.log('正在下载图片...')
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        throw new Error(`下载图片失败: ${imageResponse.status}`)
      }
      const imageBuffer = await imageResponse.arrayBuffer()
      const base64Image = Buffer.from(imageBuffer).toString('base64')
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
      console.log('图片已转为 base64')

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'moonshot-v1-8k-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${contentType};base64,${base64Image}`,
                  },
                },
                {
                  type: 'text',
                  text: `请分析这张图片，以JSON格式返回分析结果。JSON格式：{"title": "文章标题（简洁有力，10字以内）", "caption": "配文描述", "tags": ["标签1", "标签2", "标签3"], "scene": "场景类型", "mood": "氛围情感"}。只返回JSON，不要其他内容。`
                }
              ]
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        })
      })

        console.log('响应状态:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Moonshot API 错误:', errorText)
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json() as MoonshotResponse
      console.log('响应内容:', JSON.stringify(data, null, 2))

      const content = data?.choices?.[0]?.message?.content || ''

      try {
        const parsed = JSON.parse(content)
        return {
          title: parsed.title || '',
          caption: parsed.caption || '这是一张美好的照片',
          tags: Array.isArray(parsed.tags) ? parsed.tags : ['照片'],
          confidence: 0.9,
          scene: parsed.scene,
          mood: parsed.mood,
        }
      } catch {
        return {
          caption: content,
          tags: ['AI识别'],
          confidence: 0.85,
        }
      }
    } catch (error: any) {
      console.error('Moonshot API error:', error.message)
      throw error
    }
  }

  supportsBatch(): boolean {
    return false
  }

  async analyzeBatch(imageUrls: string[]): Promise<AIAnalysisResult[]> {
    const results: AIAnalysisResult[] = []
    for (const url of imageUrls) {
      const result = await this.analyze(url)
      results.push(result)
    }
    return results
  }
}

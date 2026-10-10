import { IImageAnalysisService, AIAnalysisResult } from '../types';

export class MockAIService implements IImageAnalysisService {
  private mockScenarios = [
    {
      title: '宁静湖光',
      caption: '阳光洒在宁静的湖面上，波光粼粼，远处的山峦若隐若现，构成一幅绝美的山水画卷。',
      tags: ['自然', '风景', '湖泊', '山脉', '阳光'],
      confidence: 0.95,
      scene: '自然风光',
      mood: '宁静祥和',
    },
    {
      title: '都市霓虹',
      caption: '繁华的都市夜景，霓虹灯光闪烁，车流如织，展现现代都市的活力与魅力。',
      tags: ['城市', '夜景', '灯光', '现代', '繁华'],
      confidence: 0.92,
      scene: '城市风光',
      mood: '活力四射',
    },
    {
      title: '咖啡时光',
      caption: '温馨的咖啡馆角落，阳光透过窗户洒在木质桌面上，一杯香醇的咖啡散发着迷人的香气。',
      tags: ['咖啡', '室内', '温馨', '生活', '休闲'],
      confidence: 0.88,
      scene: '室内生活',
      mood: '温暖惬意',
    },
    {
      title: '海滨假日',
      caption: '金色的沙滩上，海浪轻轻拍打着岸边，椰树随风摇曳，是度假胜地的完美写照。',
      tags: ['海滩', '度假', '海洋', '椰树', '阳光'],
      confidence: 0.94,
      scene: '海滨风光',
      mood: '轻松愉悦',
    },
    {
      title: '岁月痕迹',
      caption: '古老的城市街道，石板路上铺满落叶，历史建筑静静伫立，诉说着岁月的故事。',
      tags: ['历史', '街道', '建筑', '秋天', '怀旧'],
      confidence: 0.90,
      scene: '历史街区',
      mood: '怀旧深情',
    },
  ];

  async analyze(imageUrl: string, _customPrompt?: string): Promise<AIAnalysisResult> {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    const randomIndex = Math.floor(Math.random() * this.mockScenarios.length);
    return this.mockScenarios[randomIndex];
  }

  supportsBatch(): boolean {
    return true;
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

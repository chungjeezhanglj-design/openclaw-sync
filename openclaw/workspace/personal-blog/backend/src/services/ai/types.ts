export interface AIAnalysisResult {
  title?: string;
  caption: string;
  tags: string[];
  confidence: number;
  scene?: string;
  mood?: string;
}

export interface IImageAnalysisService {
  analyze(imageUrl: string, customPrompt?: string): Promise<AIAnalysisResult>;
  supportsBatch(): boolean;
  analyzeBatch(imageUrls: string[]): Promise<AIAnalysisResult[]>;
}

import { IImageAnalysisService } from './types';
import { MockAIService } from './providers/MockAIService';
import { TongyiService } from './providers/TongyiService';
import { MiniMaxService } from './providers/MiniMaxService';
import { MoonshotService } from './providers/MoonshotService';
import { OllamaService } from './providers/OllamaService';

export class AIServiceFactory {
  static create(provider: string): IImageAnalysisService {
    switch (provider) {
      case 'tongyi':
        return new TongyiService();
      case 'minimax':
        return new MiniMaxService();
      case 'moonshot':
        return new MoonshotService();
      case 'ollama':
        return new OllamaService();
      case 'mock':
        return new MockAIService();
      default:
        return new MockAIService();
    }
  }
}

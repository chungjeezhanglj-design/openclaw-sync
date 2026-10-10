import { AppDataSource } from '../config/data-source';
import { User } from '../models/User';
import { AiPromptPreset } from '../models/AiPromptPreset';

export interface SearchIntent {
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  keywords: string[];
}

interface OllamaConfig {
  baseUrl: string;
  model: string;
}

const DEFAULT_OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://192.168.1.111:11434';
const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'openbmb/minicpm-v4.5:8b';

const DEFAULT_SYSTEM_PROMPT = `你是"时间"、"地点"、"关键词"拆分专家，当前2026-02-26。地点指地图上的地点，如北京、上海、青岛等。关键词不要去分词。示例：海边的日落 → {"startDate":null,"endDate":null,"location":null,"keywords":["海边的日落"]} 西藏的蓝天 → {"startDate":null,"endDate":null,"location":"西藏","keywords":["蓝天"]} 青岛 → {"startDate":null,"endDate":null,"location":"青岛","keywords":[]} 近三年青岛海滩 → {"startDate":"2023-02-26","endDate":"2026-02-26","location":"青岛","keywords":["海滩"]} 去年北京 → {"startDate":"2025-01-01","endDate":"2025-12-31","location":"北京","keywords":[]} 去年夏天上海 → {"startDate":"2025-06-01","endDate":"2025-08-31","location":"上海","keywords":[]} 五一期间的厦门 → {"startDate":null,"endDate":null,"location":"厦门","keywords":["五一"]} 请你深度思考解析，语句中不一定有全部的信息，只返回一个JSON。`;

async function getUserAiConfig(userId?: string): Promise<{
  systemPrompt: string;
  ollamaConfig: OllamaConfig;
  useCustomApi: boolean;
  customApiUrl?: string;
  customApiModel?: string;
}> {
  const defaultResult = {
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    ollamaConfig: {
      baseUrl: DEFAULT_OLLAMA_BASE_URL,
      model: DEFAULT_OLLAMA_MODEL,
    },
    useCustomApi: false,
  };

  if (!userId) {
    return defaultResult;
  }

  // 只在需要查 DB 时才解析 Repository,避免无 userId 时多走两次 TypeORM 元数据查找
  const userRepository = AppDataSource.getRepository(User);
  const presetRepository = AppDataSource.getRepository(AiPromptPreset);

  const user = await userRepository.findOne({ where: { id: userId } });
  if (!user) {
    return defaultResult;
  }

  let systemPrompt = DEFAULT_SYSTEM_PROMPT;

  // 优先使用用户选择的提示词
  if (user.aiPromptPresetId) {
    const preset = await presetRepository.findOne({
      where: { id: user.aiPromptPresetId },
    });
    if (preset) {
      systemPrompt = preset.prompt;
    }
  } else {
    // 用户没有选择提示词时，自动查找 type='search' 且 is_default=1 的系统预设
    const defaultPreset = await presetRepository.findOne({
      where: { type: 'search', isDefault: true, userId: 'system' },
    });
    if (defaultPreset) {
      systemPrompt = defaultPreset.prompt;
    }
  }

  const useCustomApi = user.aiProvider === 'custom';

  return {
    systemPrompt,
    ollamaConfig: {
      baseUrl: user.ollamaBaseUrl || DEFAULT_OLLAMA_BASE_URL,
      model: user.ollamaModel || DEFAULT_OLLAMA_MODEL,
    },
    useCustomApi,
    customApiUrl: user.customApiUrl,
    customApiModel: user.customApiModel,
  };
}

export async function parseSearchIntent(
  query: string,
  userId?: string
): Promise<SearchIntent> {
  const config = await getUserAiConfig(userId);

  try {
    let response: Response;
    let apiUrl: string;
    let model: string;
    let requestBody: any;
    // 关键: 用一个统一的 isCustomApi 标志,fetch 路径 和 响应解析 都用它
    // 避免 "useCustomApi=true 但 URL/Model 缺失" 时路径不一致的 bug
    // 注意: 把判断条件显式写两遍 — 这样 TypeScript 能在每个 if 块内正确 narrow 类型
    const isCustomApi = !!(config.useCustomApi && config.customApiUrl && config.customApiModel);

    if (isCustomApi && config.customApiUrl && config.customApiModel) {
      apiUrl = `${config.customApiUrl}/v1/chat/completions`;
      model = config.customApiModel;
      requestBody = {
        model,
        messages: [
          { role: 'system', content: config.systemPrompt },
          { role: 'user', content: `解析：${query}` },
        ],
        stream: false,
      };
    } else {
      apiUrl = `${config.ollamaConfig.baseUrl}/api/chat`;
      model = config.ollamaConfig.model;
      requestBody = {
        model,
        messages: [
          { role: 'system', content: config.systemPrompt },
          { role: 'user', content: `解析：${query}` },
        ],
        stream: false,
      };
    }

    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = (await response.json()) as any;
    let content: string;

    if (isCustomApi) {
      content = data.choices?.[0]?.message?.content || '';
    } else {
      content = data.message?.content || '';
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return fallbackParse(query);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return validateAndFix(parsed);
  } catch (error) {
    console.error('解析搜索意图失败:', error);
    return fallbackParse(query);
  }
}

function validateAndFix(intent: any): SearchIntent {
  const now = new Date();
  const result: SearchIntent = {
    startDate: intent.startDate || null,
    endDate: intent.endDate || null,
    location: intent.location || null,
    keywords: Array.isArray(intent.keywords) ? intent.keywords : [],
  };

  if (result.endDate && new Date(result.endDate) > now) {
    result.startDate = null;
    result.endDate = null;
  }

  if (result.startDate && new Date(result.startDate) > now) {
    result.startDate = null;
    result.endDate = null;
  }

  return result;
}

function fallbackParse(query: string): SearchIntent {
  const keywords = query.split(/[\s,，]+/).filter(Boolean);
  return {
    startDate: null,
    endDate: null,
    location: null,
    keywords,
  };
}

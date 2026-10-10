import { Response } from 'express';
import { AppDataSource } from '../config/data-source';
import { User } from '../models/User';
import { AuthRequest } from '../middlewares/auth';

const userRepository = AppDataSource.getRepository(User);

export interface UserAiConfig {
  ollamaBaseUrl: string;
  ollamaModel: string;
  customApiUrl: string;
  customApiModel: string;
  aiProvider: string;
  aiPromptPresetId: string | null;
}

export const getAiConfig = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: '需要登录',
    });
  }

  const config: UserAiConfig = {
    ollamaBaseUrl: req.user.ollamaBaseUrl || '',
    ollamaModel: req.user.ollamaModel || '',
    customApiUrl: req.user.customApiUrl || '',
    customApiModel: req.user.customApiModel || '',
    aiProvider: req.user.aiProvider || 'ollama',
    aiPromptPresetId: req.user.aiPromptPresetId || null,
  };

  res.json({
    status: 'success',
    data: {
      config,
    },
  });
};

export const updateAiConfig = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: '需要登录',
    });
  }

  const {
    ollamaBaseUrl,
    ollamaModel,
    customApiUrl,
    customApiModel,
    aiProvider,
    aiPromptPresetId,
  } = req.body;

  const user = await userRepository.findOne({
    where: { id: req.user.id },
  });

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: '用户不存在',
    });
  }

  if (ollamaBaseUrl !== undefined) {
    user.ollamaBaseUrl = ollamaBaseUrl;
  }
  if (ollamaModel !== undefined) {
    user.ollamaModel = ollamaModel;
  }
  if (customApiUrl !== undefined) {
    user.customApiUrl = customApiUrl;
  }
  if (customApiModel !== undefined) {
    user.customApiModel = customApiModel;
  }
  if (aiProvider !== undefined) {
    user.aiProvider = aiProvider;
  }
  if (aiPromptPresetId !== undefined) {
    user.aiPromptPresetId = aiPromptPresetId;
  }

  await userRepository.save(user);

  res.json({
    status: 'success',
    message: 'AI 配置已更新',
    data: {
      config: {
        ollamaBaseUrl: user.ollamaBaseUrl,
        ollamaModel: user.ollamaModel,
        customApiUrl: user.customApiUrl,
        customApiModel: user.customApiModel,
        aiProvider: user.aiProvider,
        aiPromptPresetId: user.aiPromptPresetId,
      },
    },
  });
};

export const getOllamaModels = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: '需要登录',
    });
  }

  const baseUrl = req.user.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as any;
    const models = data.models || [];

    res.json({
      status: 'success',
      data: {
        models: models.map((m: any) => ({
          name: m.name,
          size: m.size,
          modifiedAt: m.modified_at,
        })),
      },
    });
  } catch (error: any) {
    console.error('获取 Ollama 模型列表失败:', error);
    res.json({
      status: 'success',
      data: {
        models: [],
      },
    });
  }
};

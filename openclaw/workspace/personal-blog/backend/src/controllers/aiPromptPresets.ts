import { Response } from 'express';
import { AppDataSource } from '../config/data-source';
import { AiPromptPreset } from '../models/AiPromptPreset';
import { AuthRequest } from '../middlewares/auth';

const presetRepository = AppDataSource.getRepository(AiPromptPreset);

export const getPresets = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: '需要登录',
    });
  }

  // 获取当前用户的预设和系统预设
  const presets = await presetRepository.find({
    where: [
      { userId: req.user.id },
      { userId: 'system' },
    ],
    order: { isDefault: 'DESC', createdAt: 'ASC' },
  });

  res.json({
    status: 'success',
    data: {
      presets: presets.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type || 'image',
        description: p.description || '',
        prompt: p.prompt,
        isDefault: p.isDefault,
        userId: p.userId,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    },
  });
};

export const getPreset = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: '需要登录',
    });
  }

  const { id } = req.params;

  const preset = await presetRepository.findOne({
    where: { id, userId: req.user.id },
  });

  if (!preset) {
    return res.status(404).json({
      status: 'error',
      message: '预设不存在',
    });
  }

  res.json({
    status: 'success',
    data: {
      preset: {
        id: preset.id,
        name: preset.name,
        prompt: preset.prompt,
        isDefault: preset.isDefault,
        createdAt: preset.createdAt,
        updatedAt: preset.updatedAt,
      },
    },
  });
};

export const createPreset = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: '需要登录',
    });
  }

  const { name, prompt, description, type, isDefault, isSystem } = req.body;

  if (!name || !prompt) {
    return res.status(400).json({
      status: 'error',
      message: '名称和提示词不能为空',
    });
  }

  const userId = isSystem && req.user.role === 'admin' ? 'system' : req.user.id;
  const presetType = type || 'image';

  if (isDefault) {
    await presetRepository.update(
      { userId, type: presetType, isDefault: true },
      { isDefault: false }
    );
  }

  const preset = presetRepository.create({
    name,
    prompt,
    description: description || '',
    type: presetType,
    userId,
    isDefault: isDefault || false,
  });

  await presetRepository.save(preset);

  res.status(201).json({
    status: 'success',
    data: {
      preset: {
        id: preset.id,
        name: preset.name,
        prompt: preset.prompt,
        isDefault: preset.isDefault,
        createdAt: preset.createdAt,
        updatedAt: preset.updatedAt,
      },
    },
  });
};

export const updatePreset = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: '需要登录',
    });
  }

  const { id } = req.params;
  const { name, prompt, description, type, isDefault } = req.body;

  const existingPreset = await presetRepository.findOne({
    where: { id },
  });

  if (!existingPreset) {
    return res.status(404).json({
      status: 'error',
      message: '预设不存在',
    });
  }

  const isAdmin = req.user.role === 'admin';
  const isOwner = existingPreset.userId === req.user.id;
  const isSystemPreset = existingPreset.userId === 'system';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      status: 'error',
      message: '无权限修改此预设',
    });
  }

  if (!name || !prompt) {
    return res.status(400).json({
      status: 'error',
      message: '名称和提示词不能为空',
    });
  }

  const targetUserId = isSystemPreset && isAdmin ? 'system' : existingPreset.userId;
  const targetType = type || existingPreset.type;

  if (isDefault) {
    await presetRepository.update(
      { userId: targetUserId, type: targetType, isDefault: true },
      { isDefault: false }
    );
  }

  existingPreset.name = name;
  existingPreset.prompt = prompt;
  existingPreset.description = description || existingPreset.description;
  existingPreset.type = targetType;
  existingPreset.isDefault = isDefault || false;

  await presetRepository.save(existingPreset);

  res.json({
    status: 'success',
    data: {
      preset: {
        id: existingPreset.id,
        name: existingPreset.name,
        prompt: existingPreset.prompt,
        isDefault: existingPreset.isDefault,
        createdAt: existingPreset.createdAt,
        updatedAt: existingPreset.updatedAt,
      },
    },
  });
};

export const deletePreset = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: '需要登录',
    });
  }

  const { id } = req.params;

  const preset = await presetRepository.findOne({
    where: { id },
  });

  if (!preset) {
    return res.status(404).json({
      status: 'error',
      message: '预设不存在',
    });
  }

  const isAdmin = req.user.role === 'admin';
  const isOwner = preset.userId === req.user.id;
  const isSystemPreset = preset.userId === 'system';

  if (!isOwner && (!isAdmin || !isSystemPreset)) {
    return res.status(403).json({
      status: 'error',
      message: '无权限删除此预设',
    });
  }

  if (preset.isDefault) {
    return res.status(400).json({
      status: 'error',
      message: '不能删除默认预设',
    });
  }

  await presetRepository.remove(preset);

  res.json({
    status: 'success',
    message: '预设已删除',
  });
};

export const setDefaultPreset = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: '需要登录',
    });
  }

  const { id } = req.params;

  const preset = await presetRepository.findOne({
    where: { id },
  });

  if (!preset) {
    return res.status(404).json({
      status: 'error',
      message: '预设不存在',
    });
  }

  const isAdmin = req.user.role === 'admin';
  const isOwner = preset.userId === req.user.id;
  const isSystemPreset = preset.userId === 'system';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      status: 'error',
      message: '无权限设置此预设为默认',
    });
  }

  const targetUserId = isSystemPreset ? 'system' : req.user.id;

  await presetRepository.update(
    { userId: targetUserId, type: preset.type, isDefault: true },
    { isDefault: false }
  );

  preset.isDefault = true;
  await presetRepository.save(preset);

  res.json({
    status: 'success',
    message: '默认预设已更新',
  });
};

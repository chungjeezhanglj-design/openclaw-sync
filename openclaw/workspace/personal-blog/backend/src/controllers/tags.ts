import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AppDataSource } from '../config/data-source';
import { Tag } from '../models/Tag';
import { AppError } from '../middlewares/errorHandler';

const tagRepository = AppDataSource.getRepository(Tag);

// 获取所有标签
export const getTags = async (req: Request, res: Response) => {
  const tags = await tagRepository.find({
    order: { postCount: 'DESC' },
  });

  res.json({
    status: 'success',
    data: {
      tags: tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        description: tag.description,
        postCount: tag.postCount,
      })),
    },
  });
};

// 创建标签
export const createTag = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'error', errors: errors.array() });
  }

  const { name, description } = req.body;

  // 生成slug
  const slug = name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');

  // 检查是否已存在
  const existingTag = await tagRepository.findOne({ where: { slug } });
  if (existingTag) {
    throw new AppError('Tag already exists', 400);
  }

  const tag = tagRepository.create({
    name,
    slug,
    description,
    postCount: 0,
  });

  await tagRepository.save(tag);

  res.status(201).json({
    status: 'success',
    data: { tag },
  });
};

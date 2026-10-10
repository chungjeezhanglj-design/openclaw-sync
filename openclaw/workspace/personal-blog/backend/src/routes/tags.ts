import { Router } from 'express';
import { getTags, createTag } from '../controllers/tags';
import { authenticate } from '../middlewares/auth';

const router = Router();

// 获取所有标签
router.get('/', getTags);

// 创建标签（需要认证）
router.post('/', authenticate, createTag);

export { router as tagsRouter };

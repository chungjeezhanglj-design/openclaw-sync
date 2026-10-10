import { Router } from 'express';
import { body } from 'express-validator';
import { parseSearch, searchPhotos } from '../controllers/search';

const router = Router();

router.post(
  '/parse',
  [
    body('query').isString().notEmpty().withMessage('搜索关键词不能为空'),
  ],
  parseSearch
);

router.post(
  '/photos',
  [
    body('query').optional().isString(),
    body('intent').optional().isObject(),
  ],
  searchPhotos
);

export default router;

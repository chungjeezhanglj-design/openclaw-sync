import { Router } from 'express';
import { body } from 'express-validator';
import { getComments, createComment, deleteComment, togglePinComment, approveComment, approveAllComments } from '../controllers/comments';
import { authenticate } from '../middlewares/auth';
import { recordOperationLog } from '../middlewares/recordOperationLog';

const router = Router();

// 获取文章的评论
router.get('/post/:postId', getComments);

// 发表评论（需要认证）
router.post(
  '/post/:postId',
  authenticate,
  [
    body('content').trim().isLength({ min: 1, max: 1000 }),
    body('parentId').optional(),
  ],
  recordOperationLog({
    action: 'COMMENT_CREATE',
    module: 'COMMENT',
  }),
  createComment
);

// 删除评论（需要认证）
router.delete(
  '/:id',
  authenticate,
  recordOperationLog({
    action: 'COMMENT_DELETE',
    module: 'COMMENT',
  }),
  deleteComment
);

// 置顶/取消置顶评论（需要认证，文章作者）
router.post(
  '/:id/pin',
  authenticate,
  recordOperationLog({
    action: 'COMMENT_PIN',
    module: 'COMMENT',
  }),
  togglePinComment
);

// 审核评论（需要认证，文章作者）
router.post(
  '/:id/approve',
  authenticate,
  recordOperationLog({
    action: 'COMMENT_APPROVE',
    module: 'COMMENT',
  }),
  approveComment
);

// 一键审核所有评论（需要认证，文章作者）
router.post(
  '/approve-all',
  authenticate,
  recordOperationLog({
    action: 'COMMENT_APPROVE_ALL',
    module: 'COMMENT',
  }),
  approveAllComments
);

export { router as commentsRouter };

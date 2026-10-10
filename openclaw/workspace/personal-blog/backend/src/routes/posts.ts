import { Router } from 'express';
import { body, query } from 'express-validator';
import { createPost, getPosts, getPost, updatePost, deletePost, publishPost, likePost, checkLiked, getMyPosts, unapproveAllComments, togglePostStatus, getAllPosts } from '../controllers/posts';
import { authenticate } from '../middlewares/auth';
import { isAdmin, isEditor } from '../middlewares/authorize';
import { recordOperationLog } from '../middlewares/recordOperationLog';

const router = Router();

// 公开路由
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('status').optional().isIn(['draft', 'published', 'archived']),
    query('tag').optional(),
    query('layout').optional().isIn(['timeline', 'grid', 'masonry', 'map']),
  ],
  getPosts
);

// 管理员获取所有文章（需放在 /:id 前面）
router.get('/all', authenticate, isAdmin, getAllPosts);

router.get('/user/me', authenticate, getMyPosts);

router.get('/:id', getPost);

// 需要编辑权限的路由（创建、更新、发布文章）
router.post(
  '/',
  authenticate,
  isEditor,
  [
    body('title').trim().isLength({ min: 1, max: 200 }),
    body('content').optional(),
    body('layoutType').optional().isIn(['timeline', 'grid', 'masonry', 'map']),
    body('status').optional().isIn(['draft', 'published', 'archived']),
    body('tagIds').optional().isArray(),
  ],
  recordOperationLog({
    action: 'POST_CREATE',
    module: 'POST',
    getMessage: (req) => `创建文章：${req.body.title}`,
  }),
  createPost
);

router.put(
  '/:id',
  authenticate,
  isEditor,
  [
    body('title').optional().trim().isLength({ min: 1, max: 200 }),
    body('content').optional(),
    body('layoutType').optional().isIn(['timeline', 'grid', 'masonry', 'map']),
    body('status').optional().isIn(['draft', 'published', 'archived']),
    body('tagIds').optional().isArray(),
  ],
  recordOperationLog({
    action: 'POST_UPDATE',
    module: 'POST',
  }),
  updatePost
);

router.delete(
  '/:id',
  authenticate,
  isEditor,
  recordOperationLog({
    action: 'POST_DELETE',
    module: 'POST',
  }),
  deletePost
);
router.post(
  '/:id/publish',
  authenticate,
  isEditor,
  recordOperationLog({
    action: 'POST_PUBLISH',
    module: 'POST',
  }),
  publishPost
);
router.put(
  '/:id/status',
  authenticate,
  isAdmin,
  recordOperationLog({
    action: 'POST_STATUS_CHANGE',
    module: 'POST',
  }),
  togglePostStatus
);
router.post(
  '/:id/like',
  authenticate,
  recordOperationLog({
    action: 'POST_LIKE',
    module: 'POST',
  }),
  likePost
);
router.get('/:id/liked', authenticate, checkLiked);
router.post(
  '/:postId/unapprove-all',
  authenticate,
  isAdmin,
  recordOperationLog({
    action: 'COMMENT_UNAPPROVE_ALL',
    module: 'COMMENT',
  }),
  unapproveAllComments
);

export { router as postsRouter };

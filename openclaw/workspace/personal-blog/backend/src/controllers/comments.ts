import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AppDataSource } from '../config/data-source';
import { Comment } from '../models/Comment';
import { Post } from '../models/Post';
import { AppError } from '../middlewares/errorHandler';

const commentRepository = AppDataSource.getRepository(Comment);
const postRepository = AppDataSource.getRepository(Post);

// 获取文章的评论
export const getComments = async (req: Request, res: Response) => {
  const { postId } = req.params;

  const post = await postRepository.findOne({ where: { id: postId } });
  if (!post) {
    throw new AppError('Post not found', 404);
  }

  const comments = await commentRepository.find({
    where: { postId, parentId: null as any },
    relations: ['user', 'replies', 'replies.user'],
    order: { createdAt: 'DESC' },
  });

  res.json({
    status: 'success',
    data: {
      comments: comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        user: {
          id: comment.user.id,
          nickname: comment.user.nickname,
          avatar: comment.user.avatar,
        },
        replies: comment.replies?.map(reply => ({
          id: reply.id,
          content: reply.content,
          createdAt: reply.createdAt,
          user: {
            id: reply.user.id,
            nickname: reply.user.nickname,
            avatar: reply.user.avatar,
          },
        })) || [],
      })),
    },
  });
};

// 发表评论
export const createComment = async (req: any, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'error', errors: errors.array() });
  }

  const { postId } = req.params;
  const { content, parentId } = req.body;
  const userId = req.user.id;

  const post = await postRepository.findOne({ where: { id: postId } });
  if (!post) {
    throw new AppError('Post not found', 404);
  }

  const comment = commentRepository.create({
    postId,
    userId,
    content,
    parentId: parentId || null,
  });

  await commentRepository.save(comment);

  // 更新文章评论数
  post.commentCount += 1;
  await postRepository.save(post);

  res.status(201).json({
    status: 'success',
    data: {
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        user: {
          id: req.user.id,
          nickname: req.user.nickname,
          avatar: req.user.avatar,
        },
      },
    },
  });
};

// 删除评论
export const deleteComment = async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  const comment = await commentRepository.findOne({ 
    where: { id },
    relations: ['post'],
  });

  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  // 检查权限（评论作者、文章作者或 admin 可以删除）
  if (comment.userId !== userId && comment.post.userId !== userId && userRole !== 'admin') {
    throw new AppError('Not authorized', 403);
  }

  await commentRepository.remove(comment);

  // 更新文章评论数
  const post = await postRepository.findOne({ where: { id: comment.postId } });
  if (post && post.commentCount > 0) {
    post.commentCount -= 1;
    await postRepository.save(post);
  }

  res.json({
    status: 'success',
    message: 'Comment deleted successfully',
  });
};

// 置顶/取消置顶评论
export const togglePinComment = async (req: any, res: Response) => {
  const { id } = req.params;
  const { postId } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  const post = await postRepository.findOne({ where: { id: postId } });
  if (!post) {
    throw new AppError('Post not found', 404);
  }

  // 检查是否是文章作者或 admin
  if (post.userId !== userId && userRole !== 'admin') {
    throw new AppError('Only post author can pin comments', 403);
  }

  const comment = await commentRepository.findOne({ where: { id } });
  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  // 取消该文章的其他置顶评论
  if (!comment.pinned) {
    await commentRepository.update({ postId, pinned: true }, { pinned: false });
  }

  // 切换置顶状态
  comment.pinned = !comment.pinned;
  await commentRepository.save(comment);

  res.json({
    status: 'success',
    data: { pinned: comment.pinned },
  });
};

// 审核评论
export const approveComment = async (req: any, res: Response) => {
  const { id } = req.params;
  const { postId } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  const post = await postRepository.findOne({ where: { id: postId } });
  if (!post) {
    throw new AppError('Post not found', 404);
  }

  // 检查是否是文章作者或 admin
  if (post.userId !== userId && userRole !== 'admin') {
    throw new AppError('Only post author can approve comments', 403);
  }

  const comment = await commentRepository.findOne({ where: { id } });
  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  // 切换审核状态
  comment.approved = !comment.approved;
  await commentRepository.save(comment);

  res.json({
    status: 'success',
    data: { approved: comment.approved },
  });
};

// 一键审核所有未审核评论
export const approveAllComments = async (req: any, res: Response) => {
  const { postId } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  const post = await postRepository.findOne({ where: { id: postId } });
  if (!post) {
    throw new AppError('Post not found', 404);
  }

  // 检查是否是文章作者或 admin
  if (post.userId !== userId && userRole !== 'admin') {
    throw new AppError('Only post author can approve comments', 403);
  }

  await commentRepository.update({ postId, approved: false }, { approved: true });

  res.json({
    status: 'success',
    message: 'All comments approved',
  });
};

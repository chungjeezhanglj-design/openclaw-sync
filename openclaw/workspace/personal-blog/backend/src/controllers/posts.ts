import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/data-source';
import { Post } from '../models/Post';
import { Tag } from '../models/Tag';
import { Photo } from '../models/Photo';
import { Like } from '../models/Like';
import { Comment } from '../models/Comment';
import { Follow } from '../models/Follow';
import { AppError } from '../middlewares/errorHandler';

const postRepository = AppDataSource.getRepository(Post);
const tagRepository = AppDataSource.getRepository(Tag);
const photoRepository = AppDataSource.getRepository(Photo);
const likeRepository = AppDataSource.getRepository(Like);
const commentRepository = AppDataSource.getRepository(Comment);
const followRepository = AppDataSource.getRepository(Follow);

// 可选认证：解析用户ID（如果token存在）
const getOptionalUserId = (req: Request): string | undefined => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      return decoded.userId;
    }
  } catch (error) {
    // token 无效时忽略
  }
  return undefined;
};

// 创建文章
export const createPost = async (req: any, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'error', errors: errors.array() });
  }

  const { title, content, layoutType, status, tagIds, photoIds, visibility } = req.body;
  const userId = req.user.id;

  const post = postRepository.create({
    userId,
    title,
    content,
    layoutType: layoutType || 'timeline',
    status: status || 'draft',
    visibility: visibility || 'public',
  });

  if (tagIds && tagIds.length > 0) {
    const tags = await tagRepository.findByIds(tagIds);
    post.tags = tags;
  }

  await postRepository.save(post);

  if (photoIds && photoIds.length > 0) {
    await photoRepository.update(photoIds, { postId: post.id });
  }

  res.status(201).json({
    status: 'success',
    data: { post },
  });
};

// 获取文章列表
export const getPosts = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string;
  const tag = req.query.tag as string;
  const layout = req.query.layout as string;
  const sortBy = req.query.sortBy as string || 'createdAt';
  const order = req.query.order as string || 'DESC';
  const userId = req.query.userId as string | undefined;
  const currentUserId = getOptionalUserId(req);

  const orderDirection = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const queryBuilder = postRepository
    .createQueryBuilder('post')
    .leftJoinAndSelect('post.user', 'user')
    .leftJoinAndSelect('post.tags', 'tags')
    .leftJoinAndSelect('post.photos', 'photos')
    .leftJoinAndSelect('post.comments', 'comments')
    .leftJoinAndSelect('comments.user', 'commentUser')
    .orderBy('post.createdAt', orderDirection)
    .addOrderBy('post.id', 'DESC')
    .skip((page - 1) * limit)
    .take(limit);

  if (status) {
    queryBuilder.andWhere('post.status = :status', { status });
  } else {
    queryBuilder.andWhere('post.status = :status', { status: 'published' });
  }

  if (layout) {
    queryBuilder.andWhere('post.layoutType = :layout', { layout });
  }

  if (tag) {
    queryBuilder.andWhere('tags.slug = :tag', { tag });
  }

  // Filter by user ID if provided
  if (userId) {
    queryBuilder.andWhere('post.userId = :userId', { userId });
  }

  // Filter by visibility
  if (currentUserId) {
    // Get friend IDs and follower IDs first
    const friendRepo = AppDataSource.getRepository(Follow);
    const friendships = await friendRepo
      .createQueryBuilder('f')
      .where('f.followerId = :userId', { userId: currentUserId })
      .orWhere('f.followingId = :userId', { userId: currentUserId })
      .getMany();
    
    const friendIds = new Set<string>();
    const followerIds = new Set<string>();
    
    for (const f of friendships) {
      if (f.followerId === currentUserId) {
        followerIds.add(f.followingId);
        // Check if mutual follow (friend)
        const isMutual = friendships.some(fr => fr.followerId === f.followingId && fr.followingId === currentUserId);
        if (isMutual) {
          friendIds.add(f.followingId);
        }
      } else if (f.followingId === currentUserId) {
        // Someone is following current user
        followerIds.add(f.followerId);
      }
    }
    
    const friendIdArray = Array.from(friendIds);
    const followerIdArray = Array.from(followerIds);
    
    // Build visibility condition based on what relationships exist
    const conditions: string[] = ["post.visibility = 'public'"];
    const params: any = { currentUserId };
    
    // Always include author's own posts
    conditions.push('post.userId = :currentUserId');
    
    // Add friends condition if there are friends
    if (friendIdArray.length > 0) {
      conditions.push("(post.visibility = 'friends' AND post.userId IN (:...friendIds))");
      params.friendIds = friendIdArray;
    }
    
    // Add followers condition if there are followers (who aren't already friends)
    if (followerIdArray.length > 0) {
      conditions.push("(post.visibility = 'followers' AND post.userId IN (:...followerIds))");
      params.followerIds = followerIdArray;
    }
    
    queryBuilder.andWhere(`(${conditions.join(' OR ')})`, params);
  } else {
    // Not logged in: only show public posts
    queryBuilder.andWhere('post.visibility = :visibility', { visibility: 'public' });
  }

  const [posts, total] = await queryBuilder.getManyAndCount();

  const postsWithLiked = await Promise.all(posts.map(async (post) => {
    const userId = getOptionalUserId(req);
    let liked = false;
    let isFollowing = false;
    let isFriend = false;
    if (userId) {
      const existingLike = await likeRepository.findOne({
        where: { postId: post.id, userId },
      });
      liked = !!existingLike;
      // Check follow status if viewing another user's post
      if (post.user && userId !== post.user.id) {
        const follow = await followRepository.findOne({
          where: { followerId: userId, followingId: post.user.id },
        });
        isFollowing = !!follow;
        // Check if mutual follow (friend)
        if (isFollowing) {
          const reverseFollow = await followRepository.findOne({
            where: { followerId: post.user.id, followingId: userId },
          });
          isFriend = !!reverseFollow;
        }
      }
    }
    const pinnedComment = post.comments.find(c => c.pinned && c.approved !== false);
    const regularComments = post.comments.filter(c => !c.pinned && c.approved !== false);
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      layoutType: post.layoutType,
      status: post.status,
      viewCount: post.viewCount,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      createdAt: post.createdAt,
       liked,
       isFollowing,
       isFriend,
       user: {
         id: post.user.id,
         nickname: post.user.nickname,
         avatar: post.user.avatar,
       },
       tags: post.tags.map(tag => ({
         id: tag.id,
         name: tag.name,
         slug: tag.slug,
       })),
       photos: post.photos.map(photo => ({
         id: photo.id,
         url: photo.url,
         caption: photo.caption,
         gpsLat: photo.gpsLat,
         gpsLng: photo.gpsLng,
         takenAt: photo.takenAt ? photo.takenAt.toISOString() : null,
         locationName: photo.locationName,
         deviceName: photo.deviceName,
       })),
       pinnedComment: pinnedComment ? {
        id: pinnedComment.id,
        content: pinnedComment.content,
        createdAt: pinnedComment.createdAt,
        pinned: true,
        user: {
          id: pinnedComment.commentUser?.id || pinnedComment.user?.id || '',
          nickname: pinnedComment.commentUser?.nickname || pinnedComment.user?.nickname || '未知用户',
          avatar: pinnedComment.commentUser?.avatar || pinnedComment.user?.avatar,
        },
      } : null,
      comments: regularComments.slice(0, 1).map(comment => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        user: {
          id: comment.commentUser?.id || comment.user?.id || '',
          nickname: comment.commentUser?.nickname || comment.user?.nickname || '未知用户',
          avatar: comment.commentUser?.avatar || comment.user?.avatar,
        },
      })),
    };
  }));

  res.json({
    status: 'success',
    data: {
      posts: postsWithLiked,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
};

// 获取单篇文章
export const getPost = async (req: Request, res: Response) => {
  const { id } = req.params;

  const post = await postRepository.findOne({
    where: { id },
    relations: ['user', 'tags', 'photos', 'comments', 'comments.user'],
  });

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  // 增加浏览量
  post.viewCount += 1;
  await postRepository.save(post);

  res.json({
    status: 'success',
    data: {
      post: {
        id: post.id,
        title: post.title,
        content: post.content,
        layoutType: post.layoutType,
        status: post.status,
        viewCount: post.viewCount,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        user: {
          id: post.user.id,
          nickname: post.user.nickname,
          avatar: post.user.avatar,
        },
        tags: post.tags.map(tag => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
        })),
        photos: post.photos.map(photo => {
          const photoData = {
            id: photo.id,
            url: photo.url,
            caption: photo.caption,
            aiConfidence: photo.aiConfidence,
            gpsLat: photo.gpsLat,
            gpsLng: photo.gpsLng,
            takenAt: photo.takenAt ? photo.takenAt.toISOString() : null,
            locationName: photo.locationName,
            deviceName: photo.deviceName,
          };
          console.log('Returning photo data:', JSON.stringify(photoData));
          return photoData;
        }),
        pinnedComment: post.comments.find(c => c.pinned && c.approved !== false) ? {
          id: post.comments.find(c => c.pinned && c.approved !== false)!.id,
          content: post.comments.find(c => c.pinned && c.approved !== false)!.content,
          createdAt: post.comments.find(c => c.pinned && c.approved !== false)!.createdAt,
          pinned: true,
          approved: post.comments.find(c => c.pinned && c.approved !== false)!.approved,
          user: {
            id: post.comments.find(c => c.pinned && c.approved !== false)!.user.id,
            nickname: post.comments.find(c => c.pinned && c.approved !== false)!.user.nickname,
            avatar: post.comments.find(c => c.pinned && c.approved !== false)!.user.avatar,
          },
        } : null,
        comments: post.comments
          .filter(c => !c.pinned)
          .map(comment => ({
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            pinned: comment.pinned,
            approved: comment.approved,
            user: {
              id: comment.user.id,
              nickname: comment.user.nickname,
              avatar: comment.user.avatar,
            },
          })),
      },
    },
  });
};

// 更新文章
export const updatePost = async (req: any, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'error', errors: errors.array() });
  }

  const { id } = req.params;
  const { title, content, layoutType, status, tagIds, photoIds, visibility } = req.body;
  const userId = req.user.id;

  const post = await postRepository.findOne({
    where: { id },
    relations: ['tags'],
  });

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  if (post.userId !== userId) {
    throw new AppError('Not authorized to update this post', 403);
  }

  if (title) post.title = title;
  if (content !== undefined) post.content = content;
  if (layoutType) post.layoutType = layoutType;
  if (status) post.status = status;
  if (visibility) post.visibility = visibility;

  // 更新标签
  if (tagIds) {
    const tags = await tagRepository.findByIds(tagIds);
    post.tags = tags;
  }

  // 更新照片关联
  if (photoIds !== undefined) {
    // 先解除该文章所有照片的关联
    await photoRepository.update({ postId: id }, { postId: null });
    // 关联新照片
    if (photoIds && photoIds.length > 0) {
      await photoRepository.update(photoIds, { postId: id });
    }
  }

  await postRepository.save(post);

  res.json({
    status: 'success',
    data: { post },
  });
};

// 删除文章
export const deletePost = async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  const post = await postRepository.findOne({ where: { id } });

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  // admin 可以删除任何文章，作者只能删除自己的文章
  if (post.userId !== userId && userRole !== 'admin') {
    throw new AppError('Not authorized to delete this post', 403);
  }

  // 删除关联的评论
  await AppDataSource.createQueryBuilder()
    .delete()
    .from(Comment)
    .where('postId = :postId', { postId: id })
    .execute();

  // 删除关联的点赞
  await AppDataSource.createQueryBuilder()
    .delete()
    .from(Like)
    .where('postId = :postId', { postId: id })
    .execute();

  // 删除关联的照片
  await AppDataSource.createQueryBuilder()
    .delete()
    .from(Photo)
    .where('postId = :postId', { postId: id })
    .execute();

  await postRepository.remove(post);

  res.json({
    status: 'success',
    message: 'Post deleted successfully',
  });
};

// 发布/取消发布文章
export const publishPost = async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;

  const post = await postRepository.findOne({ where: { id } });

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  if (post.userId !== userId) {
    throw new AppError('Not authorized', 403);
  }

  // 切换状态
  post.status = post.status === 'published' ? 'draft' : 'published';
  await postRepository.save(post);

  res.json({
    status: 'success',
    data: {
      post: {
        id: post.id,
        status: post.status,
      },
    },
  });
};

// 管理员下架/上架文章
export const togglePostStatus = async (req: any, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const userRole = req.user.role;

  if (userRole !== 'admin') {
    throw new AppError('Only admin can toggle post status', 403);
  }

  const post = await postRepository.findOne({ where: { id } });

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  if (!['draft', 'published', 'archived'].includes(status)) {
    throw new AppError('Invalid status', 400);
  }

  post.status = status;
  await postRepository.save(post);

  res.json({
    status: 'success',
    data: {
      post: {
        id: post.id,
        status: post.status,
      },
    },
  });
};

// 点赞文章
export const likePost = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await postRepository.findOne({ where: { id } });

    if (!post) {
      throw new AppError('Post not found', 404);
    }

    // 检查是否已点赞
    const existingLike = await likeRepository.findOne({
      where: { postId: id, userId },
    });

    if (existingLike) {
      // 已点赞，取消点赞
      await likeRepository.remove(existingLike);
      post.likeCount = Math.max(0, post.likeCount - 1);
      await postRepository.save(post);

      res.json({
        status: 'success',
        data: { liked: false, likeCount: post.likeCount },
      });
    } else {
      // 未点赞，添加点赞
      const like = likeRepository.create({
        postId: id,
        userId,
      });
      await likeRepository.save(like);

      post.likeCount += 1;
      await postRepository.save(post);

      res.json({
        status: 'success',
        data: { liked: true, likeCount: post.likeCount },
      });
    }
  } catch (error: any) {
    console.error('点赞错误:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || '点赞失败',
    });
  }
};

// 检查用户是否已点赞
export const checkLiked = async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.json({
      status: 'success',
      data: { liked: false },
    });
  }

  const existingLike = await likeRepository.findOne({
    where: { postId: id, userId },
  });

  res.json({
    status: 'success',
    data: { liked: !!existingLike },
  });
};

// 获取所有博客（管理员用）
export const getAllPosts = async (req: any, res: Response) => {
  if (req.user.role !== 'admin') {
    throw new AppError('Only admin can view all posts', 403);
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;
  const visibility = req.query.visibility as string;
  const userId = req.query.userId as string;

  const queryBuilder = postRepository
    .createQueryBuilder('post')
    .leftJoinAndSelect('post.user', 'user')
    .leftJoinAndSelect('post.tags', 'tags')
    .leftJoinAndSelect('post.photos', 'photos')
    .orderBy('post.createdAt', 'DESC')
    .skip((page - 1) * limit)
    .take(limit);

  if (status) {
    queryBuilder.andWhere('post.status = :status', { status });
  }

  if (visibility) {
    queryBuilder.andWhere('post.visibility = :visibility', { visibility });
  }

  if (userId) {
    queryBuilder.andWhere('post.userId = :userId', { userId });
  }

  const [posts, total] = await queryBuilder.getManyAndCount();

  res.json({
    status: 'success',
    data: {
      posts: posts.map(post => ({
        id: post.id,
        title: post.title,
        content: post.content,
        layoutType: post.layoutType,
        status: post.status,
        visibility: post.visibility,
        viewCount: post.viewCount,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        createdAt: post.createdAt,
        user: {
          id: post.user.id,
          nickname: post.user.nickname,
          avatar: post.user.avatar,
        },
        tags: post.tags.map(tag => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
        })),
        photos: post.photos.map(photo => ({
          id: photo.id,
          url: photo.url,
          caption: photo.caption,
        })),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
};

// 获取当前用户的所有博客（包括草稿）
export const getMyPosts = async (req: any, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 100;
  const status = req.query.status as string;
  const userId = req.user.id;

  const queryBuilder = postRepository
    .createQueryBuilder('post')
    .leftJoinAndSelect('post.user', 'user')
    .leftJoinAndSelect('post.tags', 'tags')
    .leftJoinAndSelect('post.photos', 'photos')
    .leftJoinAndSelect('post.comments', 'comments')
    .leftJoinAndSelect('comments.user', 'commentUser')
    .where('post.userId = :userId', { userId })
    .orderBy('post.createdAt', 'DESC')
    .skip((page - 1) * limit)
    .take(limit);

  if (status) {
    queryBuilder.andWhere('post.status = :status', { status });
  }

  const [posts, total] = await queryBuilder.getManyAndCount();

  const postsWithLiked = await Promise.all(posts.map(async (post) => {
    const existingLike = await likeRepository.findOne({
      where: { postId: post.id, userId },
    });
    const pinnedComment = post.comments.find(c => c.pinned);
    const regularComments = post.comments.filter(c => !c.pinned);
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      layoutType: post.layoutType,
      status: post.status,
      viewCount: post.viewCount,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      createdAt: post.createdAt,
      liked: !!existingLike,
      user: {
        id: post.user.id,
        nickname: post.user.nickname,
        avatar: post.user.avatar,
      },
       tags: post.tags.map(tag => ({
         id: tag.id,
         name: tag.name,
         slug: tag.slug,
       })),
       photos: post.photos.map(photo => ({
         id: photo.id,
         url: photo.url,
         caption: photo.caption,
         gpsLat: photo.gpsLat,
         gpsLng: photo.gpsLng,
         takenAt: photo.takenAt ? photo.takenAt.toISOString() : null,
         locationName: photo.locationName,
         deviceName: photo.deviceName,
       })),
       pinnedComment: pinnedComment ? {
         id: pinnedComment.id,
        content: pinnedComment.content,
        createdAt: pinnedComment.createdAt,
        pinned: true,
        user: {
          id: pinnedComment.commentUser?.id || pinnedComment.user?.id || '',
          nickname: pinnedComment.commentUser?.nickname || pinnedComment.user?.nickname || '未知用户',
          avatar: pinnedComment.commentUser?.avatar || pinnedComment.user?.avatar,
        },
      } : null,
      comments: regularComments.slice(0, 1).map(comment => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        user: {
          id: comment.commentUser?.id || comment.user?.id || '',
          nickname: comment.commentUser?.nickname || comment.user?.nickname || '未知用户',
          avatar: comment.commentUser?.avatar || comment.user?.avatar,
        },
      })),
    };
  }));

  res.json({
    status: 'success',
    data: {
      posts: postsWithLiked,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
};

// 取消审核所有评论
export const unapproveAllComments = async (req: any, res: Response) => {
  const { postId } = req.params;
  const userId = req.user.id;

  const post = await postRepository.findOne({ where: { id: postId } });
  if (!post) {
    throw new AppError('Post not found', 404);
  }

  if (post.userId !== userId) {
    throw new AppError('Only post author can unapprove comments', 403);
  }

  await commentRepository.update({ postId, pinned: false }, { approved: false });

  res.json({
    status: 'success',
    message: 'All comments unapproved',
  });
};

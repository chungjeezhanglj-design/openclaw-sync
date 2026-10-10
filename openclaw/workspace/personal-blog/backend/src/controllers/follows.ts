import { Response } from 'express';
import { AppDataSource } from '../config/data-source';
import { User } from '../models/User';
import { Follow } from '../models/Follow';
import { AuthRequest } from '../middlewares/auth';
import { Like, In } from 'typeorm';

const userRepository = AppDataSource.getRepository(User);
const followRepository = AppDataSource.getRepository(Follow);

export const followUser = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: '需要登录',
    });
  }

  const targetUserId = req.params.id;
  const currentUserId = req.user.id;

  if (targetUserId === currentUserId) {
    return res.status(400).json({
      status: 'error',
      message: '不能关注自己',
    });
  }

  const targetUser = await userRepository.findOne({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    return res.status(404).json({
      status: 'error',
      message: '用户不存在',
    });
  }

  const existing = await followRepository.findOne({
    where: { followerId: currentUserId, followingId: targetUserId },
  });

  if (existing) {
    return res.status(400).json({
      status: 'error',
      message: '已经关注了该用户',
    });
  }

  await followRepository.save({
    followerId: currentUserId,
    followingId: targetUserId,
  });

  const reverseFollow = await followRepository.findOne({
    where: { followerId: targetUserId, followingId: currentUserId },
  });

  res.json({
    status: 'success',
    data: {
      isFollowing: true,
      isFriend: !!reverseFollow,
    },
  });
};

export const unfollowUser = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: '需要登录',
    });
  }

  const targetUserId = req.params.id;
  const currentUserId = req.user.id;

  await followRepository.delete({
    followerId: currentUserId,
    followingId: targetUserId,
  });

  res.json({
    status: 'success',
    data: {
      isFollowing: false,
      isFriend: false,
    },
  });
};

export const getFollowers = async (req: AuthRequest, res: Response) => {
  const userId = req.params.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const followRecords = await followRepository.find({
    where: { followingId: userId },
    skip: (page - 1) * limit,
    take: limit,
    order: { createdAt: 'DESC' },
  });

  const followerIds = followRecords.map(f => f.followerId).filter(Boolean);
  
  const total = await followRepository.count({
    where: { followingId: userId },
  });

  let users: any[] = [];
  if (followerIds.length > 0) {
    const userRecords = await userRepository
      .createQueryBuilder('user')
      .where('user.id IN (:...ids)', { ids: followerIds })
      .getMany();
    
    const userMap = new Map(userRecords.map(u => [u.id, u]));
    users = followerIds
      .map(id => userMap.get(id))
      .filter((u): u is User => !!u)
      .map(u => ({
        id: u.id,
        nickname: u.nickname,
        avatar: u.avatar,
        bio: u.bio,
        createdAt: u.createdAt,
      }));
  }

  const currentUserId = req.user?.id;
  if (currentUserId) {
    const userIds = users.map((u) => u.id);
    const follows = await followRepository.find({
      where: { followerId: currentUserId, followingId: In(userIds) },
    });
    const followMap = new Map(follows.map((f) => [f.followingId, f]));
    const reverseFollows = await followRepository.find({
      where: { followerId: In(userIds), followingId: currentUserId },
    });
    const reverseMap = new Map(reverseFollows.map((f) => [f.followerId, f]));

    users.forEach((user) => {
      (user as any).isFollowing = followMap.has(user.id);
      (user as any).isFriend = followMap.has(user.id) && reverseMap.has(user.id);
    });
  }

  res.json({
    status: 'success',
    data: {
      users,
      pagination: { page, limit, total },
    },
  });
};

export const getFollowing = async (req: AuthRequest, res: Response) => {
  const userId = req.params.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const followRecords = await followRepository.find({
    where: { followerId: userId },
    skip: (page - 1) * limit,
    take: limit,
    order: { createdAt: 'DESC' },
  });

  const followingIds = followRecords.map(f => f.followingId).filter(Boolean);
  
  const total = await followRepository.count({
    where: { followerId: userId },
  });

  let users: any[] = [];
  if (followingIds.length > 0) {
    const userRecords = await userRepository
      .createQueryBuilder('user')
      .where('user.id IN (:...ids)', { ids: followingIds })
      .getMany();
    
    const userMap = new Map(userRecords.map(u => [u.id, u]));
    users = followingIds
      .map(id => userMap.get(id))
      .filter((u): u is User => !!u)
      .map(u => ({
        id: u.id,
        nickname: u.nickname,
        avatar: u.avatar,
        bio: u.bio,
        createdAt: u.createdAt,
      }));
  }

  const currentUserId = req.user?.id;
  if (currentUserId) {
    const userIds = users.map((u) => u.id);
    const follows = await followRepository.find({
      where: { followerId: currentUserId, followingId: In(userIds) },
    });
    const followMap = new Map(follows.map((f) => [f.followingId, f]));
    const reverseFollows = await followRepository.find({
      where: { followerId: In(userIds), followingId: currentUserId },
    });
    const reverseMap = new Map(reverseFollows.map((f) => [f.followerId, f]));

    users.forEach((user) => {
      (user as any).isFollowing = followMap.has(user.id);
      (user as any).isFriend = followMap.has(user.id) && reverseMap.has(user.id);
    });
  }

  res.json({
    status: 'success',
    data: {
      users,
      pagination: { page, limit, total },
    },
  });
};

export const getFriends = async (req: AuthRequest, res: Response) => {
  const userId = req.params.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const followRecords = await followRepository
    .createQueryBuilder('follow')
    .innerJoin(
      Follow,
      'f2',
      'f2.follower_id = follow.following_id AND f2.following_id = follow.follower_id'
    )
    .where('follow.followerId = :userId', { userId })
    .skip((page - 1) * limit)
    .take(limit)
    .getMany();

  const followingIds = followRecords.map(f => f.followingId).filter(Boolean);

  const total = await followRepository
    .createQueryBuilder('follow')
    .innerJoin(
      Follow,
      'f2',
      'f2.follower_id = follow.following_id AND f2.following_id = follow.follower_id'
    )
    .where('follow.followerId = :userId', { userId })
    .getCount();

  let users: any[] = [];
  if (followingIds.length > 0) {
    const userRecords = await userRepository
      .createQueryBuilder('user')
      .where('user.id IN (:...ids)', { ids: followingIds })
      .getMany();
    
    const userMap = new Map(userRecords.map(u => [u.id, u]));
    users = followingIds
      .map(id => userMap.get(id))
      .filter((u): u is User => !!u)
      .map(u => ({
        id: u.id,
        nickname: u.nickname,
        avatar: u.avatar,
        bio: u.bio,
        createdAt: u.createdAt,
      }));
  }

  const currentUserId = req.user?.id;
  if (currentUserId) {
    const userIds = users.map((u) => u.id);
    const follows = await followRepository.find({
      where: { followerId: currentUserId, followingId: In(userIds) },
    });
    const followMap = new Map(follows.map((f) => [f.followingId, f]));
    const reverseFollows = await followRepository.find({
      where: { followerId: In(userIds), followingId: currentUserId },
    });
    const reverseMap = new Map(reverseFollows.map((f) => [f.followerId, f]));

    users.forEach((user) => {
      (user as any).isFollowing = followMap.has(user.id);
      (user as any).isFriend = followMap.has(user.id) && reverseMap.has(user.id);
    });
  }

  res.json({
    status: 'success',
    data: {
      users,
      pagination: { page, limit, total },
    },
  });
};

export const getFollowStatus = async (req: AuthRequest, res: Response) => {
  const targetUserId = req.params.id;
  const currentUserId = req.user?.id;

  if (!currentUserId) {
    return res.json({
      status: 'success',
      data: { isFollowing: false, isFriend: false },
    });
  }

  const follow = await followRepository.findOne({
    where: { followerId: currentUserId, followingId: targetUserId },
  });

  const isFollowing = !!follow;

  let isFriend = false;
  if (isFollowing) {
    const reverseFollow = await followRepository.findOne({
      where: { followerId: targetUserId, followingId: currentUserId },
    });
    isFriend = !!reverseFollow;
  }

  res.json({
    status: 'success',
    data: { isFollowing, isFriend },
  });
};

export const getUserFollowCounts = async (req: AuthRequest, res: Response) => {
  const userId = req.params.id;

  const followingCount = await followRepository.count({
    where: { followerId: userId },
  });

  const followersCount = await followRepository.count({
    where: { followingId: userId },
  });

  const friendsCount = await followRepository
    .createQueryBuilder('follow')
    .innerJoin(
      Follow,
      'f2',
      'f2.follower_id = follow.following_id AND f2.following_id = follow.follower_id'
    )
    .where('follow.follower_id = :id', { id: userId })
    .getCount();

  res.json({
    status: 'success',
    data: {
      followingCount,
      followersCount,
      friendsCount,
    },
  });
};

export const searchUsers = async (req: AuthRequest, res: Response) => {
  const q = req.query.q as string;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  if (!q || q.length < 2) {
    return res.json({
      status: 'success',
      data: {
        users: [],
        pagination: { page: 1, limit: 20, total: 0 },
      },
    });
  }

  const [users, total] = await userRepository.findAndCount({
    where: [
      { nickname: Like(`%${q}%`) },
      { email: Like(`%${q}%`) },
    ],
    skip: (page - 1) * limit,
    take: limit,
    order: { createdAt: 'DESC' },
    select: ['id', 'nickname', 'avatar', 'bio', 'createdAt'],
  });

  const currentUserId = req.user?.id;

  if (currentUserId) {
    const userIds = users.map((u) => u.id);
    const follows = await followRepository.find({
      where: { followerId: currentUserId, followingId: In(userIds) },
    });
    const followMap = new Map(follows.map((f) => [f.followingId, f]));

    const reverseFollows = await followRepository.find({
      where: { followerId: In(userIds), followingId: currentUserId },
    });
    const reverseMap = new Map(reverseFollows.map((f) => [f.followerId, f]));

    users.forEach((user) => {
      (user as any).isFollowing = followMap.has(user.id);
      (user as any).isFriend =
        followMap.has(user.id) && reverseMap.has(user.id);
    });
  }

  res.json({
    status: 'success',
    data: {
      users,
      pagination: { page, limit, total },
    },
  });
};

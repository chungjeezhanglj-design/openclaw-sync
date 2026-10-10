import { Request, Response } from 'express';
import { AppDataSource } from '../config/data-source';
import { Photo } from '../models/Photo';
import { Post } from '../models/Post';
import { parseSearchIntent, SearchIntent } from '../services/searchIntent';

const photoRepository = AppDataSource.getRepository(Photo);
const postRepository = AppDataSource.getRepository(Post);

export const parseSearch = async (req: Request, res: Response) => {
  const { query } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: '请提供搜索关键词',
    });
  }

  try {
    const intent = await parseSearchIntent(query);

    res.json({
      status: 'success',
      data: {
        originalQuery: query,
        intent,
      },
    });
  } catch (error: any) {
    console.error('搜索解析错误:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || '搜索解析失败',
    });
  }
};

export const searchPhotos = async (req: Request, res: Response) => {
  const { query, intent } = req.body;

  let searchIntent: SearchIntent;

  if (intent) {
    searchIntent = intent;
  } else if (query) {
    searchIntent = await parseSearchIntent(query);
  } else {
    return res.status(400).json({
      status: 'error',
      message: '请提供搜索关键词或搜索条件',
    });
  }

  try {
    const { startDate, endDate, location, keywords } = searchIntent;

    const queryBuilder = photoRepository
      .createQueryBuilder('photo')
      .leftJoinAndSelect('photo.post', 'post')
      .where('photo.postId IS NOT NULL')
      .andWhere('post.status = :status', { status: 'published' });

    if (startDate && endDate) {
      queryBuilder.andWhere('photo.takenAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      queryBuilder.andWhere('photo.takenAt >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.andWhere('photo.takenAt <= :endDate', { endDate });
    }

    if (location) {
      queryBuilder.andWhere('photo.locationName LIKE :location', {
        location: `%${location}%`,
      });
    }

    if (keywords && keywords.length > 0) {
      const keywordConditions = keywords.map((_, index) => {
        return `(photo.caption LIKE :kw${index} OR photo.aiTags LIKE :kw${index} OR photo.locationName LIKE :kw${index})`;
      });
      queryBuilder.andWhere(`(${keywordConditions.join(' OR ')})`);

      keywords.forEach((kw, index) => {
        queryBuilder.setParameter(`kw${index}`, `%${kw}%`);
      });
    }

    queryBuilder.orderBy('photo.takenAt', 'DESC').take(100);

    const photos = await queryBuilder.getMany();

    const photosWithPost = photos.map((photo) => ({
      id: photo.id,
      url: photo.url,
      caption: photo.caption,
      locationName: photo.locationName,
      takenAt: photo.takenAt ? photo.takenAt.toISOString() : null,
      gpsLat: photo.gpsLat,
      gpsLng: photo.gpsLng,
      post: photo.post
        ? {
            id: photo.post.id,
            title: photo.post.title,
          }
        : null,
    }));

    res.json({
      status: 'success',
      data: {
        intent: searchIntent,
        photos: photosWithPost,
        total: photosWithPost.length,
      },
    });
  } catch (error: any) {
    console.error('搜索照片错误:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || '搜索失败',
    });
  }
};

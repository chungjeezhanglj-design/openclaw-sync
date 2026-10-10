import { Request, Response } from 'express';
import path from 'path';
import { AppDataSource } from '../config/data-source';
import { Photo } from '../models/Photo';
import { Post } from '../models/Post';
import { AiPromptPreset } from '../models/AiPromptPreset';
import { AppError } from '../middlewares/errorHandler';
import { AIServiceFactory } from '../services/ai/AIServiceFactory';

const photoRepository = AppDataSource.getRepository(Photo);
const postRepository = AppDataSource.getRepository(Post);

// 上传照片
export const uploadPhotos = async (req: any, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const { postId } = req.body;
    let exifDataList: any[] = [];
    try {
      exifDataList = req.body.exifDataList ? JSON.parse(req.body.exifDataList) : [];
    } catch (e) {
      console.log('解析EXIF数据失败');
    }

    console.log('[DEBUG] uploadPhotos - files:', files?.length, 'postId:', postId);

    if (!files || files.length === 0) {
      throw new AppError('No files uploaded', 400);
    }

  if (postId) {
    const post = await postRepository.findOne({ where: { id: postId, userId: req.user.id } });
    if (!post) {
      throw new AppError('Post not found', 404);
    }
  }

  const savedPhotos = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const clientExif = exifDataList[i];
    
    const photo = new Photo();
    if (postId) {
      photo.postId = postId;
    }
    photo.url = `/uploads/${file.filename}`;
    photo.order = 0;

    // 使用客户端 EXIF 数据（压缩前提取的）
    if (clientExif && Object.keys(clientExif).length > 0) {
      photo.gpsLat = clientExif.gpsLat ?? 0;
      photo.gpsLng = clientExif.gpsLng ?? 0;
      photo.gpsAltitude = clientExif.gpsAltitude ?? null;
      photo.gpsLatitudeRef = clientExif.gpsLatitudeRef ?? null;
      photo.gpsLongitudeRef = clientExif.gpsLongitudeRef ?? null;
      photo.locationName = clientExif.locationName ?? null;
      photo.deviceName = clientExif.deviceMake + ' ' + clientExif.deviceModel || clientExif.deviceName || null;
      photo.deviceMake = clientExif.deviceMake ?? null;
      photo.deviceModel = clientExif.deviceModel ?? null;
      photo.software = clientExif.software ?? null;
      photo.imageWidth = clientExif.imageWidth ?? null;
      photo.imageHeight = clientExif.imageHeight ?? null;
      photo.orientation = clientExif.orientation ?? null;
      photo.takenAt = clientExif.takenAt ? new Date(clientExif.takenAt) : null;
      photo.exposureTime = clientExif.exposureTime ?? null;
      photo.fNumber = clientExif.fNumber ?? null;
      photo.isoSpeed = clientExif.isoSpeed ?? null;
      photo.focalLength = clientExif.focalLength ?? null;
      photo.focalLength35mm = clientExif.focalLength35mm ?? null;
      photo.flash = clientExif.flash ?? null;
      photo.whiteBalance = clientExif.whiteBalance ?? null;
      photo.meteringMode = clientExif.meteringMode ?? null;
      photo.exposureMode = clientExif.exposureMode ?? null;
      photo.lensModel = clientExif.lensModel ?? null;
    }

    console.log('[DEBUG] saving photo:', photo);
    await photoRepository.save(photo);
    console.log('[DEBUG] photo saved successfully:', photo.id);

    savedPhotos.push(photo);
  }

  res.status(201).json({
    status: 'success',
    data: {
      photos: savedPhotos.map(p => ({
        id: p.id,
        url: p.url,
        caption: p.caption,
        gpsLat: p.gpsLat,
        gpsLng: p.gpsLng,
        createdAt: p.createdAt,
        deviceName: p.deviceName,
        deviceMake: p.deviceMake,
        deviceModel: p.deviceModel,
        software: p.software,
        imageWidth: p.imageWidth,
        imageHeight: p.imageHeight,
        orientation: p.orientation,
        takenAt: p.takenAt,
        exposureTime: p.exposureTime,
        fNumber: p.fNumber,
        isoSpeed: p.isoSpeed,
        focalLength: p.focalLength,
        focalLength35mm: p.focalLength35mm,
        flash: p.flash,
        whiteBalance: p.whiteBalance,
        meteringMode: p.meteringMode,
        exposureMode: p.exposureMode,
        lensModel: p.lensModel,
        gpsAltitude: p.gpsAltitude,
        gpsLatitudeRef: p.gpsLatitudeRef,
        gpsLongitudeRef: p.gpsLongitudeRef,
        locationName: p.locationName,
      })),
    },
  });
  } catch (error) {
    console.error('[ERROR] uploadPhotos failed:', error);
    throw error;
  }
};

// AI分析照片
export const analyzePhoto = async (req: any, res: Response) => {
  const { id } = req.params;
  const { prompt, presetId } = req.body;

  const photo = await photoRepository.findOne({ where: { id } });
  if (!photo) {
    throw new AppError('Photo not found', 404);
  }

  // 验证权限
  if (photo.postId) {
    const post = await postRepository.findOne({ where: { id: photo.postId } });
    if (post && post.userId !== req.user.id) {
      throw new AppError('Not authorized', 403);
    }
  }

  // 获取预设提示词
  let finalPrompt = prompt;
  if (presetId && !finalPrompt) {
    const presetRepo = AppDataSource.getRepository(AiPromptPreset);
    const preset = await presetRepo.findOne({ where: { id: presetId } });
    if (preset) {
      finalPrompt = preset.prompt;
    }
  }

  // 调用AI服务分析 - 使用本地文件路径
  const aiService = AIServiceFactory.create(process.env.AI_PROVIDER || 'mock');
  const imagePath = path.join(process.cwd(), photo.url);
  
  try {
    const result = await aiService.analyze(imagePath, prompt);

    photo.caption = result.caption;
    photo.aiTags = result.tags;
    photo.aiConfidence = result.confidence;
    photo.aiTitle = result.title || '';

    await photoRepository.save(photo);

    res.json({
      status: 'success',
      data: {
        photo: {
          id: photo.id,
          url: photo.url,
          caption: photo.caption,
          aiTags: photo.aiTags,
          aiConfidence: photo.aiConfidence,
          aiTitle: result.title || '',
        },
      },
    });
  } catch (error: any) {
    console.error('AI分析错误:', error);

    photo.caption = 'AI分析暂时不可用，请稍后重试或手动添加配文';
    photo.aiTags = ['AI分析失败'];
    photo.aiConfidence = 0;
    await photoRepository.save(photo);

    res.json({
      status: 'success',
      data: {
        photo: {
          id: photo.id,
          url: photo.url,
          caption: photo.caption,
          aiTags: photo.aiTags,
          aiConfidence: photo.aiConfidence,
        },
        error: {
          message: error.message || 'AI分析失败',
        },
      },
    });
  }
};

// 更新照片配文
export const updateCaption = async (req: any, res: Response) => {
  const { id } = req.params;
  const { caption } = req.body;

  const photo = await photoRepository.findOne({ where: { id } });
  if (!photo) {
    throw new AppError('Photo not found', 404);
  }

  // 验证权限
  if (photo.postId) {
    const post = await postRepository.findOne({ where: { id: photo.postId } });
    if (post && post.userId !== req.user.id) {
      throw new AppError('Not authorized', 403);
    }
  }

  photo.caption = caption;
  await photoRepository.save(photo);

  res.json({
    status: 'success',
    data: {
      photo: {
        id: photo.id,
        url: photo.url,
        caption: photo.caption,
      },
    },
  });
};

// 更新照片标签
export const updateTags = async (req: any, res: Response) => {
  const { id } = req.params;
  const { tags } = req.body;

  const photo = await photoRepository.findOne({ where: { id } });
  if (!photo) {
    throw new AppError('Photo not found', 404);
  }

  // 验证权限
  if (photo.postId) {
    const post = await postRepository.findOne({ where: { id: photo.postId } });
    if (post && post.userId !== req.user.id) {
      throw new AppError('Not authorized', 403);
    }
  }

  photo.aiTags = tags;
  await photoRepository.save(photo);

  res.json({
    status: 'success',
    data: {
      photo: {
        id: photo.id,
        url: photo.url,
        aiTags: photo.aiTags,
      },
    },
  });
};

// 获取带GPS的照片（地图模式用）
export const getPhotosForMap = async (req: Request, res: Response) => {
  const photos = await photoRepository
    .createQueryBuilder('photo')
    .leftJoinAndSelect('photo.post', 'post')
    .where('photo.gpsLat IS NOT NULL')
    .andWhere('photo.gpsLng IS NOT NULL')
    .andWhere('post.status = :status', { status: 'published' })
    .orderBy('photo.createdAt', 'DESC')
    .getMany();

  res.json({
    status: 'success',
    data: {
      photos: photos.map(photo => ({
        id: photo.id,
        url: photo.url,
        caption: photo.caption,
        gpsLat: photo.gpsLat,
        gpsLng: photo.gpsLng,
        takenAt: photo.takenAt,
        postId: photo.postId,
      })),
    },
  });
};

// 删除照片
export const deletePhoto = async (req: any, res: Response) => {
  const { id } = req.params;

  const photo = await photoRepository.findOne({ where: { id } });
  if (!photo) {
    throw new AppError('Photo not found', 404);
  }

  // 验证权限
  if (photo.postId) {
    const post = await postRepository.findOne({ where: { id: photo.postId } });
    if (post && post.userId !== req.user.id) {
      throw new AppError('Not authorized', 403);
    }
  }

  await photoRepository.remove(photo);

  res.json({
    status: 'success',
    message: 'Photo deleted successfully',
  });
};

// 批量更新照片EXIF数据
export const updatePhotosExif = async (req: any, res: Response) => {
  const { photos } = req.body;

  if (!photos || !Array.isArray(photos)) {
    throw new AppError('Invalid photos data', 400);
  }

  for (const photoData of photos) {
    const photo = await photoRepository.findOne({ where: { id: photoData.id } });
    if (photo) {
      if (photoData.gpsLat) photo.gpsLat = photoData.gpsLat;
      if (photoData.gpsLng) photo.gpsLng = photoData.gpsLng;
      if (photoData.locationName) photo.locationName = photoData.locationName;
      if (photoData.gpsAltitude) photo.gpsAltitude = photoData.gpsAltitude;
      if (photoData.deviceMake) photo.deviceMake = photoData.deviceMake;
      if (photoData.deviceModel) photo.deviceModel = photoData.deviceModel;
      if (photoData.deviceName) photo.deviceName = photoData.deviceName;
      if (photoData.takenAt) photo.takenAt = new Date(photoData.takenAt);
      await photoRepository.save(photo);
    }
  }

  res.json({
    status: 'success',
    message: 'Photos EXIF updated successfully',
  });
};

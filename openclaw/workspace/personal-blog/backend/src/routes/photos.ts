import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { uploadPhotos, analyzePhoto, updateCaption, updateTags, getPhotosForMap, deletePhoto, updatePhotosExif } from '../controllers/photos';
import { authenticate } from '../middlewares/auth';
import { recordOperationLog } from '../middlewares/recordOperationLog';

const router = Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// 上传照片
router.post(
  '/upload',
  authenticate,
  upload.array('photos', 10),
  recordOperationLog({
    action: 'PHOTO_UPLOAD',
    module: 'PHOTO',
    getMessage: (req, res) => `上传 ${req.files?.length || 0} 张照片`,
  }),
  uploadPhotos
);

// AI 分析照片
router.post(
  '/:id/analyze',
  authenticate,
  recordOperationLog({
    action: 'PHOTO_ANALYZE',
    module: 'PHOTO',
  }),
  analyzePhoto
);

// 更新照片配文
router.put(
  '/:id/caption',
  authenticate,
  recordOperationLog({
    action: 'PHOTO_CAPTION_UPDATE',
    module: 'PHOTO',
  }),
  updateCaption
);

// 更新照片标签
router.put(
  '/:id/tags',
  authenticate,
  recordOperationLog({
    action: 'PHOTO_TAGS_UPDATE',
    module: 'PHOTO',
  }),
  updateTags
);

// 获取带 GPS 的照片（地图模式用）
router.get('/map', getPhotosForMap);

// 删除照片
router.delete(
  '/:id',
  authenticate,
  recordOperationLog({
    action: 'PHOTO_DELETE',
    module: 'PHOTO',
  }),
  deletePhoto
);

// 批量更新照片 EXIF 数据
router.put(
  '/batch/exif',
  authenticate,
  recordOperationLog({
    action: 'PHOTO_EXIF_UPDATE',
    module: 'PHOTO',
  }),
  updatePhotosExif
);

export { router as photosRouter };

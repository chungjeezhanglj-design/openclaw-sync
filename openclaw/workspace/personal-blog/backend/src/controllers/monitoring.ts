import { Request, Response } from 'express';
import { getIPStats, clearIPCache } from '../utils/clientIP';
import { authenticate } from '../middlewares/auth';
import { isAdmin } from '../middlewares/authorize';

// 获取 IP 获取统计数据（需要管理员权限）
export const getIPStatsHandler = async (req: Request, res: Response) => {
  try {
    const stats = await getIPStats();
    
    res.json({
      status: 'success',
      data: stats,
    });
  } catch (error: any) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取统计数据失败',
    });
  }
};

// 清除缓存（需要管理员权限）
export const clearCacheHandler = async (req: Request, res: Response) => {
  try {
    clearIPCache();
    
    res.json({
      status: 'success',
      message: '缓存已清除',
    });
  } catch (error: any) {
    console.error('清除缓存失败:', error);
    res.status(500).json({
      status: 'error',
      message: '清除缓存失败',
    });
  }
};

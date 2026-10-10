import { Request, Response } from 'express';
import { AppDataSource } from '../config/data-source';
import { UserBehaviorLog } from '../models/UserBehaviorLog';
import { ArticleViewStat } from '../models/ArticleViewStat';
import { AuthRequest } from '../middlewares/auth';
import { GpsLocationCache } from '../models/GpsLocationCache';
import NodeCache from 'node-cache';

const behaviorLogRepository = AppDataSource.getRepository(UserBehaviorLog);
const articleViewStatRepository = AppDataSource.getRepository(ArticleViewStat);
const gpsCacheRepository = AppDataSource.getRepository(GpsLocationCache);

// 内存缓存：5 分钟过期，每分钟检查一次
const locationCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// 存储活跃的 SSE 连接（分离连接池）
const adminConnections = new Set<Response>();      // 管理员连接（看板 + 配置）
const configConnections = new Set<Response>();     // 所有用户（仅配置）

// SSE 实时推送（管理员专用）
export const logsStream = async (req: AuthRequest, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // 添加管理员连接
  adminConnections.add(res);

  // 立即发送初始数据
  sendInitialData(res);

  // 定时推送（每 5 秒）
  const interval = setInterval(async () => {
    try {
      const data = await getRealtimeStats();
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('SSE stats error:', error);
    }
  }, 5000);

  // 连接关闭时清理
  req.socket.on('close', () => {
    clearInterval(interval);
    adminConnections.delete(res);
  });
};

// 发送初始数据
async function sendInitialData(res: Response) {
  try {
    const data = await getRealtimeStats();
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (error) {
    console.error('SSE initial data error:', error);
  }
}

// Haversine 公式计算两个 GPS 坐标之间的距离（米）
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 查询 GPS 缓存（100 米容差）
async function queryGPSCache(gpsLat: number, gpsLng: number): Promise<string | null> {
  const toleranceDegrees = 50 / 111000; // 50 米 ≈ 0.00045 度
  
  const cached = await gpsCacheRepository
    .createQueryBuilder('cache')
    .where('ABS(cache.gpsLat - :lat) < :tolerance', { lat: gpsLat, tolerance: toleranceDegrees })
    .andWhere('ABS(cache.gpsLng - :lng) < :tolerance', { lng: gpsLng, tolerance: toleranceDegrees })
    .orderBy('ABS(cache.gpsLat - :lat) + ABS(cache.gpsLng - :lng)', 'ASC')
    .getOne();
  
  if (cached) {
    const distance = calculateDistance(gpsLat, gpsLng, cached.gpsLat, cached.gpsLng);
    
    if (distance <= 50) {
      // 更新引用次数
      await gpsCacheRepository
        .createQueryBuilder()
        .update()
        .set({ requestCount: () => '`requestCount` + 1' })
        .where('id = :id', { id: cached.id })
        .execute();
      
      return cached.locationName;
    }
  }
  
  return null;
}

// 更新行为日志位置
async function updateBehaviorLocation(sessionId: string, locationName: string) {
  await behaviorLogRepository
    .createQueryBuilder()
    .update()
    .set({ locationName })
    .where('sessionId = :sessionId', { sessionId })
    .andWhere('locationName IS NULL')
    .execute();
}

// 获取实时统计数据
async function getRealtimeStats() {
  const now = new Date();
  const ninetySecondsAgo = new Date(now.getTime() - 90 * 1000);

  // 在线用户查询（查询 90 秒内活跃的用户，但获取所有行为记录中的位置信息）
  const onlineUsers = await behaviorLogRepository
    .createQueryBuilder('behavior')
    .select([
      'behavior.sessionId AS sessionId',
    ])
    .addSelect('MAX(behavior.deviceId)', 'deviceId')
    .addSelect('MAX(behavior.userId)', 'userId')
    .addSelect('user.nickname', 'nickname')
    .addSelect('MAX(behavior.ipv4)', 'ipv4')
    .addSelect('MAX(behavior.ipv6)', 'ipv6')
    .addSelect('MAX(behavior.pageUrl)', 'pageUrl')
    .addSelect('MAX(behavior.createdAt)', 'lastActiveAt')
    .addSelect('sub.maxLocationName', 'locationName')
    .addSelect('sub.maxGpsLat', 'gpsLat')
    .addSelect('sub.maxGpsLng', 'gpsLng')
    .leftJoinAndSelect('behavior.user', 'user')
    .leftJoin(
      (qb) => qb
        .select([
          'ub.sessionId AS sessionId',
          'MAX(ub.locationName) AS maxLocationName',
          'MAX(ub.gpsLat) AS maxGpsLat',
          'MAX(ub.gpsLng) AS maxGpsLng',
        ])
        .from('user_behavior_logs', 'ub')
        .groupBy('ub.sessionId'),
      'sub',
      'sub.sessionId = behavior.sessionId'
    )
    .where('behavior.createdAt >= :ninetySecondsAgo', { ninetySecondsAgo })
    .groupBy('behavior.sessionId')
    .getRawMany();

  // 处理每个在线用户的位置信息（三层缓存）
  const processedUsers = await Promise.all(
    onlineUsers.map(async (u) => {
      const cacheKey = `location:${u.sessionId}`;
      
      // 1. 检查内存缓存
      let locationName = locationCache.get<string>(cacheKey);
      
      if (!locationName) {
        // 2. 优先使用 GPS 坐标查询位置（更准确）
        if (u.gpsLat && u.gpsLng) {
          // 检查 GPS 缓存表
          const cachedAddress = await queryGPSCache(parseFloat(u.gpsLat), parseFloat(u.gpsLng));
          
          if (cachedAddress) {
            locationName = cachedAddress;
            // 更新内存缓存和数据库
            locationCache.set(cacheKey, locationName);
            await updateBehaviorLocation(u.sessionId, locationName);
          } else {
            // 缓存未命中，显示 GPS 坐标
            locationName = `GPS: ${parseFloat(u.gpsLat).toFixed(4)}, ${parseFloat(u.gpsLng).toFixed(4)}`;
            locationCache.set(cacheKey, locationName);
          }
        } else if (u.locationName) {
          // 2. 使用数据库中的 locationName（备选）
          locationName = u.locationName;
          locationCache.set(cacheKey, locationName);
        } else {
          // 3. 位置未知
          locationName = '位置未知';
          locationCache.set(cacheKey, locationName);
        }
      }

      return {
        sessionId: u.sessionId,
        deviceId: u.deviceId,
        userId: u.userId,
        nickname: u.nickname,
        ipv4: u.ipv4,
        ipv6: u.ipv6,
        pageUrl: u.pageUrl,
        lastActiveAt: u.lastActiveAt,
        locationName,
        gpsLat: u.gpsLat,
        gpsLng: u.gpsLng,
      };
    })
  );

  // 最近浏览动态
  const recentBehaviors = await behaviorLogRepository
    .createQueryBuilder('behavior')
    .leftJoinAndSelect('behavior.user', 'user')
    .where('behavior.eventType = :eventType', { eventType: 'article_view' })
    .orderBy('behavior.createdAt', 'DESC')
    .take(10)
    .getMany();

  // 查询文章标题
  const articleIds = recentBehaviors
    .filter(b => b.articleId)
    .map(b => b.articleId);
  
  const articles = articleIds.length > 0
    ? await AppDataSource.getRepository('Post')
        .createQueryBuilder('post')
        .select(['post.id', 'post.title'])
        .where('post.id IN (:...ids)', { ids: articleIds })
        .getMany()
    : [];
  
  const articleMap = new Map(articles.map(a => [a.id, a.title]));

  const recentViews = recentBehaviors.map((entity) => ({
    articleId: entity.articleId,
    articleTitle: entity.articleId ? articleMap.get(entity.articleId) : undefined,
    userId: entity.userId,
    nickname: entity.user?.nickname,
    isGuest: !entity.userId,
    locationName: entity.locationName,
    timestamp: entity.createdAt,
  }));

  // 今日概览
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayStats = await behaviorLogRepository
    .createQueryBuilder('behavior')
    .select('COUNT(*)', 'pv')
    .addSelect(
      'COUNT(DISTINCT CONCAT(COALESCE(behavior.userId, ""), behavior.deviceId, behavior.sessionId))',
      'uv'
    )
    .addSelect('AVG(behavior.stayDuration)', 'avgDuration')
    .where('behavior.createdAt >= :today', { today })
    .getRawOne();

  return {
    onlineUsers: processedUsers,
    recentViews,
    todayStats: {
      pv: parseInt(todayStats?.pv || 0),
      uv: parseInt(todayStats?.uv || 0),
      avgStayDuration: parseFloat(todayStats?.avgDuration || 0),
    },
  };
}

// 广播消息给所有管理员 SSE 连接（实时看板数据）
export function broadcastToClients(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  adminConnections.forEach((res) => {
    try {
      res.write(message);
    } catch (error) {
      console.error('[SSE] 广播失败:', error);
      adminConnections.delete(res);
    }
  });
}

// 广播配置更新给所有 SSE 连接（管理员 + 普通用户）
export function broadcastConfigUpdate(config: {
  enabled: boolean;
  reportThreshold: number;
  reportInterval: number;
}) {
  const message = `data: ${JSON.stringify({
    type: 'config_update',
    timestamp: Date.now(),
    config,
  })}\n\n`;
  
  console.log('[SSE] 广播配置更新:', config);
  
  // 广播给所有连接（管理员 + 普通用户）
  const allConnections = [...adminConnections, ...configConnections];
  allConnections.forEach((res) => {
    try {
      res.write(message);
    } catch (error) {
      console.error('[SSE] 广播失败:', error);
      configConnections.delete(res);
      adminConnections.delete(res);
    }
  });
}

// 公开配置推送端点（无需认证）
export const configStream = async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // 添加配置连接
  configConnections.add(res);

  // 立即发送当前配置
  const currentConfig = await getCurrentConfig();
  res.write(`data: ${JSON.stringify({
    type: 'config_update',
    timestamp: Date.now(),
    config: currentConfig,
  })}\n\n`);

  // 心跳定时器（每 30 秒发送一次）
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      type: 'heartbeat',
      timestamp: Date.now(),
    })}\n\n`);
  }, 30000);

  // 连接关闭时清理
  req.socket.on('close', () => {
    clearInterval(heartbeat);
    configConnections.delete(res);
    res.end();
  });
};

// 获取当前配置（用于初始化和广播）
async function getCurrentConfig() {
  const configs = await AppDataSource.query(
    `SELECT config_key, config_value FROM behavior_config`
  );
  const configObj: Record<string, any> = {};
  configs.forEach((c: any) => {
    configObj[c.config_key] = c.config_value;
  });
  
  return {
    enabled: configObj.enabled === 'true',
    reportThreshold: parseInt(configObj.report_threshold) || 3,
    reportInterval: parseInt(configObj.report_interval) || 30,
  };
}

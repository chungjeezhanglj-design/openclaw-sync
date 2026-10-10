import { Request, Response } from 'express';
import { AppDataSource } from '../config/data-source';
import { UserBehaviorLog } from '../models/UserBehaviorLog';
import { ArticleViewStat } from '../models/ArticleViewStat';
import { OperationLog } from '../models/OperationLog';
import { GpsLocationCache } from '../models/GpsLocationCache';
import { AuthRequest } from '../middlewares/auth';
import { anonymizeIp, getClientIP as getClientIPFn } from '../middlewares/logOperation';
import { getClientPublicIP } from '../utils/clientIP';
import axios from 'axios';
import NodeCache from 'node-cache';

const behaviorLogRepository = AppDataSource.getRepository(UserBehaviorLog);
const articleViewStatRepository = AppDataSource.getRepository(ArticleViewStat);
const operationLogRepository = AppDataSource.getRepository(OperationLog);
const gpsCacheRepository = AppDataSource.getRepository(GpsLocationCache);

// 配置缓存：5 分钟 TTL，每分钟检查一次过期
const configCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// 导出 configCache 供其他模块清除缓存
export { configCache };

// 导出 getClientIP 供路由使用
export const getClientIP = getClientIPFn;

// 获取配置值（带缓存）
async function getConfigValue(key: string): Promise<string | null> {
  const cacheKey = `config:${key}`;
  const cached = configCache.get<string>(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  
  // 缓存未命中，查询数据库
  const result = await AppDataSource.query(
    `SELECT config_value FROM behavior_config WHERE config_key = ?`,
    [key]
  );
  
  const value = result.length > 0 ? result[0].config_value : null;
  configCache.set(cacheKey, value);
  return value;
}

// 高德地图 API Key
const AMAP_KEY = process.env.AMAP_KEY || '6bc5d2c072de57286a8558fa03f34d29';

// 通过 IP 获取公网 IP 信息（使用 ipapi.co）
async function fetchPublicIpInfo(ip: string): Promise<{ ipv4?: string; ipv6?: string; locationName?: string } | null> {
  try {
    // 跳过本地 IP
    if (['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'].includes(ip)) {
      return null;
    }
    
    const response = await axios.get(`https://ipapi.co/${ip}/json/`, {
      timeout: 3000
    });
    
    if (response.data) {
      return {
        ipv4: response.data.version === 'IPv4' ? response.data.ip : undefined,
        ipv6: response.data.version === 'IPv6' ? response.data.ip : undefined,
        locationName: [response.data.city, response.data.region, response.data.country_name]
          .filter(Boolean)
          .join(', ') || undefined,
      };
    }
  } catch (error) {
    console.debug('获取公网 IP 信息失败:', error);
  }
  return null;
}

// 通过高德 API 换取地址信息（逆地理编码）
async function fetchAmapAddress(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await axios.get(
      `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${lng},${lat}&output=json`
    );
    if (response.data.status === '1' && response.data.regeocode) {
      return response.data.regeocode.formatted_address;
    }
  } catch (error) {
    console.debug('高德逆地理编码失败:', error);
  }
  return null;
}

// Haversine 公式计算两个 GPS 坐标之间的距离（米）
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // 地球半径（米）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // 距离（米）
}

// 通过 GPS 坐标获取地址（带缓存，容差 300 米）
async function convertGPSToAddress(gpsLat: number, gpsLng: number): Promise<string | null> {
  // 1. 查询缓存表（容差 300 米 ≈ 0.003 度）
  const cached = await gpsCacheRepository
    .createQueryBuilder('cache')
    .where('ABS(cache.gpsLat - :lat) < 0.003', { lat: gpsLat })
    .andWhere('ABS(cache.gpsLng - :lng) < 0.003', { lng: gpsLng })
    .orderBy('ABS(cache.gpsLat - :lat) + ABS(cache.gpsLng - :lng)', 'ASC')
    .getOne();
  
  // 2. 如果找到缓存，计算精确距离
  if (cached) {
    const distance = calculateDistance(gpsLat, gpsLng, cached.gpsLat, cached.gpsLng);
    
    if (distance <= 300) {  // 300 米容差
      // 更新引用次数（直接使用 SQL 避免字段名转换问题）
      await gpsCacheRepository
        .createQueryBuilder()
        .update()
        .set({ requestCount: () => '`requestCount` + 1' })
        .where('id = :id', { id: cached.id })
        .execute();
      
      console.log(`[GPS 缓存命中] 距离：${distance.toFixed(1)} 米，地址：${cached.locationName}`);
      return cached.locationName;
    }
  }
  
  // 3. 缓存未命中，调用高德 API
  console.log('[GPS 缓存未命中] 调用高德 API');
  const address = await fetchAmapAddress(gpsLat, gpsLng);
  
  if (address) {
    // 存入缓存表
    await gpsCacheRepository.save({
      id: crypto.randomUUID(),
      gpsLat,
      gpsLng,
      locationName: address,
      requestCount: 1,
    });
    console.log(`[GPS 缓存已保存] 地址：${address}`);
  }
  
  return address;
}

// 只查询 GPS 缓存表（50 米容差，未命中不调用 API）
async function queryGPSCacheOnly(gpsLat: number, gpsLng: number): Promise<string | null> {
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
      
      console.log(`[GPS 缓存命中] 距离：${distance.toFixed(1)} 米，地址：${cached.locationName}`);
      return cached.locationName;
    }
  }
  
  // 缓存未命中，不调用 API，返回 null
  console.log(`[GPS 缓存未命中] GPS: ${gpsLat.toFixed(6)}, ${gpsLng.toFixed(6)}`);
  return null;
}

// 异步批量转换位置信息（只查缓存，不调用 API）
async function convertLocationsAsync(logs: { id: string; gpsLat: number | null; gpsLng: number | null; locationName: string | null }[]) {
  // 筛选需要转换的记录（有 GPS 且无地址）
  const logsWithGPS = logs.filter((log): log is { id: string; gpsLat: number; gpsLng: number; locationName: string | null } => 
    log.gpsLat != null && log.gpsLng != null && !log.locationName
  );
  
  if (logsWithGPS.length === 0) return;
  
  console.log(`[GPS 转换] 开始转换 ${logsWithGPS.length} 条记录的位置信息`);
  
  let successCount = 0;
  let missCount = 0;
  
  // 对每条记录进行转换
  for (const log of logsWithGPS) {
    try {
      // 只查询缓存，不调用 API
      const locationName = await queryGPSCacheOnly(log.gpsLat, log.gpsLng);
      
      if (locationName) {
        // 更新数据库
        await behaviorLogRepository.update(log.id, { locationName });
        successCount++;
      } else {
        missCount++;
      }
    } catch (error) {
      console.error(`[GPS 转换] 单条转换失败:`, error);
      missCount++;
    }
  }
  
  console.log(`[GPS 转换] 完成：命中 ${successCount} 条，未命中 ${missCount} 条`);
}

// 上报行为数据
export const trackBehavior = async (req: Request, res: Response) => {
  try {
    const { events } = req.body;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({
        status: 'error',
        message: 'Events array is required',
      });
    }

    const userAgent = req.headers['user-agent'] || '';

    // 批量保存行为日志
    const logs = await Promise.all(events.map(async (event: any) => {
      // 优先级：前端上报的 IP > 后端获取的 IP
      let finalIpv4 = event.ipv4;  // 前端上报的 IPv4
      let finalIpv6 = event.ipv6;  // 前端上报的 IPv6
      
      // 如果前端没有上报 IP，使用后端获取的
      if (!finalIpv4 && !finalIpv6) {
        const clientIP = await getClientPublicIP(req);
        finalIpv4 = clientIP.ipv4;
        finalIpv6 = clientIP.ipv6;
      }
      
      const serverIp = finalIpv4 || finalIpv6 || 'unknown';
      const anonymizedIp = anonymizeIp(serverIp);

      return {
        id: crypto.randomUUID(),
        userId: event.userId || null,
        sessionId: event.sessionId,
        deviceId: event.deviceId || null,
        eventType: event.eventType,
        pageUrl: event.pageUrl,
        pageType: event.pageType || null,
        articleId: event.articleId || null,
        scrollDepth: event.scrollDepth || null,
        scrollCount: event.scrollCount || null,
        stayDuration: event.stayDuration || null,
        clickTarget: event.clickTarget || null,
        ip: anonymizedIp,
        ipv4: finalIpv4 || undefined,
        ipv6: finalIpv6 || undefined,
        userAgent,
        screenResolution: event.screenResolution || null,
        viewportSize: event.viewportSize || null,
        referrer: event.referrer || null,
        locationName: undefined,                // ← 保持为空，等待管理员转换
        gpsLat: event.gpsLat ?? null,
        gpsLng: event.gpsLng ?? null,
        createdAt: new Date(event.timestamp || Date.now()),
      };
    }));

    await behaviorLogRepository.save(logs);

    // 异步转换位置信息（不阻塞响应）
    if (logs.some(log => log.gpsLat && log.gpsLng)) {
      convertLocationsAsync(logs.map(log => ({
        id: log.id,
        gpsLat: log.gpsLat,
        gpsLng: log.gpsLng,
        locationName: log.locationName ?? null,
      }))).catch(console.error);
    }

    // 异步更新文章统计
    updateArticleViewStats(events).catch(console.error);

    // 获取 enabled 配置（用于返回给前端）
    const enabledValue = await getConfigValue('enabled');
    const enabled = enabledValue !== 'false';

    res.json({
      status: 'success',
      enabled,
      message: 'Behavior tracked successfully',
    });
  } catch (error: any) {
    console.error('Track behavior error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to track behavior',
    });
  }
};

// 更新文章浏览统计
async function updateArticleViewStats(events: any[]) {
  const articleEvents = events.filter(
    (e: any) => e.eventType === 'article_view' && e.articleId
  );

  for (const event of articleEvents) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let stat = await articleViewStatRepository.findOne({
      where: { articleId: event.articleId, date: today },
    });

    if (!stat) {
      stat = articleViewStatRepository.create({
        id: crypto.randomUUID(),
        articleId: event.articleId,
        date: today,
        totalViews: 0,
        uniqueViews: 0,
        avgStayDuration: 0,
        avgScrollDepth: 0,
        loggedInView: 0,
        guestView: 0,
      });
    }

    stat.totalViews += 1;

    // 区分登录用户和游客
    if (event.userId) {
      stat.loggedInView += 1;
    } else {
      stat.guestView += 1;
    }

    // 更新平均值
    const stayDuration = event.stayDuration || 0;
    const scrollDepth = event.scrollDepth || 0;

    stat.avgStayDuration =
      (stat.avgStayDuration * (stat.totalViews - 1) + stayDuration) /
      stat.totalViews;
    stat.avgScrollDepth =
      (stat.avgScrollDepth * (stat.totalViews - 1) + scrollDepth) /
      stat.totalViews;

    await articleViewStatRepository.save(stat);
  }
}

// 获取文章行为分析
export const getArticleBehavior = async (req: Request, res: Response) => {
  try {
    const { articleId } = req.params;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const stats = await articleViewStatRepository
      .createQueryBuilder('stats')
      .where('stats.articleId = :articleId', { articleId })
      .andWhere('stats.date >= :startDate', { startDate })
      .orderBy('stats.date', 'DESC')
      .getMany();

    const totalViews = stats.reduce((sum, s) => sum + s.totalViews, 0);
    const totalUniqueViews = stats.reduce((sum, s) => sum + s.uniqueViews, 0);
    const avgStayDuration =
      stats.reduce((sum, s) => sum + parseFloat(s.avgStayDuration.toString()), 0) /
      (stats.length || 1);
    const avgScrollDepth =
      stats.reduce((sum, s) => sum + parseFloat(s.avgScrollDepth.toString()), 0) /
      (stats.length || 1);

    res.json({
      status: 'success',
      data: {
        stats,
        summary: {
          totalViews,
          totalUniqueViews,
          avgStayDuration: avgStayDuration.toFixed(2),
          avgScrollDepth: avgScrollDepth.toFixed(2),
        },
      },
    });
  } catch (error: any) {
    console.error('Get article behavior error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get article behavior',
    });
  }
};

// 获取用户行为轨迹
export const getUserBehavior = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { days = 7, limit = 100 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const behaviors = await behaviorLogRepository
      .createQueryBuilder('behavior')
      .leftJoinAndSelect('behavior.article', 'article')
      .where('behavior.userId = :userId', { userId })
      .andWhere('behavior.createdAt >= :startDate', { startDate })
      .orderBy('behavior.createdAt', 'DESC')
      .take(parseInt(limit as string))
      .getMany();

    res.json({
      status: 'success',
      data: {
        behaviors,
        total: behaviors.length,
      },
    });
  } catch (error: any) {
    console.error('Get user behavior error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user behavior',
    });
  }
};

// 获取行为统计
export const getBehaviorStats = async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    // PV/UV 统计
    const pvResult = await behaviorLogRepository
      .createQueryBuilder('behavior')
      .select('DATE(behavior.createdAt)', 'date')
      .addSelect('COUNT(*)', 'pv')
      .addSelect(
        'COUNT(DISTINCT CONCAT(COALESCE(behavior.userId, ""), behavior.deviceId, behavior.sessionId))',
        'uv'
      )
      .where('behavior.createdAt >= :startDate', { startDate })
      .groupBy('DATE(behavior.createdAt)')
      .orderBy('date', 'DESC')
      .getRawMany();

    // 今日实时统计
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await behaviorLogRepository
      .createQueryBuilder('behavior')
      .select('COUNT(*)', 'total')
      .addSelect(
        'COUNT(DISTINCT CONCAT(COALESCE(behavior.userId, ""), behavior.deviceId, behavior.sessionId))',
        'unique'
      )
      .addSelect('AVG(behavior.stayDuration)', 'avgDuration')
      .where('behavior.createdAt >= :today', { today })
      .getRawOne();

    res.json({
      status: 'success',
      data: {
        daily: pvResult,
        today: {
          pv: parseInt(todayStats?.total || 0),
          uv: parseInt(todayStats?.unique || 0),
          avgStayDuration: parseFloat(todayStats?.avgDuration || 0),
        },
      },
    });
  } catch (error: any) {
    console.error('Get behavior stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get behavior stats',
    });
  }
};

// 获取操作日志列表
export const getOperationLogs = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      action,
      module,
      status,
      userId,
      startDate,
      endDate,
    } = req.query;

    const queryBuilder = operationLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .orderBy('log.createdAt', 'DESC')
      .skip((parseInt(page as string) - 1) * parseInt(limit as string))
      .take(parseInt(limit as string));

    if (action) {
      queryBuilder.andWhere('log.action = :action', { action });
    }
    if (module) {
      queryBuilder.andWhere('log.module = :module', { module });
    }
    if (status) {
      queryBuilder.andWhere('log.status = :status', { status });
    }
    if (userId) {
      queryBuilder.andWhere('log.userId = :userId', { userId });
    }
    if (startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', { endDate });
    }

    const [logs, total] = await queryBuilder.getManyAndCount();

    res.json({
      status: 'success',
      data: {
        logs,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    console.error('Get operation logs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get operation logs',
    });
  }
};

// 预览清理日志（显示预计删除数量）
export const previewClearLogs = async (req: Request, res: Response) => {
  try {
    const { days = 90, type = 'behavior' } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days as string));

    let count = 0;
    const details = { behavior: 0, operation: 0 };

    if (type === 'operation') {
      count = await operationLogRepository
        .createQueryBuilder()
        .where('createdAt < :cutoffDate', { cutoffDate })
        .getCount();
      details.operation = count;
    } else if (type === 'all') {
      const behaviorCount = await behaviorLogRepository
        .createQueryBuilder()
        .where('createdAt < :cutoffDate', { cutoffDate })
        .getCount();
      const operationCount = await operationLogRepository
        .createQueryBuilder()
        .where('createdAt < :cutoffDate', { cutoffDate })
        .getCount();
      count = behaviorCount + operationCount;
      details.behavior = behaviorCount;
      details.operation = operationCount;
    } else {
      count = await behaviorLogRepository
        .createQueryBuilder()
        .where('createdAt < :cutoffDate', { cutoffDate })
        .getCount();
      details.behavior = count;
    }

    res.json({
      status: 'success',
      data: { count, details, type, days, cutoffDate: cutoffDate.toISOString() },
    });
  } catch (error: any) {
    console.error('Preview clear logs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to preview clear logs',
    });
  }
};

// 清理过期日志
export const clearOldLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { days = 90, type = 'behavior' } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days as string));

    let deleted = 0;
    const deletedDetails = { behavior: 0, operation: 0 };

    if (type === 'operation' || type === 'all') {
      const result = await operationLogRepository
        .createQueryBuilder()
        .delete()
        .where('createdAt < :cutoffDate', { cutoffDate })
        .execute();
      deletedDetails.operation = result.affected || 0;
      deleted += deletedDetails.operation;
    }

    if (type === 'behavior' || type === 'all') {
      const result = await behaviorLogRepository
        .createQueryBuilder()
        .delete()
        .where('createdAt < :cutoffDate', { cutoffDate })
        .execute();
      deletedDetails.behavior = result.affected || 0;
      deleted += deletedDetails.behavior;
    }

    // 记录清理操作到操作日志
    await operationLogRepository.save({
      id: crypto.randomUUID(),
      userId: req.user?.id,
      action: 'LOGS_CLEAR',
      module: 'SYSTEM',
      status: 'success',
      message: `清理${type}日志${days}天，共${deleted}条`,
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'] || '',
      createdAt: new Date(),
    });

    res.json({
      status: 'success',
      data: { deleted, details: deletedDetails, type },
    });
  } catch (error: any) {
    console.error('Clear logs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to clear logs',
    });
  }
};

// GPS 地址转换（管理员手动触发，100 米容差去重）
export const convertGPSAddresses = async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const ninetySecondsAgo = new Date(now.getTime() - 90 * 1000);
    
    // 从容差参数，默认 50 米
    const toleranceMeters = req.body.toleranceMeters || 50;
    
    // 查询在线用户中需要转换 GPS 的记录（有 GPS 但无中文地址）
    const usersToConvert = await behaviorLogRepository
      .createQueryBuilder('behavior')
      .select('DISTINCT behavior.deviceId', 'deviceId')
      .addSelect('MAX(behavior.gpsLat)', 'gpsLat')
      .addSelect('MAX(behavior.gpsLng)', 'gpsLng')
      .addSelect('MAX(behavior.sessionId)', 'sessionId')
      .where('behavior.createdAt >= :ninetySecondsAgo', { ninetySecondsAgo })
      .andWhere('behavior.gpsLat IS NOT NULL')
      .andWhere('behavior.locationName IS NULL')
      .groupBy('behavior.deviceId')
      .getRawMany();
    
    const total = usersToConvert.length;
    
    if (total === 0) {
      return res.json({ 
        status: 'success', 
        data: { converted: 0, message: '无需转换' }
      });
    }
    
    // GPS 坐标去重（使用前端传递的容差）
    const uniqueGPSPairs = deduplicateGPS(usersToConvert, toleranceMeters);
    
    console.log(`[GPS 转换] 原始 ${total} 个坐标，去重后 ${uniqueGPSPairs.length} 个`);
    
    let converted = 0;
    let apiCalls = 0;
    
    // 流式返回进度
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    
    // 处理每个唯一的 GPS 坐标
    for (const gpsPair of uniqueGPSPairs) {
      const { gpsLat, gpsLng, deviceIds } = gpsPair;
      
      // 查询 GPS 缓存（使用动态容差）
      const cachedAddress = await queryGPSCache(gpsLat, gpsLng, toleranceMeters);
      
      let address: string | null;
      
      if (cachedAddress) {
        // 缓存命中
        console.log(`[GPS 缓存命中] ${cachedAddress}`);
        address = cachedAddress;
      } else {
        // 缓存未命中，调用高德 API（带重试）
        address = await convertWithRetry(gpsLat, gpsLng, 2);
        apiCalls++;
        
        if (address) {
          // 存入 GPS 缓存表
          await gpsCacheRepository.save({
            id: crypto.randomUUID(),
            gpsLat,
            gpsLng,
            locationName: address,
            requestCount: 1,
          });
          console.log(`[GPS 缓存已保存] ${address}`);
        }
      }
      
      if (address) {
        // 批量更新 user_behavior_logs 表（使用动态容差）
        const toleranceDegrees = toleranceMeters / 111000;
        
        await behaviorLogRepository
          .createQueryBuilder()
          .update()
          .set({ locationName: address })
          .where('gpsLat IS NOT NULL')
          .andWhere('gpsLng IS NOT NULL')
          .andWhere('ABS(gpsLat - :lat) < :tolerance', { lat: gpsLat, tolerance: toleranceDegrees })
          .andWhere('ABS(gpsLng - :lng) < :tolerance', { lng: gpsLng, tolerance: toleranceDegrees })
          .execute();
        
        converted += deviceIds.length;
      }
      
      // 发送进度
      res.write(`data: ${JSON.stringify({ 
        progress: { current: converted, total, apiCalls }
      })}\n\n`);
      
      // 200ms 延迟，避免触发 API 限流
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    res.write(`data: ${JSON.stringify({ 
      status: 'success', 
      data: { converted, total, apiCalls }
    })}\n\n`);
    res.end();
    
  } catch (error) {
    console.error('GPS 转换失败:', error);
    res.status(500).json({ 
      status: 'error', 
      message: '转换失败' 
    });
  }
};

// GPS 坐标去重函数（100 米容差）
function deduplicateGPS(
  usersToConvert: any[], 
  toleranceMeters: number = 100
): Array<{ gpsLat: number; gpsLng: number; deviceIds: string[] }> {
  const uniquePairs: Array<{ gpsLat: number; gpsLng: number; deviceIds: string[] }> = [];
  
  for (const user of usersToConvert) {
    const { gpsLat, gpsLng, deviceId } = user;
    
    if (!gpsLat || !gpsLng) continue;
    
    // 查找是否已存在相近的 GPS 坐标
    let existing = uniquePairs.find(pair => {
      const distance = calculateDistance(gpsLat, gpsLng, pair.gpsLat, pair.gpsLng);
      return distance <= toleranceMeters;
    });
    
    if (existing) {
      // 已存在相近坐标，添加到同一组
      if (!existing.deviceIds.includes(deviceId)) {
        existing.deviceIds.push(deviceId);
      }
    } else {
      // 新的 GPS 坐标
      uniquePairs.push({
        gpsLat,
        gpsLng,
        deviceIds: [deviceId],
      });
    }
  }
  
  return uniquePairs;
}

// GPS 转换带重试（200ms 延迟）
async function convertWithRetry(
  gpsLat: number, 
  gpsLng: number, 
  maxRetries = 2
): Promise<string | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const address = await fetchAmapAddress(gpsLat, gpsLng);
      if (address) return address;
    } catch (error) {
      console.warn(`[GPS 转换第${attempt}次失败]`, error);
      if (attempt === maxRetries) throw error;
      
      // 指数退避
      await new Promise(resolve => setTimeout(resolve, 200 * attempt));
    }
  }
  return null;
}

// 查询 GPS 缓存（指定容差）
async function queryGPSCache(
  gpsLat: number, 
  gpsLng: number, 
  toleranceMeters: number = 100
): Promise<string | null> {
  const toleranceDegrees = toleranceMeters / 111000;
  
  const cached = await gpsCacheRepository
    .createQueryBuilder('cache')
    .where('ABS(cache.gpsLat - :lat) < :tolerance', { lat: gpsLat, tolerance: toleranceDegrees })
    .andWhere('ABS(cache.gpsLng - :lng) < :tolerance', { lng: gpsLng, tolerance: toleranceDegrees })
    .orderBy('ABS(cache.gpsLat - :lat) + ABS(cache.gpsLng - :lng)', 'ASC')
    .getOne();
  
  if (cached) {
    const distance = calculateDistance(gpsLat, gpsLng, cached.gpsLat, cached.gpsLng);
    
    if (distance <= toleranceMeters) {
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

import NodeCache from 'node-cache';
import { Request } from 'express';
import { AppDataSource } from '../config/data-source';

// 缓存配置 - 30 分钟
const CACHE_TTL = 1800; // 30 * 60 = 1800 秒
const ipCache = new NodeCache({ stdTTL: CACHE_TTL, checkperiod: 300 });

// 内存中的统计数据（用于实时监控）
let memoryStats = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  apiCalls: 0,
  apiFailures: 0,
  forwardedRequests: 0,
  localFallbacks: 0,
  lastReset: Date.now(),
};

// 日志级别控制
const LOG_LEVELS = {
  SILENT: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
};

const CURRENT_LOG_LEVEL = LOG_LEVELS[process.env.IP_TRACKING_LOG_LEVEL as keyof typeof LOG_LEVELS] ?? LOG_LEVELS.INFO;

// 日志输出函数
function log(level: number, prefix: string, requestId: string, message: string, ...args: any[]) {
  if (level > CURRENT_LOG_LEVEL) return;
  
  const timestamp = new Date().toISOString();
  const levelName = Object.entries(LOG_LEVELS).find(([_, v]) => v === level)?.[0] || 'INFO';
  
  console.log(`[${timestamp}][${levelName}][ClientIP][${requestId}] ${prefix} ${message}`, ...args);
}

// 保存到数据库（异步，不阻塞）
async function saveStatsToDB(stats: typeof memoryStats) {
  try {
    const now = new Date();
    const statDate = now.toISOString().split('T')[0];
    const statHour = now.getHours();
    
    await AppDataSource.query(`
      INSERT INTO ip_monitoring_stats 
        (stat_date, stat_hour, total_requests, cache_hits, cache_misses, api_calls, api_failures, forwarded_requests, local_fallbacks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        total_requests = total_requests + VALUES(total_requests),
        cache_hits = cache_hits + VALUES(cache_hits),
        cache_misses = cache_misses + VALUES(cache_misses),
        api_calls = api_calls + VALUES(api_calls),
        api_failures = api_failures + VALUES(api_failures),
        forwarded_requests = forwarded_requests + VALUES(forwarded_requests),
        local_fallbacks = local_fallbacks + VALUES(local_fallbacks)
    `, [statDate, statHour, stats.totalRequests, stats.cacheHits, stats.cacheMisses, stats.apiCalls, stats.apiFailures, stats.forwardedRequests, stats.localFallbacks]);
  } catch (error) {
    console.error('[ClientIP] 保存统计到数据库失败:', error);
  }
}

// 定期保存统计到数据库（每 5 分钟）
setInterval(() => {
  if (memoryStats.totalRequests > 0) {
    saveStatsToDB(memoryStats);
    memoryStats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      apiCalls: 0,
      apiFailures: 0,
      forwardedRequests: 0,
      localFallbacks: 0,
      lastReset: Date.now(),
    };
    log(LOG_LEVELS.INFO, '📊', 'system', '统计数据已保存到数据库');
  }
}, 300000); // 5 分钟

// 获取统计数据（包括内存和数据库）
export async function getIPStats() {
  try {
    // 获取数据库统计（最近 24 小时）
    const dbStats = await AppDataSource.query(`
      SELECT 
        SUM(total_requests) as total_requests,
        SUM(cache_hits) as cache_hits,
        SUM(cache_misses) as cache_misses,
        SUM(api_calls) as api_calls,
        SUM(api_failures) as api_failures,
        SUM(forwarded_requests) as forwarded_requests,
        SUM(local_fallbacks) as local_fallbacks
      FROM ip_monitoring_stats
      WHERE (stat_date = CURDATE() AND stat_hour >= HOUR(NOW()))
         OR (stat_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND stat_hour < HOUR(NOW()))
    `);
    
    const db = dbStats[0] || {};
    const hitRate = (db.cache_hits || 0) > 0 
      ? (((db.cache_hits || 0) / (db.total_requests || 1)) * 100).toFixed(2)
      : '0.00';
    
    return {
      // 内存统计（实时）
      memory: {
        ...memoryStats,
        cacheHitRate: memoryStats.totalRequests > 0 
          ? (((memoryStats.cacheHits / memoryStats.totalRequests) * 100).toFixed(2) + '%')
          : '0.00%',
      },
      // 数据库统计（24 小时）
      database: {
        totalRequests: db.total_requests || 0,
        cacheHits: db.cache_hits || 0,
        cacheMisses: db.cache_misses || 0,
        apiCalls: db.api_calls || 0,
        apiFailures: db.api_failures || 0,
        forwardedRequests: db.forwarded_requests || 0,
        localFallbacks: db.local_fallbacks || 0,
        cacheHitRate: `${hitRate}%`,
      },
      // 缓存配置
      config: {
        cacheTTL: CACHE_TTL,
        logLevel: Object.entries(LOG_LEVELS).find(([_, v]) => v === CURRENT_LOG_LEVEL)?.[0] || 'INFO',
      },
    };
  } catch (error) {
    console.error('[ClientIP] 获取统计数据失败:', error);
    return {
      memory: { ...memoryStats, cacheHitRate: '0.00%' },
      database: {},
      config: { cacheTTL: CACHE_TTL, logLevel: 'INFO' },
      error: '获取数据库统计失败',
    };
  }
}

// 清除缓存和重置统计（用于测试或手动刷新）
export function clearIPCache(): void {
  ipCache.flushAll();
  memoryStats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    apiCalls: 0,
    apiFailures: 0,
    forwardedRequests: 0,
    localFallbacks: 0,
    lastReset: Date.now(),
  };
  log(LOG_LEVELS.INFO, '🔄', 'system', '缓存和统计已重置');
}

// 获取客户端公网 IP（带缓存和监控）
// 优先级：X-Forwarded-For > 缓存 > 第三方 API > 本地 IP
export async function getClientPublicIP(req: Request): Promise<{
  ipv4?: string;
  ipv6?: string;
  source: 'forwarded' | 'cache' | 'api' | 'local';
}> {
  memoryStats.totalRequests++;
  const requestId = Math.random().toString(36).substring(2, 8);
  const startTime = Date.now();
  
  // 1. 优先从 X-Forwarded-For 获取（Nginx 反向代理场景）
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    // X-Forwarded-For 可能有多个 IP：client, proxy1, proxy2
    const clientIP = forwarded.split(',')[0].trim();
    memoryStats.forwardedRequests++;
    
    log(LOG_LEVELS.INFO, '✅', requestId, `从 X-Forwarded-For 获取：${clientIP}`);
    
    return {
      ipv4: clientIP.includes(':') ? undefined : clientIP,
      ipv6: clientIP.includes(':') ? clientIP : undefined,
      source: 'forwarded',
    };
  }
  
  // 2. 检查缓存
  const cachedIP = ipCache.get<{ ipv4?: string; ipv6?: string }>('client-ip');
  if (cachedIP) {
    memoryStats.cacheHits++;
    const duration = Date.now() - startTime;
    
    log(LOG_LEVELS.DEBUG, '🟢', requestId, 
      `缓存命中 (${duration}ms)`,
      `IPv4: ${cachedIP.ipv4 || '无'}, IPv6: ${cachedIP.ipv6 || '无'}`
    );
    
    return { ...cachedIP, source: 'cache' };
  }
  
  memoryStats.cacheMisses++;
  
  // 3. 调用第三方 API 获取公网 IP（分别获取 IPv4 和 IPv6）
  memoryStats.apiCalls++;
  try {
    log(LOG_LEVELS.INFO, '🔄', requestId, '正在获取公网 IP（IPv4 + IPv6）...');
    
    const result: { ipv4?: string; ipv6?: string } = {};
    
    // IPv4 API 列表（强制返回 IPv4）
    const ipv4Apis = [
      'https://ipv4.icanhazip.com',    // ✅ 可用
      'https://api.ip.sb/ip',          // ✅ 可用（但返回当前连接协议的 IP）
      'https://api4.ipify.org',        // ❌ 可能被墙
      'https://v4.ifconfig.co/ip',     // ❌ 可能被墙
    ];
    
    // IPv6 API 列表（强制返回 IPv6）
    const ipv6Apis = [
      'https://ipv6.icanhazip.com',    // ✅ 可用
      'https://api6.ipify.org',        // ❌ 可能被墙
    ];
    
    // 获取 IPv4
    for (const url of ipv4Apis) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
        if (response.ok) {
          const ip = (await response.text()).trim();
          // 验证是有效的 IPv4 地址
          if (ip && /^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
            result.ipv4 = ip;
            log(LOG_LEVELS.DEBUG, '✅', requestId, `IPv4 获取成功：${ip} [${url}]`);
            break;
          }
        }
      } catch (e: any) {
        log(LOG_LEVELS.DEBUG, '⚠️', requestId, `IPv4 API 失败 [${url}]`);
        continue;
      }
    }
    
    // 获取 IPv6
    for (const url of ipv6Apis) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
        if (response.ok) {
          const ip = (await response.text()).trim();
          // 验证是有效的 IPv6 地址
          if (ip && /^[a-fA-F\d:]+$/.test(ip) && ip.includes(':')) {
            result.ipv6 = ip;
            log(LOG_LEVELS.DEBUG, '✅', requestId, `IPv6 获取成功：${ip} [${url}]`);
            break;
          }
        }
      } catch (e: any) {
        log(LOG_LEVELS.DEBUG, '⚠️', requestId, `IPv6 API 失败 [${url}]`);
        continue;
      }
    }
    
    // 如果获取到了至少一个 IP
    if (result.ipv4 || result.ipv6) {
      // 缓存 30 分钟
      ipCache.set('client-ip', result);
      
      const duration = Date.now() - startTime;
      log(LOG_LEVELS.INFO, '✅', requestId, 
        `API 获取成功 (${duration}ms)`,
        `IPv4: ${result.ipv4 || '无'}, IPv6: ${result.ipv6 || '无'}`
      );
      
      return { ...result, source: 'api' };
    }
    
    throw new Error('未能获取到任何 IP 地址');
  } catch (error: any) {
    memoryStats.apiFailures++;
    log(LOG_LEVELS.ERROR, '❌', requestId, `API 调用失败：${error.message}`);
  }
  
  // 4. 降级到本地 IP
  const localIP = req.socket.remoteAddress || 'unknown';
  memoryStats.localFallbacks++;
  
  log(LOG_LEVELS.WARN, '⚠️', requestId, `降级到本地 IP: ${localIP}`);
  
  return {
    ipv4: localIP.includes(':') ? undefined : localIP,
    ipv6: localIP.includes(':') ? localIP : undefined,
    source: 'local',
  };
}

import { Request } from 'express';
import { AppDataSource } from '../config/data-source';
import { OperationLog } from '../models/OperationLog';

const operationLogRepository = AppDataSource.getRepository(OperationLog);

// 验证 IP 地址是否有效（排除本地地址）
function isValidIP(ip: string): boolean {
  if (!ip) return false;
  
  // 排除本地回环地址
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return false;
  }
  
  // 排除私有地址段
  const privateRanges = [
    /^10\./,                          // 10.0.0.0/8
    /^172\.(1[6-9]|2\d|3[01])\./,     // 172.16.0.0/12
    /^192\.168\./,                    // 192.168.0.0/16
    /^169\.254\./,                    // 169.254.0.0/16 (Link-local)
    /^fc00:/i,                        // fc00::/7 (Unique local)
    /^fe80:/i,                        // fe80::/10 (Link-local)
  ];
  
  return !privateRanges.some(regex => regex.test(ip));
}

// 判断是否为 IPv4 地址
function isIPv4(ip: string): boolean {
  return /^\d+\.\d+\.\d+\.\d+$/.test(ip);
}

// 判断是否为 IPv6 地址
function isIPv6(ip: string): boolean {
  return ip.includes(':');
}

// 获取客户端 IP（优先级：IPv4 > IPv6）
export const getClientIP = (req: Request): string => {
  // 1. 从 X-Forwarded-For 获取（代理场景）
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const ips = forwarded.split(',').map(ip => ip.trim());
    
    // 优先返回 IPv4 地址
    const ipv4 = ips.find(ip => isIPv4(ip) && isValidIP(ip));
    if (ipv4) {
      return ipv4;
    }
    
    // 如果没有 IPv4，返回第一个有效的 IPv6 地址
    const ipv6 = ips.find(ip => isIPv6(ip) && isValidIP(ip));
    if (ipv6) {
      return ipv6;
    }
  }
  
  // 2. 从 X-Real-IP 获取（Nginx 代理）
  const realIP = req.headers['x-real-ip'] as string;
  if (realIP && isValidIP(realIP)) {
    return realIP;
  }
  
  // 3. 从 socket 获取（直接连接）
  const remoteAddress = req.socket.remoteAddress;
  if (remoteAddress) {
    // 处理 IPv6 映射的 IPv4 (::ffff:127.0.0.1 -> 127.0.0.1)
    const ipv4Match = remoteAddress.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (ipv4Match) {
      return ipv4Match[1];
    }
    
    // 如果是纯 IPv6 地址，也返回
    if (isIPv6(remoteAddress) && isValidIP(remoteAddress)) {
      return remoteAddress;
    }
    
    // 如果是 IPv4 地址，直接返回
    if (isIPv4(remoteAddress) && isValidIP(remoteAddress)) {
      return remoteAddress;
    }
  }
  
  return 'unknown';
};

// IP 地址脱敏（仅 IPv4 脱敏，IPv6 保持完整）
export const anonymizeIp = (ip: string): string => {
  if (!ip || ip === 'unknown') return 'unknown';
  
  // 处理 IPv6 映射的 IPv4 (::ffff:127.0.0.1 -> 127.0.0.1)
  const ipv4Match = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (ipv4Match) {
    return ipv4Match[1].replace(/\.\d+$/, '.0');
  }
  
  // 处理纯 IPv4
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
    return ip.replace(/\.\d+$/, '.0');
  }
  
  // IPv6 地址保持完整（不脱敏）
  if (ip.includes(':')) {
    return ip;
  }
  
  return ip;
};

// 操作日志装饰器
export function LogOperation(action: string, module: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const req = args[0] as Request;
      const userId = (req as any).user?.id;
      const ip = anonymizeIp(getClientIP(req));
      const userAgent = req.headers['user-agent'] || '';

      try {
        const result = await original.apply(this, args);

        // 成功日志
        await operationLogRepository.save({
          id: crypto.randomUUID(),
          userId,
          action,
          module,
          ip,
          userAgent,
          status: 'success',
          message: `${action} executed successfully`,
        });

        return result;
      } catch (error: any) {
        // 失败日志
        await operationLogRepository.save({
          id: crypto.randomUUID(),
          userId,
          action,
          module,
          ip,
          userAgent,
          status: 'fail',
          message: error?.message || 'Unknown error',
          metadata: error?.details || null,
        });
        throw error;
      }
    };
  };
}

import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/data-source';
import { OperationLog } from '../models/OperationLog';
import { getClientIP, anonymizeIp } from './logOperation';

const operationLogRepository = AppDataSource.getRepository(OperationLog);

// 日志队列（批量写入）
const logQueue: Partial<OperationLog>[] = [];
const QUEUE_SIZE = 20;
const FLUSH_INTERVAL = 5000; // 5 秒强制刷新

// 异步批量写入
async function flushQueue() {
  if (logQueue.length === 0) return;
  
  const logs = logQueue.splice(0, QUEUE_SIZE);
  try {
    await operationLogRepository.save(logs);
    console.log(`[操作日志] 批量写入 ${logs.length} 条`);
  } catch (error) {
    console.error('[操作日志] 写入失败:', error);
  }
}

// 定时刷新
setInterval(flushQueue, FLUSH_INTERVAL);

// 进程退出前清空队列
process.on('exit', () => {
  if (logQueue.length > 0) {
    operationLogRepository.save(logQueue).catch(console.error);
  }
});

interface LogOptions {
  action: string;
  module: string;
  getMessage?: (req: Request, res: Response) => string;
  getUserId?: (req: Request, res: Response) => string | null;
}

export function recordOperationLog(options: LogOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    
    res.json = function(data: any) {
      // 只在成功时记录（statusCode < 400）
      if (res.statusCode < 400) {
        // 优先从 req.user 获取，其次从 options.getUserId 获取
        const userId = (req as any).user?.id || options.getUserId?.(req, res) || null;
        
        // 异步写入（不阻塞响应）
        const logData: Partial<OperationLog> = {
          id: crypto.randomUUID(),
          userId: userId,
          action: options.action,
          module: options.module,
          ip: anonymizeIp(getClientIP(req)),
          userAgent: req.headers['user-agent'] || '',
          status: 'success',
          message: options.getMessage 
            ? options.getMessage(req, res) 
            : (data?.message || `${options.action} executed successfully`),
        };
        
        logQueue.push(logData);
        
        // 队列满时立即写入
        if (logQueue.length >= QUEUE_SIZE) {
          flushQueue().catch(console.error);
        }
      }
      
      return originalJson(data);
    };
    
    next();
  };
}

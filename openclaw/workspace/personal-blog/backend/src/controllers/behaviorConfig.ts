import { Request, Response } from 'express';
import { AppDataSource } from '../config/data-source';
import { AuthRequest } from '../middlewares/auth';
import { broadcastConfigUpdate } from './logsStream';
import { configCache } from './logs';

const configRepository = AppDataSource.getRepository('behavior_config');

// 获取当前配置（用于广播）
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

// 获取所有配置
export const getBehaviorConfig = async (req: AuthRequest, res: Response) => {
  try {
    const configs = await AppDataSource.query('SELECT * FROM behavior_config ORDER BY config_key');
    
    const configObj: Record<string, any> = {};
    configs.forEach((c: any) => {
      configObj[c.config_key] = {
        value: c.config_value,
        description: c.description,
        updatedAt: c.updated_at,
      };
    });
    
    // 如果 enabled 配置不存在，添加默认值
    if (!configObj.enabled) {
      configObj.enabled = {
        value: 'true',
        description: '是否启用行为追踪',
        updatedAt: new Date().toISOString(),
      };
    }
    
    res.json({
      status: 'success',
      data: configObj,
    });
  } catch (error: any) {
    console.error('获取配置失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取配置失败',
    });
  }
};

// 更新配置
export const updateBehaviorConfig = async (req: AuthRequest, res: Response) => {
  try {
    const { configKey, configValue } = req.body;
    
    if (!configKey || configValue === undefined) {
      return res.status(400).json({
        status: 'error',
        message: '缺少必要参数',
      });
    }
    
    // 验证配置值
    if (['report_threshold', 'report_interval'].includes(configKey)) {
      const numValue = parseInt(configValue);
      if (isNaN(numValue) || numValue < 1) {
        return res.status(400).json({
          status: 'error',
          message: '配置值必须为正整数',
        });
      }
      
      // 限制范围
      if (configKey === 'report_threshold' && (numValue < 1 || numValue > 100)) {
        return res.status(400).json({
          status: 'error',
          message: '上报条数必须在 1-100 之间',
        });
      }
      
      if (configKey === 'report_interval' && (numValue < 5 || numValue > 300)) {
        return res.status(400).json({
          status: 'error',
          message: '上报间隔必须在 5-300 秒之间',
        });
      }
    }
    
    if (configKey === 'enabled') {
      if (!['true', 'false'].includes(configValue)) {
        return res.status(400).json({
          status: 'error',
          message: '启用状态必须为 true 或 false',
        });
      }
    }
    
    await AppDataSource.query(
      `UPDATE behavior_config SET config_value = ? WHERE config_key = ?`,
      [configValue, configKey]
    );
    
    // 清除缓存（强制下次查询数据库）
    configCache.del(`config:${configKey}`);
    console.log(`[配置缓存] 已清除：config:${configKey}`);
    
    // 广播配置更新给所有客户端
    broadcastConfigUpdate(await getCurrentConfig());
    
    res.json({
      status: 'success',
      message: '配置已更新',
    });
  } catch (error: any) {
    console.error('更新配置失败:', error);
    res.status(500).json({
      status: 'error',
      message: '更新配置失败',
    });
  }
};

// 批量更新配置
export const batchUpdateBehaviorConfig = async (req: AuthRequest, res: Response) => {
  try {
    const { configs } = req.body;
    
    if (!configs || typeof configs !== 'object') {
      return res.status(400).json({
        status: 'error',
        message: '配置数据格式错误',
      });
    }
    
    for (const [key, value] of Object.entries(configs)) {
      await AppDataSource.query(
        `UPDATE behavior_config SET config_value = ? WHERE config_key = ?`,
        [String(value), key]
      );
      
      // 清除每个被修改配置的缓存
      configCache.del(`config:${key}`);
      console.log(`[配置缓存] 已清除：config:${key}`);
    }
    
    // 广播配置更新给所有客户端
    broadcastConfigUpdate(await getCurrentConfig());
    
    res.json({
      status: 'success',
      message: '配置已批量更新',
    });
  } catch (error: any) {
    console.error('批量更新配置失败:', error);
    res.status(500).json({
      status: 'error',
      message: '批量更新配置失败',
    });
  }
};

// 获取客户端配置（公开接口，供前端 SDK 使用）
export const getClientConfig = async (req: Request, res: Response) => {
  try {
    const configs = await AppDataSource.query(
      `SELECT config_key, config_value FROM behavior_config`
    );
    
    const configObj: Record<string, any> = {};
    configs.forEach((c: any) => {
      configObj[c.config_key] = c.config_value;
    });
    
    // 只返回客户端需要的配置，如果数据库中没有配置则使用默认值
    res.json({
      status: 'success',
      data: {
        reportThreshold: parseInt(configObj.report_threshold) || 3,
        reportInterval: parseInt(configObj.report_interval) || 30,
        enabled: configObj.enabled === undefined ? true : configObj.enabled === 'true',
      },
    });
  } catch (error: any) {
    console.error('获取客户端配置失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取配置失败',
    });
  }
};

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { FiSave, FiRefreshCw, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import { behaviorConfigApi } from '../../services/api';
import { useAuthStore } from '../../stores';

interface ConfigItem {
  value: string;
  description: string;
  updatedAt: string;
}

interface ConfigData {
  report_threshold: ConfigItem;
  report_interval: ConfigItem;
  enabled: ConfigItem;
}

export function BehaviorSettings() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [formData, setFormData] = useState({
    reportThreshold: 3,
    reportInterval: 30,
    enabled: true,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 权限检查
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  // 获取配置
  const { data, refetch } = useQuery({
    queryKey: ['behaviorConfig'],
    queryFn: () => behaviorConfigApi.getConfig(),
    enabled: isAuthenticated && user?.role === 'admin',
    staleTime: 0,      // 立即过期
    gcTime: 0,         // v5 中正确的参数名（原 cacheTime）
    refetchOnMount: true,
  });

  // 加载配置到表单
  useEffect(() => {
    console.log('[行为设置] useQuery data:', data);
    
    // TanStack Query + axios 的嵌套结构：data?.data?.data
    const configData = data?.data?.data;
    
    if (configData) {
      const config = configData as unknown as ConfigData;
      console.log('[行为设置] enabled 原始值:', config.enabled?.value);
      console.log('[行为设置] enabled 判断:', config.enabled?.value !== 'false');
      
      setFormData({
        reportThreshold: parseInt(config.report_threshold?.value) || 3,
        reportInterval: parseInt(config.report_interval?.value) || 30,
        enabled: config.enabled?.value !== 'false',
      });
    }
  }, [data?.data?.data]);

  // 更新配置
  const updateMutation = useMutation({
    mutationFn: (updates: { configKey: string; configValue: string }) =>
      behaviorConfigApi.updateConfig(updates.configKey, updates.configValue),
    onSuccess: () => {
      setMessage({ type: 'success', text: '配置已保存，客户端将实时更新' });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (err: any) => {
      setMessage({ type: 'error', text: err.response?.data?.message || '保存失败' });
      setTimeout(() => setMessage(null), 3000);
    },
  });

  // 保存单个配置
  const handleSave = async (configKey: string, configValue: string) => {
    updateMutation.mutate({ configKey, configValue });
  };

  // 批量保存
  const handleSaveAll = async () => {
    try {
      await behaviorConfigApi.batchUpdateConfig({
        report_threshold: String(formData.reportThreshold),
        report_interval: String(formData.reportInterval),
        enabled: String(formData.enabled),
      });
      setMessage({ type: 'success', text: '配置已保存，客户端将实时更新' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: '保存失败' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (!isAuthenticated || user?.role !== 'admin') {
    return <div>正在跳转...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">信息收集设置</h1>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <FiRefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 启用开关 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">启用行为追踪</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              关闭后将停止收集用户行为数据
            </p>
          </div>
          <button
            onClick={() => {
              const newEnabled = !formData.enabled;
              setFormData(prev => ({ ...prev, enabled: newEnabled }));
              handleSave('enabled', newEnabled ? 'true' : 'false');
            }}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          >
            {formData.enabled ? (
              <>
                <FiToggleRight className="w-6 h-6 text-green-600" />
                <span className="text-green-600 font-medium">已启用</span>
              </>
            ) : (
              <>
                <FiToggleLeft className="w-6 h-6 text-gray-400" />
                <span className="text-gray-400 font-medium">已禁用</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 上报条数设置 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">上报数据条数</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              攒够多少条数据后上报一次
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="100"
              value={formData.reportThreshold}
              onChange={(e) => setFormData(prev => ({ ...prev, reportThreshold: parseInt(e.target.value) || 1 }))}
              className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={() => handleSave('report_threshold', String(formData.reportThreshold))}
              disabled={updateMutation.isPending}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <FiSave className="w-4 h-4" />
              保存
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          范围：1-100 条，当前值：{formData.reportThreshold} 条
        </div>
      </div>

      {/* 上报间隔设置 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">上报时间间隔</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              每隔多少秒上报一次数据（即使用户没有交互）
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="5"
              max="300"
              value={formData.reportInterval}
              onChange={(e) => setFormData(prev => ({ ...prev, reportInterval: parseInt(e.target.value) || 30 }))}
              className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">秒</span>
            <button
              onClick={() => handleSave('report_interval', String(formData.reportInterval))}
              disabled={updateMutation.isPending}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <FiSave className="w-4 h-4" />
              保存
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          范围：5-300 秒，当前值：{formData.reportInterval} 秒
        </div>
      </div>

      {/* 批量保存 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">批量保存</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              一次性保存所有配置
            </p>
          </div>
          <button
            onClick={handleSaveAll}
            disabled={updateMutation.isPending}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <FiSave className="w-4 h-4" />
            保存全部
          </button>
        </div>
      </div>

      {/* 当前配置预览 */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">当前配置</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">启用状态</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {formData.enabled ? '✅ 已启用' : '❌ 已禁用'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">上报条数</span>
            <span className="text-gray-900 dark:text-white font-medium">{formData.reportThreshold} 条</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">上报间隔</span>
            <span className="text-gray-900 dark:text-white font-medium">{formData.reportInterval} 秒</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-gray-500 dark:text-gray-400">预计每用户每小时上报次数</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {formData.enabled ? Math.ceil(3600 / formData.reportInterval) : 0} 次
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

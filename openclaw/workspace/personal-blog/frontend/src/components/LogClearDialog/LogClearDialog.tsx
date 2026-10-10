import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { logsApi } from '../../services/api';
import { FiAlertTriangle, FiLoader } from 'react-icons/fi';

interface LogClearDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (days: number, type: string) => Promise<void>;
}

type LogType = 'behavior' | 'operation' | 'all';

export function LogClearDialog({ open, onClose, onConfirm }: LogClearDialogProps) {
  const [days, setDays] = useState(90);
  const [logType, setLogType] = useState<LogType>('behavior');
  const [loading, setLoading] = useState(false);

  // 获取预览数据 - 当天数或类型变化时自动重新查询
  const { data: previewData, isLoading: previewLoading } = useQuery({
    queryKey: ['clearLogsPreview', days, logType],
    queryFn: async () => {
      const response = await logsApi.getClearPreview(days, logType);
      return response.data;
    },
    enabled: open,
    staleTime: 1000 * 60 * 5, // 5 分钟内使用缓存
  });

  const previewCount = previewData?.count || 0;
  const details = previewData?.details || { behavior: 0, operation: 0 };

  // 关闭时重置状态
  useEffect(() => {
    if (!open) {
      setDays(90);
      setLogType('behavior');
      setLoading(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (previewCount === 0) {
      alert('没有需要清理的日志');
      return;
    }

    const message = logType === 'all' 
      ? `将清理 ${details.behavior} 条行为日志和 ${details.operation} 条操作日志，共 ${previewCount} 条`
      : logType === 'behavior'
      ? `将清理 ${previewCount} 条行为日志`
      : `将清理 ${previewCount} 条操作日志`;

    if (!confirm(`⚠️ 确认清理\n\n${message}\n\n此操作不可恢复，确定继续吗？`)) {
      return;
    }

    setLoading(true);
    try {
      await onConfirm(days, logType);
      onClose();
    } catch (error: any) {
      alert(error.message || '清理失败');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* 标题 */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-xl">🗑️</span>
            清理日志
          </h2>
        </div>

        {/* 内容区域 */}
        <div className="px-6 py-4 space-y-4">
          {/* 天数输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              清理天数
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="365"
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value) || 0)}
                className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <span className="text-gray-500 dark:text-gray-400">天前的数据</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              将清理 {new Date(Date.now() - days * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN')} 之前的日志
            </p>
          </div>

          {/* 日志类型选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              日志类型
            </label>
            <div className="space-y-2">
              {/* 行为日志 */}
              <label className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="logType"
                    checked={logType === 'behavior'}
                    onChange={() => setLogType('behavior')}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">行为日志</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {previewLoading ? (
                    <FiLoader className="w-4 h-4 animate-spin" />
                  ) : (
                    `预计：${logType === 'behavior' ? previewCount : details.behavior.toLocaleString()} 条`
                  )}
                </span>
              </label>

              {/* 操作日志 */}
              <label className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="logType"
                    checked={logType === 'operation'}
                    onChange={() => setLogType('operation')}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">操作日志</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {previewLoading ? (
                    <FiLoader className="w-4 h-4 animate-spin" />
                  ) : (
                    `预计：${logType === 'operation' ? previewCount : details.operation.toLocaleString()} 条`
                  )}
                </span>
              </label>

              {/* 全部日志 */}
              <label className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="logType"
                    checked={logType === 'all'}
                    onChange={() => setLogType('all')}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">全部日志</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {previewLoading ? (
                    <FiLoader className="w-4 h-4 animate-spin" />
                  ) : (
                    `预计：${previewCount.toLocaleString()} 条`
                  )}
                </span>
              </label>
            </div>
          </div>

          {/* 警告提示 */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <FiAlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                此操作不可恢复
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                清理后的日志将无法恢复，请谨慎操作
              </p>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || previewCount === 0}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <FiLoader className="w-4 h-4 animate-spin" />
                清理中...
              </>
            ) : (
              '确认清理'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

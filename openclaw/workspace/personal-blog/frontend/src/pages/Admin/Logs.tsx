import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { logsApi } from '../../services/api';
import { useAuthStore } from '../../stores';
import { LogsRealtime } from './LogsRealtime';
import { BehaviorSettings } from './BehaviorSettings';
import { LogClearDialog } from '../../components/LogClearDialog/LogClearDialog';
import { FiEye, FiTrash2, FiActivity, FiSettings } from 'react-icons/fi';

interface OperationLog {
  id: string;
  userId: string;
  user?: {
    id: string;
    nickname: string;
    avatar?: string;
  };
  action: string;
  module: string;
  ip: string;
  userAgent: string;
  status: 'success' | 'fail';
  message: string;
  createdAt: string;
}

export function Logs() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'realtime' | 'operations' | 'behavior'>('realtime');
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    action: '',
    module: '',
    status: '',
    userId: '',
  });

  // 权限检查
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  // 获取操作日志
  const { data: logsData, isLoading, refetch } = useQuery({
    queryKey: ['operationLogs', filters],
    queryFn: () => logsApi.getOperationLogs({
      page: 1,
      limit: 50,
      ...filters,
    }),
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // 清理日志
  const clearMutation = useMutation({
    mutationFn: (data: { days: number; type: string }) =>
      logsApi.clearOldLogs(data.days, data.type),
    onSuccess: (response) => {
      const { deleted, details } = response.data;
      let message = `清理完成！共清理 ${deleted} 条日志`;
      if (details.behavior > 0 && details.operation > 0) {
        message = `清理完成！清理行为日志 ${details.behavior} 条，操作日志 ${details.operation} 条`;
      } else if (details.behavior > 0) {
        message = `清理完成！清理行为日志 ${details.behavior} 条`;
      } else if (details.operation > 0) {
        message = `清理完成！清理操作日志 ${details.operation} 条`;
      }
      alert(message);
      refetch();
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || '清理失败');
    },
  });

  const handleClear = () => {
    setClearDialogOpen(true);
  };

  const handleConfirmClear = async (days: number, type: string) => {
    await clearMutation.mutateAsync({ days, type });
  };

  if (!isAuthenticated || user?.role !== 'admin') {
    return <div>正在跳转...</div>;
  }

  const logs = logsData?.data?.data?.logs || [];
  const pagination = logsData?.data?.data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">日志管理</h1>
        <button
          onClick={handleClear}
          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <FiTrash2 className="w-4 h-4" />
          清理日志
        </button>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('realtime')}
          className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'realtime'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <FiActivity className="w-4 h-4" />
          实时看板
        </button>
        <button
          onClick={() => setActiveTab('operations')}
          className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'operations'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <FiEye className="w-4 h-4" />
          操作日志
        </button>
        <button
          onClick={() => setActiveTab('behavior')}
          className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'behavior'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <FiSettings className="w-4 h-4" />
          行为设置
        </button>
      </div>

      {/* 实时看板 */}
      {activeTab === 'realtime' && <LogsRealtime />}

      {/* 行为设置 */}
      {activeTab === 'behavior' && <BehaviorSettings />}

      {/* 操作日志列表 */}
      {activeTab === 'operations' && (
        <div className="space-y-4">
          {/* 筛选器 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filters.module}
              onChange={(e) => setFilters({ ...filters, module: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="">全部模块</option>
              <option value="AUTH">认证</option>
              <option value="POST">文章</option>
              <option value="COMMENT">评论</option>
              <option value="PHOTO">照片</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="">全部状态</option>
              <option value="success">成功</option>
              <option value="fail">失败</option>
            </select>
          </div>

          {/* 日志表格 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">时间</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">用户</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">操作</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">模块</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">IP</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      加载中...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      暂无日志
                    </td>
                  </tr>
                ) : (
                  logs.map((log: OperationLog) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {new Date(log.createdAt).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <img
                            src={log.user?.avatar || `https://ui-avatars.com/api/?name=${log.user?.nickname || 'U'}&background=random`}
                            alt={log.user?.nickname || '用户'}
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="text-gray-900 dark:text-white">
                            {log.user?.nickname || '游客'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {log.action}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                          {log.module}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {log.ip}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            log.status === 'success'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          {log.status === 'success' ? '成功' : '失败'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {pagination && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>
                共 {pagination.total} 条，第 {pagination.page}/{pagination.totalPages} 页
              </span>
            </div>
          )}
        </div>
      )}

      {/* 清理日志弹窗 */}
      <LogClearDialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        onConfirm={handleConfirmClear}
      />
    </div>
  );
}

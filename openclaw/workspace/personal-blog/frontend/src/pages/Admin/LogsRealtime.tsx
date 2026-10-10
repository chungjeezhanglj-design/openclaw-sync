import { useState, useEffect, useRef } from 'react';
import { FiUsers, FiEye, FiClock, FiActivity } from 'react-icons/fi';
import { GpsToleranceSlider } from '../../components/GpsToleranceSlider/GpsToleranceSlider';

interface OnlineUser {
  sessionId: string;
  deviceId: string;
  userId?: string;
  nickname?: string;
  ipv4?: string;
  ipv6?: string;
  locationName?: string;
  pageUrl: string;
  lastActiveAt: string;
}

interface RecentView {
  articleId?: string;
  articleTitle?: string;
  userId?: string;
  nickname?: string;
  isGuest: boolean;
  locationName?: string;
  timestamp: string;
}

interface TodayStats {
  pv: number;
  uv: number;
  avgStayDuration: number;
}

interface RealtimeData {
  onlineUsers: OnlineUser[];
  recentViews: RecentView[];
  todayStats: TodayStats;
}

export function LogsRealtime() {
  const [data, setData] = useState<RealtimeData | null>(null);
  const [converting, setConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [tolerance, setTolerance] = useState<number>(50);
  const eventSource = useRef<EventSource | null>(null);

  // 转换 GPS 地址
  const convertGPSAddresses = async () => {
    setConverting(true);
    setConvertProgress({ current: 0, total: 0 });
    
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch('/api/logs/convert-gps', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ toleranceMeters: tolerance }), // 传递容差值
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '转换失败');
      }
      
      // 读取 SSE 流式进度
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const msg = JSON.parse(line.slice(6));
              if (msg.progress) {
                setConvertProgress({
                  current: msg.progress.current,
                  total: msg.progress.total,
                });
              } else if (msg.status === 'success') {
                setConvertProgress(null);
                alert(`地址转换完成！成功转换 ${msg.data.converted}/${msg.data.total} 个地址`);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
      
    } catch (error: any) {
      console.error('转换失败:', error);
      alert(`转换失败：${error.message}`);
      setConvertProgress(null);
    } finally {
      setConverting(false);
    }
  };

  useEffect(() => {
    // 获取 Token
    const token = localStorage.getItem('token');
    const url = `/api/logs/stream${token ? `?token=${token}` : ''}`;
    
    // 连接 SSE
    eventSource.current = new EventSource(url);

    eventSource.current.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setData(parsed);
      } catch (error) {
        console.error('SSE parse error:', error);
      }
    };

    eventSource.current.onerror = (error) => {
      // SSE 连接错误是正常的（网络波动、服务器重启等）
      // 不要关闭连接，让 EventSource 自动重连
      console.debug('SSE 连接中断，将自动重连...');
    };

    return () => {
      eventSource.current?.close();
    };
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 今日概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">今日 PV</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {data.todayStats.pv}
              </p>
            </div>
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-full">
              <FiEye className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">今日 UV</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {data.todayStats.uv}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <FiUsers className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">平均停留时长</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {Math.round(data.todayStats.avgStayDuration)}s
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <FiClock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 在线用户 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FiActivity className="w-5 h-5 text-green-500" />
                在线用户 ({data.onlineUsers.length})
              </h2>
              
              <div className="flex items-center gap-4">
                {/* GPS 容差滑块 */}
                <GpsToleranceSlider onChange={setTolerance} />
                
                {/* 转换按钮 */}
                <button
                  onClick={convertGPSAddresses}
                  disabled={converting}
                  className="px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-700 
                           disabled:bg-gray-400 text-white rounded-lg transition-colors 
                           flex items-center gap-2"
                  title="将有 GPS 坐标的在线用户转换为中文地址"
                >
                  {converting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      转换中... {convertProgress?.current}/{convertProgress?.total}
                    </>
                  ) : (
                    <>
                      📍 转换 GPS 地址
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
            {data.onlineUsers.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                暂无在线用户
              </div>
            ) : (
              data.onlineUsers.map((user, index) => (
                <div key={`${user.sessionId}-${user.deviceId}-${index}`} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                          {user.nickname || (user.userId ? `用户 ${user.userId.slice(0, 8)}...` : '游客')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[200px]">
                          {user.pageUrl}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {user.ipv4 && (
                            <span className="font-mono whitespace-nowrap" title="IPv4">
                              v4: {user.ipv4}
                            </span>
                          )}
                          {user.ipv6 && (
                            <span className="font-mono whitespace-nowrap" title="IPv6">
                              v6: {user.ipv6}
                            </span>
                          )}
                          {user.locationName ? (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="break-all">{user.locationName}</span>
                            </>
                          ) : (
                            user.ipv6 && (
                              <span className="text-orange-400 text-[10px]">
                                （点击转换获取地址）
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(user.lastActiveAt).toLocaleTimeString('zh-CN')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 最近浏览 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FiEye className="w-5 h-5 text-blue-500" />
              最近浏览
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
            {data.recentViews.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                暂无浏览记录
              </div>
            ) : (
              data.recentViews.map((view, index) => (
                <div key={index} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {view.articleTitle || '未知文章'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {view.isGuest ? (
                          view.locationName ? (
                            <span>📍 {view.locationName.substring(0, 20)}...的游客</span>
                          ) : (
                            '游客'
                          )
                        ) : (
                          view.nickname || '未知用户'
                        )}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(view.timestamp).toLocaleString('zh-CN')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

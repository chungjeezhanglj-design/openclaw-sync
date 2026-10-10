import { useState } from 'react';

export function TestGPS() {
  const [logs, setLogs] = useState<string[]>([]);
  const [location, setLocation] = useState<{
    latitude?: number;
    longitude?: number;
    address?: string;
  }>({});

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('zh-CN');
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev]);
  };

  const testGPS = async () => {
    addLog('开始测试 GPS...');

    if (!('geolocation' in navigator)) {
      addLog('❌ 浏览器不支持 Geolocation API');
      return;
    }

    addLog('✅ 浏览器支持 Geolocation API');
    addLog('📍 请求 GPS 权限...');

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            addLog('✅ GPS 获取成功');
            resolve(pos);
          },
          (err) => {
            const errorMessages: Record<number, string> = {
              1: '用户拒绝权限',
              2: '位置不可用',
              3: '超时',
            };
            addLog(`❌ GPS 错误：${errorMessages[err.code] || '未知'} - ${err.message}`);
            reject(err);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 600000
          }
        );
      });

      const { latitude, longitude } = position.coords;
      setLocation({ latitude, longitude });
      addLog(`📍 纬度：${latitude.toFixed(6)}`);
      addLog(`📍 经度：${longitude.toFixed(6)}`);
      addLog(`📍 精度：${position.coords.accuracy} 米`);

      // 调用高德 API
      addLog('🔄 正在获取详细地址...');
      try {
        const response = await fetch(
          `https://restapi.amap.com/v3/geocode/regeo?key=6bc5d2c072de57286a8558fa03f34d29&location=${longitude},${latitude}&output=json`
        );
        const data = await response.json();
        if (data.status === '1' && data.regeocode) {
          const address = data.regeocode.formatted_address;
          setLocation(prev => ({ ...prev, address }));
          addLog(`✅ 地址：${address}`);
        } else {
          addLog('❌ 高德 API 返回错误');
        }
      } catch (error: any) {
        addLog(`❌ 高德 API 失败：${error.message}`);
      }
    } catch (error: any) {
      addLog(`❌ GPS 测试失败：${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          GPS 位置测试
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 shadow">
          <h2 className="text-lg font-semibold mb-4">当前位置信息</h2>
          {location.latitude && (
            <div className="space-y-2 text-sm">
              <p className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">纬度：</span>
                <span className="font-mono">{location.latitude.toFixed(6)}</span>
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">经度：</span>
                <span className="font-mono">{location.longitude?.toFixed(6)}</span>
              </p>
              {location.address && (
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">地址：</span>
                  <span>{location.address}</span>
                </p>
              )}
            </div>
          )}
          {!location.latitude && (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              点击下面按钮获取位置
            </p>
          )}
        </div>

        <button
          onClick={testGPS}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors mb-6"
        >
          测试 GPS 定位
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
          <h2 className="text-lg font-semibold mb-4">调试日志</h2>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">暂无日志</p>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={`text-xs font-mono py-1 ${
                    log.includes('❌')
                      ? 'text-red-600 dark:text-red-400'
                      : log.includes('✅')
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
            使用说明
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <li>1. 点击"测试 GPS 定位"按钮</li>
            <li>2. 允许浏览器获取位置权限</li>
            <li>3. 查看获取的 GPS 坐标和地址</li>
            <li>4. 调试日志会显示详细过程</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

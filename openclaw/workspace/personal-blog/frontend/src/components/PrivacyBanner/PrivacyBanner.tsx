import { useState, useEffect } from 'react';

export function PrivacyBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('privacy_accepted');
    if (!accepted) {
      // 延迟 2 秒显示
      const timer = setTimeout(() => {
        setShow(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('privacy_accepted', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 text-white p-4 z-50 shadow-lg">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm">
          <p className="font-semibold mb-1">🍪 隐私政策提示</p>
          <p>
            本站使用 Cookie 和行为追踪技术来分析用户访问情况，提升用户体验。
            行为数据包括页面浏览、停留时长、滚动深度等，仅用于统计分析。
            登录用户的行为数据将与账户关联，游客则通过设备标识进行匿名追踪。
          </p>
        </div>
        <button
          onClick={handleAccept}
          className="px-6 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg font-medium transition-colors whitespace-nowrap"
        >
          我已知晓
        </button>
      </div>
    </div>
  );
}

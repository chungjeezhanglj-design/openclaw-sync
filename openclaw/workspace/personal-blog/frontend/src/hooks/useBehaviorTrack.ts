import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores';
import {
  initBehaviorTracker,
  trackArticleView,
  trackPageView,
  setUserId,
} from '../utils/behaviorTracker';

// 从 URL 提取文章 ID
function extractArticleId(pathname: string): string | null {
  const match = pathname.match(/^\/post\/([a-f0-9-]+)$/i);
  return match ? match[1] : null;
}

// 获取页面类型
function getPageType(pathname: string): string {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/post/')) return 'article';
  if (pathname.startsWith('/profile')) return 'profile';
  if (pathname.startsWith('/search')) return 'search';
  if (pathname.startsWith('/user/')) return 'user';
  if (pathname.startsWith('/editor/')) return 'editor';
  return 'other';
}

export function useBehaviorTrack() {
  const location = useLocation();
  const { user } = useAuthStore();
  const initialized = useRef(false);
  const articleId = useRef<string | null>(null);

  useEffect(() => {
    // 初始化追踪器
    if (!initialized.current) {
      initBehaviorTracker();
      initialized.current = true;
    }
  }, []);

  useEffect(() => {
    // 用户登录后设置 userId
    if (user?.id) {
      setUserId(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    const pageType = getPageType(location.pathname);
    const article = extractArticleId(location.pathname);

    // 文章 ID 变化时上报
    if (article && article !== articleId.current) {
      articleId.current = article;
      trackArticleView(article);
    }

    // 页面类型变化时上报
    if (pageType !== 'article') {
      trackPageView(pageType);
    }
  }, [location.pathname]);
}

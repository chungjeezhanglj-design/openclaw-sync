/**
 * useBehaviorTrack.test.tsx
 *
 * 覆盖:
 * - 挂载时初始化追踪器 (initBehaviorTracker 只调一次)
 * - 根据 pathname 上报 page_view (home / search / profile / user / editor / other)
 * - /post/:id 路由上报 article_view (且同一 article 不重复上报)
 * - 用户登录后 setUserId
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useBehaviorTrack } from './useBehaviorTrack';

// mock behaviorTracker utils - 用 spy 跟踪调用
vi.mock('../utils/behaviorTracker', () => ({
  initBehaviorTracker: vi.fn(),
  trackArticleView: vi.fn(),
  trackPageView: vi.fn(),
  setUserId: vi.fn(),
}));

import { initBehaviorTracker, trackArticleView, trackPageView, setUserId } from '../utils/behaviorTracker';

function TestHook() {
  useBehaviorTrack();
  return null;
}

function renderAtPath(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TestHook />
    </MemoryRouter>,
  );
}

describe('useBehaviorTrack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初始化', () => {
    it('挂载时调用一次 initBehaviorTracker', () => {
      renderAtPath('/');
      expect(initBehaviorTracker).toHaveBeenCalledTimes(1);
    });

    it('多次重新渲染组件不会重复初始化', () => {
      const { rerender } = render(
        <MemoryRouter initialEntries={['/']}>
          <TestHook />
        </MemoryRouter>,
      );
      // 强制 re-render
      rerender(
        <MemoryRouter initialEntries={['/']}>
          <TestHook />
        </MemoryRouter>,
      );
      expect(initBehaviorTracker).toHaveBeenCalledTimes(1);
    });
  });

  describe('页面类型映射 (pageType)', () => {
    it('根路径 → home', () => {
      renderAtPath('/');
      expect(trackPageView).toHaveBeenCalledWith('home');
    });

    it('/search → search', () => {
      renderAtPath('/search');
      expect(trackPageView).toHaveBeenCalledWith('search');
    });

    it('/profile → profile', () => {
      renderAtPath('/profile');
      expect(trackPageView).toHaveBeenCalledWith('profile');
    });

    it('/user/123 → user', () => {
      renderAtPath('/user/123');
      expect(trackPageView).toHaveBeenCalledWith('user');
    });

    it('/editor/post-1 → editor', () => {
      renderAtPath('/editor/post-1');
      expect(trackPageView).toHaveBeenCalledWith('editor');
    });

    it('未知路径 → other', () => {
      renderAtPath('/some/random/path');
      expect(trackPageView).toHaveBeenCalledWith('other');
    });
  });

  describe('文章页 article_view', () => {
    it('/post/abc-123 → trackArticleView(abc-123)', () => {
      renderAtPath('/post/abc-123-def');
      expect(trackArticleView).toHaveBeenCalledWith('abc-123-def');
    });

    it('文章页不应该调用 trackPageView (被 article 路径接管)', () => {
      renderAtPath('/post/xyz');
      expect(trackPageView).not.toHaveBeenCalled();
    });

    it('article ID 不是合法格式时既不上报 article_view 也不上报 page_view (TODO: 源码 bug)', () => {
      // 当前行为记录: /post/<invalid> → pageType='article', article=null
      // 因为 pageType==='article', pageView 不上报;因为 article===null, articleView 也不上报
      // 这导致 invalid URL 的浏览数据完全丢失 — 是 useBehaviorTrack.ts 的一个真实 bug
      // 后续可以考虑让 getPageType 在 /post/<invalid> 时返回 'other'
      renderAtPath('/post/not-a-uuid');
      expect(trackArticleView).not.toHaveBeenCalled();
      expect(trackPageView).not.toHaveBeenCalled();
    });
  });

  describe('userId 同步', () => {
    it('用户登录后调用 setUserId', async () => {
      const { useAuthStore } = await import('../stores');
      // 模拟登录状态
      useAuthStore.setState({
        user: { id: 'u-1', email: 'a@b.com', role: 'user' } as any,
        isAuthenticated: true,
      });

      renderAtPath('/');

      expect(setUserId).toHaveBeenCalledWith('u-1');
    });

    it('用户未登录时 (user=null) 不调用 setUserId', () => {
      renderAtPath('/');
      expect(setUserId).not.toHaveBeenCalled();
    });
  });
});

/**
 * 前端全局测试 setup
 *
 * 关键: localStorage/sessionStorage 必须在所有 import 之前完成 stub,
 * 否则 zustand persist 等依赖 storage 的库会在模块初始化时捕获 undefined。
 * 用 vi.hoisted() 把 stub 代码提到 import 之前执行。
 */
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// === vi.hoisted: 在所有 import 之前执行 ===
const { installStoragePolyfill, matchMediaPolyfill, resizeObserverPolyfill } = vi.hoisted(() => {
  // localStorage / sessionStorage 内存兜底
  function createMemoryStorage(): Storage {
    const store = new Map<string, string>();
    return {
      get length() {
        return store.size;
      },
      clear() {
        store.clear();
      },
      getItem(key: string): string | null {
        return store.get(key) ?? null;
      },
      key(index: number): string | null {
        return Array.from(store.keys())[index] ?? null;
      },
      removeItem(key: string) {
        store.delete(key);
      },
      setItem(key: string, value: string) {
        store.set(key, value);
      },
    };
  }

  // 强制覆盖 — 即使 jsdom 有 storage,也用我们的内存实现,避免 jsdom 怪行为
  const storage: Storage = createMemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: createMemoryStorage(),
    writable: true,
    configurable: true,
  });

  // matchMedia (Leaflet 等组件会用到)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // ResizeObserver polyfill
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as any).ResizeObserver = ResizeObserverMock;

  return {
    installStoragePolyfill: () => {},
    matchMediaPolyfill: () => {},
    resizeObserverPolyfill: () => {},
  };
});
// === hoisted end ===

// 现在 import zustand stores,它们会看到已就位的 localStorage
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { useAuthStore, useLayoutStore, useThemeStore } from '../stores';

// 每个测试前清理 storage + zustand stores
beforeEach(() => {
  try {
    globalThis.localStorage?.clear?.();
    globalThis.sessionStorage?.clear?.();
  } catch {
    // 静默
  }

  // zustand 是模块级单例,必须手动重置
  useAuthStore.setState({
    user: null,
    token: null,
    isAuthenticated: false,
    isEditor: false,
    isAdmin: false,
  });
  useLayoutStore.setState({ layoutType: 'timeline' });
  useThemeStore.setState({ isDark: false });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LayoutType } from '../types';
import { authApi } from '../services/api';

export type UserRole = 'user' | 'editor' | 'admin';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isEditor: boolean;
  isAdmin: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isEditor: false,
      isAdmin: false,
      setAuth: (user, token) => {
        localStorage.setItem('token', token);
        const role = user.role as UserRole;
        set({ 
          user, 
          token, 
          isAuthenticated: true,
          isEditor: role === 'editor' || role === 'admin',
          isAdmin: role === 'admin',
        });
      },
      logout: async () => {
        // 调用后端登出 API
        try {
          await authApi.logout();
        } catch (error) {
          console.error('登出 API 调用失败:', error);
        }
        // 清除本地状态
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false, isEditor: false, isAdmin: false });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: false,
      toggleTheme: () => set((state) => {
        const newDark = !state.isDark;
        if (newDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        return { isDark: newDark };
      }),
    }),
    {
      name: 'theme-storage',
    }
  )
);

interface LayoutState {
  layoutType: LayoutType;
  setLayoutType: (type: LayoutType) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      layoutType: 'timeline',
      setLayoutType: (type) => set({ layoutType: type }),
    }),
    {
      name: 'layout-storage',
    }
  )
);

interface SearchState {
  isSearchMode: boolean;
  triggerSearch: () => void;
  exitSearch: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  isSearchMode: false,
  triggerSearch: () => set({ isSearchMode: true }),
  exitSearch: () => set({ isSearchMode: false }),
}));

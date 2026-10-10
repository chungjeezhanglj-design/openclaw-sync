import axios from 'axios';
import { User, Post, Photo, Tag, Comment, Pagination } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 认证API
export const authApi = {
  register: (data: { email: string; password: string; nickname: string }) =>
    api.post<{ data: { user: User; token: string } }>('/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post<{ data: { user: User; token: string } }>('/auth/login', data),
  
  getWechatAuthUrl: () =>
    api.get<{ data: { authUrl: string } }>('/auth/wechat'),
  
  getProfile: () =>
    api.get<{ data: { user: User } }>('/auth/profile'),
  
  updateProfile: (data: Partial<User>) =>
    api.put<{ data: { user: User } }>('/auth/profile', data),

  updateSettings: (data: { displayTimePreference?: string; displayOrderPreference?: string; aiPromptPresetId?: string }) =>
    api.put<{ data: { displayTimePreference?: string; displayOrderPreference?: string; aiPromptPresetId?: string } }>('/auth/settings', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put<{ message: string }>('/auth/password', data),

  logout: () =>
    api.post('/auth/logout'),
};

// 文章API
export const postsApi = {
  getPosts: (params?: { page?: number; limit?: number; status?: string; tag?: string; layout?: string; sortBy?: string; order?: string; userId?: string }) =>
    api.get<{ data: { posts: Post[]; pagination: Pagination } }>('/posts', { params }),

  getPost: (id: string) =>
    api.get<{ data: { post: Post } }>(`/posts/${id}`),

  createPost: (data: Partial<Post>) =>
    api.post<{ data: { post: Post } }>('/posts', data),

  updatePost: (id: string, data: Partial<Post>) =>
    api.put<{ data: { post: Post } }>(`/posts/${id}`, data),

  deletePost: (id: string) =>
    api.delete(`/posts/${id}`),

  publishPost: (id: string) =>
    api.post(`/posts/${id}/publish`),

  updatePostStatus: (id: string, status: string) =>
    api.put<{ data: { post: Post } }>(`/posts/${id}/status`, { status }),

  likePost: (id: string) =>
    api.post<{ data: { liked: boolean; likeCount: number } }>(`/posts/${id}/like`),

  checkLiked: (id: string) =>
    api.get<{ data: { liked: boolean } }>(`/posts/${id}/liked`),

  getMyPosts: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<{ data: { posts: Post[]; pagination: Pagination } }>('/posts/user/me', { params }),

  getAllPosts: (params?: { page?: number; limit?: number; status?: string; visibility?: string; userId?: string }) =>
    api.get<{ data: { posts: Post[]; pagination: Pagination } }>('/posts/all', { params }),

  unapproveAllComments: (postId: string) =>
    api.post(`/posts/${postId}/unapprove-all`),
};

// 照片API
export const photosApi = {
  uploadPhotos: (files: FileList, postId?: string, exifDataList?: any[]) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('photos', file);
    });
    if (postId) {
      formData.append('postId', postId);
    }
    if (exifDataList) {
      formData.append('exifDataList', JSON.stringify(exifDataList));
    }
    return api.post<{ data: { photos: Photo[] } }>('/photos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  analyzePhoto: (id: string, prompt?: string, presetId?: string) =>
    api.post<{ data: { photo: Photo } }>(`/photos/${id}/analyze`, { prompt, presetId }),
  
  updateCaption: (id: string, caption: string) =>
    api.put<{ data: { photo: Photo } }>(`/photos/${id}/caption`, { caption }),

  updatePhotoTags: (id: string, tags: string[]) =>
    api.put<{ data: { photo: Photo } }>(`/photos/${id}/tags`, { tags }),
  
  getPhotosForMap: () =>
    api.get<{ data: { photos: Photo[] } }>('/photos/map'),
  
  deletePhoto: (id: string) =>
    api.delete(`/photos/${id}`),

  updatePhotosExif: (photos: any[]) =>
    api.put('/photos/batch/exif', { photos }),
};

// 标签API
export const tagsApi = {
  getTags: () =>
    api.get<{ data: { tags: Tag[] } }>('/tags'),
  
  createTag: (data: { name: string; description?: string }) =>
    api.post<{ data: { tag: Tag } }>('/tags', data),
};

// 评论API
export const commentsApi = {
  getComments: (postId: string) =>
    api.get<{ data: { comments: Comment[] } }>(`/comments/post/${postId}`),

  createComment: (postId: string, data: { content: string; parentId?: string }) =>
    api.post<{ data: { comment: Comment } }>(`/comments/post/${postId}`, data),

  deleteComment: (id: string) =>
    api.delete(`/comments/${id}`),

  togglePin: (commentId: string, postId: string) =>
    api.post<{ data: { pinned: boolean } }>(`/comments/${commentId}/pin`, { postId }),

  approve: (commentId: string, postId: string) =>
    api.post<{ data: { approved: boolean } }>(`/comments/${commentId}/approve`, { postId }),

  approveAll: (postId: string) =>
    api.post(`/comments/approve-all`, { postId }),
};

export interface AIPromptPreset {
  id: string;
  name: string;
  type: string;
  description: string;
  prompt: string;
  isDefault: boolean;
  userId?: string;
}

export const aiPromptPresetsApi = {
  getPresets: () =>
    api.get<{ data: { presets: AIPromptPreset[] } }>('/ai-prompts/presets'),

  getPreset: (id: string) =>
    api.get<{ data: { preset: AIPromptPreset | null } }>(`/ai-prompts/presets/${id}`),

  createPreset: (data: { name: string; description?: string; prompt: string; isDefault?: boolean; type?: string }) =>
    api.post<{ data: { preset: AIPromptPreset } }>('/ai-prompts/presets', data),

  updatePreset: (id: string, data: { name: string; description?: string; prompt: string; isDefault?: boolean; type?: string }) =>
    api.put<{ data: { preset: AIPromptPreset } }>(`/ai-prompts/presets/${id}`, data),

  deletePreset: (id: string) =>
    api.delete(`/ai-prompts/presets/${id}`),

  setDefaultPreset: (id: string) =>
    api.post(`/ai-prompts/presets/${id}/set-default`),
};

export interface AiConfig {
  ollamaBaseUrl: string;
  ollamaModel: string;
  customApiUrl: string;
  customApiModel: string;
  aiProvider: string;
  aiPromptPresetId: string | null;
}

export const aiConfigApi = {
  getConfig: () =>
    api.get<{ data: { config: AiConfig } }>('/ai-prompts/ai-config'),

  updateConfig: (data: Partial<AiConfig>) =>
    api.put<{ data: { config: AiConfig } }>('/ai-prompts/ai-config', data),

  getOllamaModels: () =>
    api.get<{ data: { models: { name: string; size: number; modifiedAt: string }[] } }>('/ai-prompts/ollama-models'),
};

// 用户管理API
export const usersApi = {
  getUsers: (params?: { page?: number; limit?: number; role?: string; search?: string }) =>
    api.get<{ data: { users: User[]; pagination: Pagination } }>('/users', { params }),

  getAllUsers: () =>
    api.get<{ data: { users: User[] } }>('/users/all'),

  getUser: (id: string) =>
    api.get<{ data: { user: User } }>(`/users/${id}`),

  getUserById: (id: string) =>
    api.get<{ data: { user: User } }>(`/users/${id}`),

  updateUserRole: (id: string, role: string) =>
    api.put<{ data: { user: User } }>(`/users/${id}/role`, { role }),

  updateUserStatus: (id: string, isActive: boolean) =>
    api.put<{ data: { user: User } }>(`/users/${id}/status`, { isActive }),

  deleteUser: (id: string) =>
    api.delete(`/users/${id}`),

  followUser: (userId: string) =>
    api.post<{ data: { isFollowing: boolean; isFriend: boolean } }>(`/users/${userId}/follow`),

  unfollowUser: (userId: string) =>
    api.delete(`/users/${userId}/follow`),

  getFollowers: (userId: string, params?: { page?: number; limit?: number }) =>
    api.get<{ data: { users: User[]; pagination: Pagination } }>(`/users/${userId}/followers`, { params }),

  getFollowing: (userId: string, params?: { page?: number; limit?: number }) =>
    api.get<{ data: { users: User[]; pagination: Pagination } }>(`/users/${userId}/following`, { params }),

  getFriends: (userId: string, params?: { page?: number; limit?: number }) =>
    api.get<{ data: { users: User[]; pagination: Pagination } }>(`/users/${userId}/friends`, { params }),

  getFollowStatus: (userId: string) =>
    api.get<{ data: { isFollowing: boolean; isFriend: boolean } }>(`/users/${userId}/follow-status`),

  getFollowCounts: (userId: string) =>
    api.get<{ data: { followingCount: number; followersCount: number; friendsCount: number } }>(`/users/${userId}/follow-counts`),

  searchUsers: (q: string, params?: { page?: number; limit?: number }) =>
    api.get<{ data: { users: any[]; pagination: Pagination } }>('/users/search', { params: { q, ...params } }),
};

// 行为配置 API
export const behaviorConfigApi = {
  getClientConfig: () =>
    api.get<{ data: { reportThreshold: number; reportInterval: number; enabled: boolean } }>('/behavior/client-config'),
  
  getConfig: () =>
    api.get<{ data: Record<string, { value: string; description: string; updatedAt: string }> }>('/behavior/config'),
  
  updateConfig: (configKey: string, configValue: string) =>
    api.put<{ data: { message: string } }>('/behavior/config', { configKey, configValue }),
  
  batchUpdateConfig: (configs: Record<string, string>) =>
    api.post<{ data: { message: string } }>('/behavior/config/batch', { configs }),
};

export interface SearchIntent {
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  keywords: string[];
}

export interface SearchPhoto {
  id: string;
  url: string;
  caption: string | null;
  locationName: string | null;
  takenAt: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  post: { id: string; title: string } | null;
}

export const searchApi = {
  parseSearch: (query: string) =>
    api.post<{ data: { originalQuery: string; intent: SearchIntent } }>('/search/parse', { query }),

  searchPhotos: (params: { query?: string; intent?: SearchIntent }) =>
    api.post<{ data: { intent: SearchIntent; photos: SearchPhoto[]; total: number } }>('/search/photos', params),
};

// 日志管理 API
export const logsApi = {
  getOperationLogs: (params?: { page?: number; limit?: number; action?: string; module?: string; status?: string; userId?: string }) =>
    api.get<{ data: { logs: any[]; pagination: Pagination } }>('/logs/operations', { params }),

  getBehaviorStats: (params?: { days?: number }) =>
    api.get<{ data: { daily: any[]; today: { pv: number; uv: number; avgStayDuration: number } } }>('/logs/behavior/stats', { params }),

  getArticleBehavior: (articleId: string, params?: { days?: number }) =>
    api.get<{ data: { stats: any[]; summary: any } }>(`/logs/behavior/article/${articleId}`, { params }),

  getUserBehavior: (userId: string, params?: { days?: number; limit?: number }) =>
    api.get<{ data: { behaviors: any[]; total: number } }>(`/logs/behavior/user/${userId}`, { params }),

  clearOldLogs: (days: number, type: string) =>
    api.delete(`/logs/clear`, { params: { days, type } }),

  getClearPreview: (days: number, type: string) =>
    api.get<{ count: number; details: { behavior: number; operation: number }; type: string }>('/logs/clear/preview', { params: { days, type } }),
};

export default api;

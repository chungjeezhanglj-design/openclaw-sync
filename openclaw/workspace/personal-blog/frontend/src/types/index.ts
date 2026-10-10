export interface User {
  id: string;
  email?: string;
  nickname: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  location?: string;
  website?: string;
  gender?: string;
  birthday?: string;
  displayTimePreference?: string;
  displayOrderPreference?: string;
  aiPromptPresetId?: string;
  role: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type PostStatus = 'draft' | 'published' | 'archived';
export type LayoutType = 'timeline' | 'grid' | 'masonry' | 'map';

export interface Photo {
  id: string;
  url: string;
  caption?: string;
  aiTitle?: string;
  aiTags?: string[];
  aiConfidence?: number;
  gpsLat?: number;
  gpsLng?: number;
  locationName?: string;
  deviceName?: string;
  takenAt?: string;
  order: number;
  // EXIF 扩展信息
  deviceMake?: string;
  deviceModel?: string;
  software?: string;
  imageWidth?: number;
  imageHeight?: number;
  orientation?: number;
  exposureTime?: string;
  fNumber?: number;
  isoSpeed?: number;
  focalLength?: number;
  focalLength35mm?: number;
  flash?: string;
  whiteBalance?: string;
  meteringMode?: string;
  exposureMode?: string;
  lensModel?: string;
  gpsAltitude?: number;
  gpsLatitudeRef?: string;
  gpsLongitudeRef?: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  pinned?: boolean;
  approved?: boolean;
  user: {
    id: string;
    nickname: string;
    avatar?: string;
  };
  replies?: Comment[];
}

export interface Post {
  id: string;
  title: string;
  content?: string;
  layoutType: LayoutType;
  status: PostStatus;
  visibility?: 'public' | 'friends' | 'followers' | 'private';
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    nickname: string;
    avatar?: string;
  };
  tags: Tag[];
  photos: Photo[];
  comments?: Comment[];
  pinnedComment?: Comment | null;
  liked?: boolean;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

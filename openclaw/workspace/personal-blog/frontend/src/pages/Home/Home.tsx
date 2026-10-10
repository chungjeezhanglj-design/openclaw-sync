import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { FiHeart, FiMessageCircle, FiEye, FiShare2, FiMapPin, FiVolume2, FiX, FiSearch, FiChevronDown, FiChevronUp, FiCalendar, FiTag } from 'react-icons/fi'
import { FiHeart as FiHeartOutline } from 'react-icons/fi'
import { postsApi, authApi, searchApi, SearchPhoto, SearchIntent } from '../../services/api'
import { useAuthStore, useLayoutStore, useSearchStore } from '../../stores'
import { LayoutSwitcher } from '../../components/LayoutSwitcher/LayoutSwitcher'
import { Post } from '../../types'
import { MapView } from '../../components/MapView/MapView'
import { speakBlogPost, stopSpeaking } from '../../utils/tts'
import { FollowButton } from '../../components/FollowButton/FollowButton'

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char])
}

interface PostWithLiked extends Post {
  liked?: boolean
}

function getPostLocation(post: PostWithLiked): string {
  if (post.photos && post.photos.length > 0) {
    const photo = post.photos[0]
    if (photo.locationName) {
      return photo.locationName
    }
  }
  return '未知地点'
}

function getPostDisplayDate(post: PostWithLiked): string {
  const takenAt = post.photos?.[0]?.takenAt
  // 优先使用图片拍摄时间
  if (takenAt) {
    const date = new Date(takenAt)
    if (!isNaN(date.getTime())) {
      return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    }
  }
  // 默认显示文章创建时间
  if (post.createdAt) {
    const date = new Date(post.createdAt)
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('zh-CN')
    }
  }
  return ''
}

function getPostDisplayDateShort(post: PostWithLiked): string {
  const takenAt = post.photos?.[0]?.takenAt
  // 优先使用图片拍摄时间（仅日期）
  if (takenAt) {
    const date = new Date(takenAt)
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
    }
  }
  // 默认显示文章创建时间
  if (post.createdAt) {
    const date = new Date(post.createdAt)
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('zh-CN')
    }
  }
  return ''
}

function getTimelineDateDisplay(post: PostWithLiked): string {
  const takenAt = post.photos?.[0]?.takenAt
  if (takenAt) {
    const date = new Date(takenAt)
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
    }
  }
  if (post.createdAt) {
    const date = new Date(post.createdAt)
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
    }
  }
  return ''
}

function getPostYearSafe(post: PostWithLiked): number {
  if (post.photos?.[0]?.takenAt) {
    const date = new Date(post.photos[0].takenAt)
    if (!isNaN(date.getTime())) {
      return date.getFullYear()
    }
  }
  if (post.createdAt) {
    const date = new Date(post.createdAt)
    if (!isNaN(date.getTime())) {
      return date.getFullYear()
    }
  }
  return new Date().getFullYear()
}

function getPostLocationDisplay(post: PostWithLiked): string {
  const location = getPostLocation(post)
  return location || '未知地点'
}

export function Home() {
  const { isAuthenticated, user } = useAuthStore()
  const { layoutType } = useLayoutStore()
  const { isSearchMode, exitSearch } = useSearchStore()
  const navigate = useNavigate()
  const timelineRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [visibleYear, setVisibleYear] = useState<number | null>(null)
  const [playingPostId, setPlayingPostId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchPhoto[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [showSearchOptions, setShowSearchOptions] = useState(false)
  const [editedIntent, setEditedIntent] = useState<SearchIntent | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const searchDropdownRef = useRef<HTMLDivElement>(null)

  const handlePlayPost = useCallback((post: PostWithLiked) => {
    if (playingPostId === post.id) {
      stopSpeaking()
      setPlayingPostId(null)
    } else {
      stopSpeaking()
      const title = post.title || '无标题'
      const content = post.content?.slice(0, 500) || post.photos?.[0]?.caption || '暂无内容'
      setPlayingPostId(post.id)
      speakBlogPost(
        title,
        content,
        () => setPlayingPostId(post.id),
        () => setPlayingPostId(null),
        () => setPlayingPostId(null)
      )
    }
  }, [playingPostId])

  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: () => authApi.getProfile(),
    enabled: isAuthenticated,
  })

  const userSettings = profileData?.data?.data?.user
  const displayTimePreference = userSettings?.displayTimePreference || 'takenAt'
  const displayOrderPreference = userSettings?.displayOrderPreference || 'desc'

  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['posts', displayTimePreference, displayOrderPreference],
    queryFn: ({ pageParam = 1 }) => postsApi.getPosts({ 
      page: pageParam, 
      limit: 12,
      sortBy: 'createdAt',
      order: displayOrderPreference,
    }),
    getNextPageParam: (lastPage) => {
      // TanStack Query v5 + axios: lastPage 是 axios 响应对象
      // lastPage.data 是后端返回的 JSON: { status: 'success', data: {...} }
      const pagination = lastPage?.data?.data?.pagination;
      console.log('[Home] getNextPageParam called:', { 
        hasData: !!lastPage?.data, 
        hasDataData: !!lastPage?.data?.data,
        pagination 
      });
      if (!pagination) return undefined;
      const hasNext = pagination.page < pagination.totalPages;
      const nextPage = hasNext ? pagination.page + 1 : undefined;
      console.log('[Home] hasNextPage:', hasNext, 'nextPage:', nextPage);
      return nextPage;
    },
    initialPageParam: 1,
  })

  const hasSearchResults = searchResults.length > 0

  const convertSearchResultsToPosts = (): PostWithLiked[] => {
    const postMap = new Map<string, any>()
    searchResults.forEach((photo) => {
      if (photo.post && !postMap.has(photo.post.id)) {
        const postPhotos = searchResults
          .filter((p) => p.post?.id === photo.post?.id)
          .map((p) => ({
            id: p.id,
            url: p.url,
            caption: p.caption || '',
            locationName: p.locationName || null,
            takenAt: p.takenAt || null,
            postId: p.post?.id || '',
            createdAt: '',
            updatedAt: '',
            order: 0,
          }))
        const postCreatedAt = photo.takenAt || (photo.post as any)?.createdAt || ''
        postMap.set(photo.post.id, {
          ...photo.post,
          photos: postPhotos,
          layoutType: 'timeline',
          status: 'published',
          viewCount: 0,
          likeCount: 0,
          commentCount: 0,
          tags: [],
          content: photo.post.title || '',
          createdAt: postCreatedAt,
          updatedAt: '',
        })
      }
    })
    return Array.from(postMap.values())
  }

  const searchPosts = convertSearchResultsToPosts()
  // TanStack Query v5 + axios: page 是 axios 响应对象
  // page.data 是后端返回的 JSON: { status: 'success', data: {...} }
  const posts: PostWithLiked[] = hasSearchResults 
    ? searchPosts 
    : (data?.pages?.flatMap(page => page.data?.data?.posts) || [])
  const hasMore = hasNextPage

  // Set initial visible year when posts load
  useEffect(() => {
    if (posts.length > 0 && !visibleYear) {
      setVisibleYear(getPostYear(posts[0]))
    }
  }, [posts.length])

  // Listen for search trigger event from Layout
  useEffect(() => {
    const handleSearchTrigger = () => {
      setShowSearchDropdown(true)
      setTimeout(() => {
        const searchInput = document.querySelector('input[placeholder*="搜索照片"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      }, 100)
    }
    window.addEventListener('trigger-search', handleSearchTrigger)
    return () => window.removeEventListener('trigger-search', handleSearchTrigger)
  }, [])

  const likeMutation = useMutation({
    mutationFn: (id: string) => postsApi.likePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
    onError: (err: any) => {
      console.error('点赞失败:', err.response?.data || err.message)
      alert(err.response?.data?.message || '点赞失败，请登录')
    },
  })

  const handleLike = useCallback((e: React.MouseEvent, post: PostWithLiked) => {
    e.stopPropagation()
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    likeMutation.mutate(post.id)
  }, [isAuthenticated, navigate, likeMutation])

  const handleShare = useCallback((post: Post) => {
    const shareUrl = window.location.origin + `/post/${post.id}`
    const shareTitle = post.title
    const shareText = post.content?.slice(0, 100) || ''
    
    if (navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl,
      }).catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Share error:', error)
        }
      })
    } else {
      // Windows 桌面端：显示分享对话框
      const shareDialog = document.createElement('div')
      shareDialog.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center'
      shareDialog.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">分享文章</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">${escapeHtml(shareTitle)}</p>
          <div class="space-y-2">
            <button id="share-copy" class="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              复制链接
            </button>
            <button id="share-qq" class="w-full px-4 py-2 bg-[#12B7F5] text-white rounded-lg hover:bg-[#0DA5E8] transition-colors flex items-center justify-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z"/>
              </svg>
              分享到 QQ
            </button>
            <button id="share-weibo" class="w-full px-4 py-2 bg-[#E6162D] text-white rounded-lg hover:bg-[#D10E26] transition-colors flex items-center justify-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10.098 20c-4.27 0-8.598-1.85-8.598-6.075 0-3.17 2.15-5.65 5.35-7.075-1.05.575-3.4 1.8-4.8 2.35 0 0-.35-1.025.1-1.525 0 0 .4.05.75.1 2.65-.1 5.35.525 6.2 2.35.1-.05.15-.1.15-.1-.05-.4-.05-1.15 0-1.75.75-1.1 1.9-1.65 2.25-1.8-.75.35-2.4.7-3.6 1.75-2.4-1.4-4.75-1.25-5.75.2.55-1.15 1.55-1.6 2.35-2.5.1-.25.15-.45.15-.45-.8-.05-1.4-.1-1.85-.1-1.6 0-2.9.65-3.55 1.85-.65-.25-1.35-.35-2.05-.35-2.35 0-4.35 1.7-4.35 4.1 0 2.35 2.65 4.35 5.7 4.35h.85c.1 0 .2.05.25.15.05.1.05.2 0 .3l-.95 3.55c-.05.15.05.3.2.35.15.05.3-.05.35-.2l.5-1.7c.05-.15.2-.2.35-.15.15.05.2.2.15.35l-.55 1.9c-.05.15 0 .3.15.4.15.1.35.05.45-.1l1.2-1.9c.9-.2 1.75-.5 2.55-.9.15-.05.35-.05.5 0 .15.05.25.2.2.35l-.6 3.3c-.05.2.1.35.3.35.2 0 .35-.15.35-.35l.65-3.35c.05-.2.25-.3.45-.25.2.05.3.25.25.45l-.75 3.3c-.05.25.15.45.4.45.25 0 .45-.2.45-.45l.7-3.3c.05-.2.25-.35.45-.3.2.05.3.25.25.45l-.65 3.3c-.05.25.15.5.4.5s.45-.25.4-.5l.65-3.3c.05-.2.25-.35.45-.3.2.05.3.25.25.45l-.6 3.3c-.05.2.1.4.3.4.2 0 .35-.15.35-.35l.6-3.35c.05-.2.25-.3.45-.25.2.05.3.25.25.45l-.55 1.9c-.05.15 0 .35.15.45.15.1.35.05.45-.1l1.2-1.9c.9-.2 1.75-.5 2.55-.9z"/>
              </svg>
              分享到微博
            </button>
            <button id="share-close" class="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
              取消
            </button>
          </div>
        </div>
      `
      document.body.appendChild(shareDialog)
      
      shareDialog.querySelector('#share-copy')?.addEventListener('click', async () => {
        await navigator.clipboard.writeText(shareUrl)
        alert('链接已复制到剪贴板')
        shareDialog.remove()
      })
      
      shareDialog.querySelector('#share-qq')?.addEventListener('click', () => {
        const qqUrl = `https://connect.qq.com/widget/share.html?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}&pics=${encodeURIComponent(window.location.origin + '/icon.png')}`
        window.open(qqUrl, '_blank')
        shareDialog.remove()
      })
      
      shareDialog.querySelector('#share-weibo')?.addEventListener('click', () => {
        const weiboUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle + ' - ' + shareText)}`
        window.open(weiboUrl, '_blank')
        shareDialog.remove()
      })
      
      shareDialog.querySelector('#share-close')?.addEventListener('click', () => {
        shareDialog.remove()
      })
      
      shareDialog.addEventListener('click', (e) => {
        if (e.target === shareDialog) {
          shareDialog.remove()
        }
      })
    }
  }, [navigate])

  const getPostYear = (post: PostWithLiked): number => {
    if (displayTimePreference === 'takenAt' && post.photos?.[0]?.takenAt) {
      const date = new Date(post.photos[0].takenAt)
      if (!isNaN(date.getTime())) {
        return date.getFullYear()
      }
    }
    if (post.createdAt) {
      const date = new Date(post.createdAt)
      if (!isNaN(date.getTime())) {
        return date.getFullYear()
      }
    }
    return new Date().getFullYear()
  }

  useEffect(() => {
    if (isSearchMode) {
      setShowSearchDropdown(true)
    }
  }, [isSearchMode])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const response = await searchApi.parseSearch(searchQuery)
      const intent = response.data.data.intent
      setEditedIntent(intent)
      setShowSearchOptions(true)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleConfirmSearch = async () => {
    if (!editedIntent) return
    setIsSearching(true)
    setShowSearchOptions(false)
    try {
      const searchResponse = await searchApi.searchPhotos({ intent: editedIntent })
      setSearchResults(searchResponse.data.data.photos)
      setHasSearched(true)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleCloseSearch = () => {
    setShowSearchDropdown(false)
    setSearchQuery('')
    setSearchResults([])
    setEditedIntent(null)
    setShowSearchOptions(false)
    setHasSearched(false)
    exitSearch()
  }

  useEffect(() => {
    if (!timelineRef.current || layoutType !== 'timeline') return

    const handleScroll = () => {
      const threshold = window.innerHeight * 0.25
      
      for (let i = 0; i < posts.length; i++) {
        const postElement = document.getElementById(`post-${posts[i].id}`)
        if (postElement) {
          const rect = postElement.getBoundingClientRect()
          const postTop = rect.top
          
          if (postTop > threshold) {
            setVisibleYear(null)
            break
          } else if (postTop <= threshold && postTop > -rect.height * 0.5) {
            setVisibleYear(getPostYear(posts[i]))
            break
          } else if (i === posts.length - 1) {
            setVisibleYear(getPostYear(posts[i]))
            break
          }
        }
      }
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [posts, layoutType, displayTimePreference])

  // Infinite scroll: load more when sentinel comes into view
  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage || isFetchingNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const renderPostCard = (post: PostWithLiked) => {
    const getPhotoUrl = (url: string) =>
      url?.startsWith('http') ? url : `${window.location.origin}${url}`

    return (
      <article
        key={post.id}
        className="card overflow-hidden group hover:shadow-lg transition-shadow"
      >
        <div className="p-2">
          <div className="flex items-center mb-1">
            {post.user && (
              <>
                <img
                  src={post.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user.nickname)}&background=random`}
                  alt={post.user.nickname}
                  className="w-6 h-6 rounded-full object-cover mr-2 cursor-pointer hover:opacity-80"
                  onClick={(e) => {
                    e.preventDefault()
                    navigate(`/user/${post.user!.id}`)
                  }}
                />
                <span
                  className="text-xs text-primary-600 dark:text-primary-400 mr-1 cursor-pointer hover:underline shrink-0"
                  onClick={(e) => {
                    e.preventDefault()
                    navigate(`/user/${post.user!.id}`)
                  }}
                >
                  {post.user.nickname}
                </span>
              </>
            )}
            {isAuthenticated && user && post.user && user.id !== post.user.id && (
              <FollowButton
                userId={post.user.id}
                isFollowing={(post as any).isFollowing || false}
                isFriend={(post as any).isFriend || false}
                size="sm"
                showText={true}
                showIcon={false}
                disabled={(post as any).isFriend}
              />
            )}
            <Link to={`/post/${post.id}`} className="flex-1">
              <h3 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2 hover:text-primary-600 dark:hover:text-primary-400 text-center">
                {post.title}
              </h3>
            </Link>
          </div>
        </div>

        {post.photos.length > 0 ? (
          <Link to={`/post/${post.id}`}>
            {post.photos.length > 1 ? (
              <div className="grid grid-cols-2 gap-0.5">
                {post.photos.slice(0, 4).map((photo) => (
                  <div key={photo.id} className="aspect-square overflow-hidden relative">
                    <img
                      src={getPhotoUrl(photo.url)}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3Ctext x="50" y="55" text-anchor="middle" fill="%23999" font-size="12"%3E%3C/text%3E%3C/svg%3E'
                      }}
                    />
                    {photo.id === post.photos[3]?.id && post.photos.length > 4 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-medium text-lg">+{post.photos.length - 4}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative overflow-hidden">
                <img
                  src={getPhotoUrl(post.photos[0].url)}
                  alt={post.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3Ctext x="50" y="55" text-anchor="middle" fill="%23999" font-size="12"%3E图片加载失败%3C/text%3E%3C/svg%3E'
                  }}
                />
              </div>
            )}
          </Link>
        ) : (
          <Link to={`/post/${post.id}`}>
            <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-gray-400 dark:text-gray-500">无图片</span>
            </div>
          </Link>
        )}

        <div className="p-3 md:p-4 pt-0">
          <p className="text-base text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
            {post.content?.slice(0, 100) || post.photos[0]?.caption || '暂无描述'}
          </p>

          {((post as any).pinnedComment || (post as any).comments?.[0]) && (
            <div className="space-y-1 mb-3 border-t border-gray-100 dark:border-gray-700 pt-3">
              {(post as any).pinnedComment ? (
                <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{(post as any).pinnedComment.user?.nickname || '匿名'}:</span>
                  <span className="ml-1">{(post as any).pinnedComment.content}</span>
                </div>
              ) : null}
              {(post as any).comments?.[0] && !((post as any).pinnedComment) ? (
                <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{(post as any).comments[0].user?.nickname || '匿名'}:</span>
                  <span className="ml-1">{(post as any).comments[0].content}</span>
                </div>
              ) : null}
              {(post as any).pinnedComment && (post as any).comments?.[0] && !((post as any).pinnedComment) === false ? (
                <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{(post as any).comments[0].user?.nickname || '匿名'}:</span>
                  <span className="ml-1">{(post as any).comments[0].content}</span>
                </div>
              ) : null}
            </div>
          )}

          <div className="flex items-center justify-between text-xs md:text-sm border-t border-gray-100 dark:border-gray-700 pt-3">
            <div className="flex items-center space-x-3 md:space-x-4">
              <span className="flex items-center space-x-1 text-gray-500">
                <FiEye className="w-3 md:w-4 h-3 md:h-4" />
                <span>{post.viewCount}</span>
              </span>
              <button
                onClick={(e) => handleLike(e, post)}
                className={`flex items-center space-x-1 transition-colors ${
                  post.liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                }`}
              >
                {post.liked ? (
                  <FiHeart className="w-3 md:w-4 h-3 md:h-4 fill-current" />
                ) : (
                  <FiHeartOutline className="w-3 md:w-4 h-3 md:h-4" />
                )}
                <span>{post.likeCount}</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  navigate(`/post/${post.id}#comments`)
                }}
                className="flex items-center space-x-1 text-gray-500 hover:text-primary-500 transition-colors"
              >
                <FiMessageCircle className="w-3 md:w-4 h-3 md:h-4" />
                <span>{post.commentCount}</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  handleShare(post)
                }}
                className="text-gray-400 hover:text-primary-500 transition-colors"
              >
                <FiShare2 className="w-3 md:w-4 h-3 md:h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <time className="text-xs text-gray-400">
                {getPostDisplayDateShort(post)}
              </time>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handlePlayPost(post)
                }}
                className={`flex items-center transition-colors ${
                  playingPostId === post.id 
                    ? 'text-primary-600 dark:text-primary-400 animate-pulse' 
                    : 'text-gray-400 hover:text-primary-500'
                }`}
                title={playingPostId === post.id ? '点击停止' : '朗读文章'}
              >
                <FiVolume2 className="w-4 md:w-5 h-4 md:h-5" />
              </button>
            </div>
          </div>
          {getPostLocationDisplay(post) !== '未知地点' && (
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <FiMapPin className="w-3 h-3" />
                {getPostLocationDisplay(post)}
              </span>
            </div>
          )}
        </div>
      </article>
    )
  }

  const renderTimelineLayout = () => {
    return (
      <div className="relative" ref={timelineRef}>
        {/* Desktop: center line */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 -translate-x-1/2" />

        {/* Sticky year label */}
        {visibleYear && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg">
            {visibleYear}
          </div>
        )}

        <div className="space-y-3">
          {posts.map((post, index) => {
            const isEven = index % 2 === 0
            const postYear = getPostYearSafe(post)
            const showYear = index === 0 || getPostYearSafe(posts[index - 1]) !== postYear

            return (
              <div key={post.id} id={`post-${post.id}`} className={`flex flex-col md:flex-row md:items-start ${isEven ? '' : 'md:flex-row-reverse'} relative`}>
                {/* Mobile: year label */}
                {showYear && (
                  <div className="md:hidden w-full text-center mb-4">
                    <span className="bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-xs font-medium text-primary-600 dark:text-primary-400 shadow border border-gray-200 dark:border-gray-700">
                      {postYear}
                    </span>
                  </div>
                )}

                {/* Card content - left/right */}
                <div className="w-full md:w-3/5 overflow-hidden">
                  <div
                    className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow cursor-pointer mb-4 md:mb-0"
                    onClick={() => navigate(`/post/${post.id}`)}
                  >
                    <div className="p-3 md:p-4">
                      <div className="flex items-center mb-2">
                        {post.user && (
                          <>
                            <img
                              src={post.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user.nickname)}&background=random`}
                              alt={post.user.nickname}
                              className="w-6 h-6 rounded-full object-cover mr-2 cursor-pointer hover:opacity-80"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/user/${post.user!.id}`)
                              }}
                            />
                            <span
                              className="text-xs text-primary-600 dark:text-primary-400 mr-1 cursor-pointer hover:underline shrink-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/user/${post.user!.id}`)
                              }}
                            >
                              {post.user.nickname}
                            </span>
                          </>
                        )}
                        {isAuthenticated && user && post.user && user.id !== post.user.id && (
                          <FollowButton
                            userId={post.user.id}
                            isFollowing={(post as any).isFollowing || false}
                            isFriend={(post as any).isFriend || false}
                            size="sm"
                            showText={true}
                            showIcon={false}
                            disabled={(post as any).isFriend}
                          />
                        )}
                        <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 flex-1 text-center">
                          {post.title}
                        </h3>
                      </div>
                      {post.photos.length > 1 ? (
                        <div className="grid grid-cols-2 gap-0.5 mb-3">
                          {post.photos.slice(0, 4).map((photo) => (
                            <div key={photo.id} className="aspect-square overflow-hidden">
                              <img
                                src={photo.url?.startsWith('http') ? photo.url : `${window.location.origin}${photo.url}`}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      ) : post.photos[0] ? (
                        <img
                          src={post.photos[0].url?.startsWith('http') ? post.photos[0].url : `${window.location.origin}${post.photos[0].url}`}
                          alt={post.title}
                          className="w-full aspect-video object-cover rounded-lg mb-3"
                        />
                      ) : (
                        <div className="w-full aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                          <span className="text-gray-400">No image</span>
                        </div>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {post.content?.slice(0, 120) || post.photos[0]?.caption || ''}
                      </p>
                      {/* Comments preview */}
                      {((post as any).pinnedComment || (post as any).comments?.[0]) && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          {(post as any).pinnedComment ? (
                            <span>{(post as any).pinnedComment.user?.nickname || 'Anonymous'}: {(post as any).pinnedComment.content}</span>
                          ) : (post as any).comments?.[0] ? (
                            <span>{(post as any).comments[0].user?.nickname || 'Anonymous'}: {(post as any).comments[0].content}</span>
                          ) : null}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-2 md:gap-3">
                          <span className="flex items-center gap-1"><FiEye className="w-3 h-3" />{post.viewCount}</span>
                          <button
                            onClick={(e) => handleLike(e, post)}
                            className={`flex items-center gap-1 ${post.liked ? 'text-red-500' : 'hover:text-red-500'}`}
                          >

                            <FiHeart className={`w-3 h-3 ${post.liked ? 'fill-current' : ''}`} />{post.likeCount}
                          </button>
                          <span className="flex items-center gap-1"><FiMessageCircle className="w-3 h-3" />{post.commentCount}</span>
                          {post.photos?.[0]?.takenAt && (
                            <span className="hidden sm:inline">{new Date(post.photos[0].takenAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-1">
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handlePlayPost(post)
                            }}
                            className={`flex items-center transition-colors ${
                              playingPostId === post.id 
                                ? 'text-primary-600 dark:text-primary-400 animate-pulse' 
                                : 'text-gray-400 hover:text-primary-500'
                            }`}
                            title={playingPostId === post.id ? '点击停止' : '朗读文章'}
                          >
                            <FiVolume2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {/* Location */}
                      {getPostLocationDisplay(post) !== 'Unknown location' && (
                        <div className="mt-2 text-xs text-gray-500">
                          <FiMapPin className="w-3 h-3 inline" /> {getPostLocationDisplay(post)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Desktop: timeline dot */}
                <div className="hidden md:flex w-8 flex-shrink-0 flex-col items-center">
                  <div className="w-3 h-3 bg-primary-600 rounded-full" />
                  <div className="mt-2 text-xs text-gray-400 whitespace-nowrap">
                    {getTimelineDateDisplay(post)}
                  </div>
                </div>

                {/* Desktop: right spacer */}
                <div className="hidden md:block w-[calc(40%-1rem)]" />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderGridLayout = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {posts.map((post) => renderPostCard(post))}
    </div>
  )

  const renderMasonryLayout = () => {
    const columns: Post[][] = [[], [], []]
    posts.forEach((post, index) => {
      columns[index % 3].push(post)
    })

    const renderMasonryCard = (post: PostWithLiked) => {
      const getPhotoUrl = (url: string) =>
        url?.startsWith('http') ? url : `${window.location.origin}${url}`

      return (
        <article
          key={post.id}
          className="card overflow-hidden group hover:shadow-lg transition-shadow mb-6"
        >
          <div className="p-2">
          <div className="flex items-center mb-1">
            {post.user && (
              <>
                <img
                  src={post.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user.nickname)}&background=random`}
                  alt={post.user.nickname}
                  className="w-6 h-6 rounded-full object-cover mr-2 cursor-pointer hover:opacity-80"
                  onClick={(e) => {
                    e.preventDefault()
                    navigate(`/user/${post.user!.id}`)
                  }}
                />
                <span
                  className="text-xs text-primary-600 dark:text-primary-400 mr-1 cursor-pointer hover:underline shrink-0"
                  onClick={(e) => {
                    e.preventDefault()
                    navigate(`/user/${post.user!.id}`)
                  }}
                >
                  {post.user.nickname}
                </span>
              </>
            )}
            {isAuthenticated && user && post.user && user.id !== post.user.id && (
                <FollowButton
                  userId={post.user.id}
                  isFollowing={(post as any).isFollowing || false}
                  isFriend={(post as any).isFriend || false}
                  size="sm"
                  showText={true}
                  showIcon={false}
                  disabled={(post as any).isFriend}
                />
              )}
              <Link to={`/post/${post.id}`} className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 hover:text-primary-600 dark:hover:text-primary-400 text-center">
                  {post.title}
                </h3>
              </Link>
            </div>
          </div>

          {post.photos.length > 0 ? (
            <Link to={`/post/${post.id}`}>
              {post.photos.length > 1 ? (
                <div className="grid grid-cols-2 gap-0.5">
                  {post.photos.slice(0, 4).map((photo) => (
                    <div key={photo.id} className="aspect-square overflow-hidden relative">
                      <img
                        src={getPhotoUrl(photo.url)}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3Ctext x="50" y="55" text-anchor="middle" fill="%23999" font-size="12"%3E%3C/text%3E%3C/svg%3E'
                        }}
                      />
                      {photo.id === post.photos[3]?.id && post.photos.length > 4 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white font-medium text-lg">+{post.photos.length - 4}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative overflow-hidden">
                  <img
                    src={getPhotoUrl(post.photos[0].url)}
                    alt={post.title}
                    className="w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3Ctext x="50" y="55" text-anchor="middle" fill="%23999" font-size="12"%3E图片加载失败%3C/text%3E%3C/svg%3E'
                    }}
                  />
                </div>
              )}
            </Link>
          ) : (
            <Link to={`/post/${post.id}`}>
              <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-gray-400 dark:text-gray-500">无图片</span>
              </div>
            </Link>
          )}

          <div className="p-4 pt-2">
            <div className="text-base text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">
              {post.content || post.photos[0]?.caption || ''}
            </div>

            {((post as any).pinnedComment || (post as any).comments?.[0]) && (
              <div className="space-y-2 mt-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                {(post as any).pinnedComment ? (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{(post as any).pinnedComment.user?.nickname || '匿名'}:</span>
                    <span className="ml-1">{(post as any).pinnedComment.content}</span>
                  </div>
                ) : null}
                {(post as any).comments?.[0] && !((post as any).pinnedComment) ? (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{(post as any).comments[0].user?.nickname || '匿名'}:</span>
                    <span className="ml-1">{(post as any).comments[0].content}</span>
                  </div>
                ) : null}
                {(post as any).pinnedComment && (post as any).comments?.[0] ? (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{(post as any).comments[0].user?.nickname || '匿名'}:</span>
                    <span className="ml-1">{(post as any).comments[0].content}</span>
                  </div>
                ) : null}
              </div>
            )}

            <div className="flex items-center justify-between text-sm border-t border-gray-100 dark:border-gray-700 pt-3 mt-4">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1 text-gray-500">
                  <FiEye className="w-4 h-4" />
                  <span>{post.viewCount}</span>
                </span>
                <button
                  onClick={(e) => handleLike(e, post)}
                  className={`flex items-center space-x-1 transition-colors ${
                    post.liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                  }`}
                >
                  {post.liked ? (
                    <FiHeart className="w-4 h-4 fill-current" />
                  ) : (
                    <FiHeartOutline className="w-4 h-4" />
                  )}
                  <span>{post.likeCount}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    navigate(`/post/${post.id}#comments`)
                  }}
                  className="flex items-center space-x-1 text-gray-500 hover:text-primary-500 transition-colors"
                >
                  <FiMessageCircle className="w-4 h-4" />
                  <span>{post.commentCount}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    handleShare(post)
                  }}
                  className="text-gray-400 hover:text-primary-500 transition-colors"
                >
                  <FiShare2 className="w-4 h-4" />
                </button>
              </div>
              <time className="text-xs text-gray-400">
                {getPostDisplayDate(post)}
              </time>
            </div>
            {getPostLocationDisplay(post) !== '未知地点' && (
              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <FiMapPin className="w-3 h-3" />
                  {getPostLocationDisplay(post)}
                </span>
              </div>
            )}
          </div>
        </article>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {columns.map((columnPosts, colIndex) => (
          <div key={colIndex} className="space-y-6">
            {columnPosts.map((post) => renderMasonryCard(post))}
          </div>
        ))}
      </div>
    )
  }

  const renderMapLayout = () => (
    <MapView posts={posts} />
  )

  const renderLayout = () => {
    switch (layoutType) {
      case 'timeline':
        return renderTimelineLayout()
      case 'grid':
        return renderGridLayout()
      case 'masonry':
        return renderMasonryLayout()
      case 'map':
        return renderMapLayout()
      default:
        return renderTimelineLayout()
    }
  }

  const handleSearchClick = () => {
    if (showSearchDropdown) {
      if (searchQuery.trim()) {
        handleSearch()
      }
    } else {
      setShowSearchDropdown(true)
    }
  }

  const renderSearchInput = () => (
    <div className="relative flex items-center gap-2 transition-all duration-200 ease-in-out">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        placeholder="搜索照片，如：近三年青岛的海滩"
        className="w-64 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        autoFocus
      />
      <button
        onClick={() => setShowSearchOptions(!showSearchOptions)}
        className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        title="搜索选项"
      >
        {showSearchOptions ? (
          <FiChevronUp className="w-5 h-5" />
        ) : (
          <FiChevronDown className="w-5 h-5" />
        )}
      </button>
      <button
        onClick={handleSearchClick}
        disabled={!searchQuery.trim() || isSearching}
        className="p-1.5 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg disabled:opacity-50"
      >
        {isSearching ? (
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          <FiSearch className="w-5 h-5" />
        )}
      </button>
      <button
        onClick={handleCloseSearch}
        className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
      >
        <FiX className="w-5 h-5" />
      </button>

      {/* Search Options Panel - Intent Editor */}
      {showSearchOptions && editedIntent && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50">
          <div className="space-y-3">
            {/* Time Range */}
            <div>
              <label className="flex items-center text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FiCalendar className="w-3 h-3 mr-1" />
                时间范围
              </label>
              <div className="flex items-center space-x-1">
                <input
                  type="date"
                  value={editedIntent.startDate || ''}
                  onChange={(e) =>
                    setEditedIntent({ ...editedIntent, startDate: e.target.value || null })
                  }
                  className="flex-1 px-2 py-1.5 bg-gray-100 dark:bg-gray-700 border-0 rounded text-xs text-gray-900 dark:text-white"
                />
                <span className="text-gray-400">~</span>
                <input
                  type="date"
                  value={editedIntent.endDate || ''}
                  onChange={(e) =>
                    setEditedIntent({ ...editedIntent, endDate: e.target.value || null })
                  }
                  className="flex-1 px-2 py-1.5 bg-gray-100 dark:bg-gray-700 border-0 rounded text-xs text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="flex items-center text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FiMapPin className="w-3 h-3 mr-1" />
                地点
              </label>
              <input
                type="text"
                value={editedIntent.location || ''}
                onChange={(e) =>
                  setEditedIntent({ ...editedIntent, location: e.target.value || null })
                }
                placeholder="输入地点"
                className="w-full px-2 py-1.5 bg-gray-100 dark:bg-gray-700 border-0 rounded text-xs text-gray-900 dark:text-white"
              />
            </div>

            {/* Keywords */}
            <div>
              <label className="flex items-center text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FiTag className="w-3 h-3 mr-1" />
                关键词
              </label>
              <div className="flex flex-wrap gap-1">
                {editedIntent.keywords.map((kw, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded text-xs"
                  >
                    {kw}
                    <button
                      onClick={() => {
                        const newKeywords = editedIntent.keywords.filter((_, i) => i !== index)
                        setEditedIntent({ ...editedIntent, keywords: newKeywords })
                      }}
                      className="ml-0.5 text-primary-500 hover:text-primary-700"
                    >
                      <FiX className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder="添加"
                  className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border-0 rounded text-xs text-gray-900 dark:text-white w-16"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      setEditedIntent({
                        ...editedIntent,
                        keywords: [...editedIntent.keywords, e.currentTarget.value.trim()],
                      })
                      e.currentTarget.value = ''
                    }
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-1.5 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowSearchOptions(false)}
                className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmSearch}
                disabled={isSearching}
                className="px-3 py-1.5 bg-primary-600 text-white rounded text-xs hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {isSearching ? '搜索中...' : '确认搜索'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 
            className="text-2xl font-bold text-gray-900 dark:text-white cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
            onClick={() => setShowSearchDropdown(true)}
          >
            探索
          </h1>
          {showSearchDropdown && renderSearchInput()}
        </div>
        {showSearchDropdown && !hasSearchResults && (
          <LayoutSwitcher />
        )}
        {!showSearchDropdown && <LayoutSwitcher />}
      </div>

      {/* Search Results or Posts */}
      {hasSearchResults ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              找到 {searchResults.length} 张照片
            </p>
            <button
              onClick={handleCloseSearch}
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              清除搜索
            </button>
          </div>
          {renderLayout()}
        </div>
      ) : hasSearched ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">没有找到符合条件的照片</p>
            <button
              onClick={handleCloseSearch}
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              清除搜索
            </button>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      ) : posts.length > 0 ? (
        <>
          {renderLayout()}
          
          {/* Infinite scroll sentinel and loading indicator */}
          <div ref={sentinelRef} className="h-4" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          )}
          {!hasMore && posts.length > 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              已加载全部内容
            </p>
          )}
        </>
      ) : (
        <div className="card p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">暂无文章</p>
          {isAuthenticated && (
            <Link
              to="/editor"
              className="btn-primary inline-block mt-4"
            >
              发布第一篇文章
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiHeart, FiMessageCircle, FiEye, FiShare2, FiMapPin, FiVolume2, FiCalendar, FiUsers } from 'react-icons/fi'
import { FiHeart as FiHeartOutline } from 'react-icons/fi'
import { postsApi, usersApi } from '../../services/api'
import { useAuthStore, useLayoutStore } from '../../stores'
import { LayoutSwitcher } from '../../components/LayoutSwitcher/LayoutSwitcher'
import { Post } from '../../types'
import { MapView } from '../../components/MapView/MapView'
import { speakBlogPost, stopSpeaking } from '../../utils/tts'
import { FollowButton } from '../../components/FollowButton/FollowButton'

function getPostDisplayDateShort(post: Post): string {
  const takenAt = post.photos?.[0]?.takenAt
  if (takenAt) {
    const date = new Date(takenAt)
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
    }
  }
  if (post.createdAt) {
    const date = new Date(post.createdAt)
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('zh-CN')
    }
  }
  return ''
}

function getTimelineDateDisplay(post: Post): string {
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

function getPostYearSafe(post: Post): number {
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

function getPostLocationDisplay(post: Post): string {
  const location = post.photos?.[0]?.locationName
  return location || '未知地点'
}

interface PostWithLiked extends Post {
  liked?: boolean
}

export function UserPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const { layoutType } = useLayoutStore()
  const timelineRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [visibleYear, setVisibleYear] = useState<number | null>(null)
  const [playingPostId, setPlayingPostId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => usersApi.getUser(userId!),
    enabled: !!userId,
  })

  const { data: followCountData } = useQuery({
    queryKey: ['userFollowCounts', userId],
    queryFn: () => usersApi.getFollowCounts(userId!),
    enabled: !!userId,
  })

  const userInfo = userData?.data?.data?.user

  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['userPosts', userId],
    queryFn: ({ pageParam = 1 }) => postsApi.getPosts({ 
      page: pageParam, 
      limit: 12,
      userId: userId,
      status: 'published',
    }),
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.data.data.pagination
      return pagination.page < pagination.totalPages ? pagination.page + 1 : undefined
    },
    initialPageParam: 1,
    enabled: !!userId,
  })

  const posts: PostWithLiked[] = data?.pages?.flatMap(page => page.data.data.posts) || []

  useEffect(() => {
    if (posts.length > 0 && !visibleYear) {
      setVisibleYear(getPostYear(posts[0]))
    }
  }, [posts.length, visibleYear])

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

  const likeMutation = useMutation({
    mutationFn: (id: string) => postsApi.likePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['userPosts', userId] })
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
      const shareDialog = document.createElement('div')
      shareDialog.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center'
      shareDialog.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">分享文章</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">${shareTitle}</p>
          <div class="space-y-2">
            <button id="share-copy" class="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              复制链接
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
      
      shareDialog.querySelector('#share-close')?.addEventListener('click', () => {
        shareDialog.remove()
      })
      
      shareDialog.addEventListener('click', (e) => {
        if (e.target === shareDialog) {
          shareDialog.remove()
        }
      })
    }
  }, [])

  const getPostYear = (post: PostWithLiked): number => {
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
  }, [posts, layoutType])

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
          <Link to={`/post/${post.id}`} className="block">
            <h3 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2 hover:text-primary-600 dark:hover:text-primary-400 text-center">
              {post.title}
            </h3>
          </Link>
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
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 -translate-x-1/2" />

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
                {showYear && (
                  <div className="md:hidden w-full text-center mb-4">
                    <span className="bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-xs font-medium text-primary-600 dark:text-primary-400 shadow border border-gray-200 dark:border-gray-700">
                      {postYear}
                    </span>
                  </div>
                )}

                <div className="w-full md:w-3/5 overflow-hidden">
                  <div
                    className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow cursor-pointer mb-4 md:mb-0"
                    onClick={() => navigate(`/post/${post.id}`)}
                  >
                    <div className="p-3 md:p-4">
                      <div className="flex items-center mb-2">
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
                      {getPostLocationDisplay(post) !== 'Unknown location' && (
                        <div className="mt-2 text-xs text-gray-500">
                          <FiMapPin className="w-3 h-3 inline" /> {getPostLocationDisplay(post)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex w-8 flex-shrink-0 flex-col items-center">
                  <div className="w-3 h-3 bg-primary-600 rounded-full" />
                  <div className="mt-2 text-xs text-gray-400 whitespace-nowrap">
                    {getTimelineDateDisplay(post)}
                  </div>
                </div>

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
            <Link to={`/post/${post.id}`} className="block">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 hover:text-primary-600 dark:hover:text-primary-400 text-center">
                {post.title}
              </h3>
            </Link>
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
                {getPostDisplayDateShort(post)}
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

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">用户不存在</h2>
          <button
            onClick={() => navigate('/')}
            className="text-primary-600 hover:text-primary-700"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* User Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <img
              src={userInfo.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo.nickname || 'User')}&background=random`}
              alt={userInfo.nickname || '用户'}
              className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-primary-100 dark:border-primary-900 shadow-lg"
            />
          </div>

          {/* User Info */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {userInfo.nickname || '匿名用户'}
              </h1>
              {isAuthenticated && user && user.id !== userInfo.id && (
                <FollowButton
                  userId={userInfo.id}
                  isFollowing={(userInfo as any).isFollowing || false}
                  isFriend={(userInfo as any).isFriend || false}
                  size="md"
                  showText={true}
                  showIcon={true}
                  disabled={(userInfo as any).isFriend}
                />
              )}
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <FiUsers className="w-4 h-4" />
                <span>粉丝：<span className="font-medium text-primary-600 dark:text-primary-400">{followCountData?.data?.data?.followersCount || 0}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <FiUsers className="w-4 h-4" />
                <span>关注：<span className="font-medium text-primary-600 dark:text-primary-400">{followCountData?.data?.data?.followingCount || 0}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <FiCalendar className="w-4 h-4" />
                <span>加入于：<span className="font-medium">{new Date(userInfo.createdAt).toLocaleDateString('zh-CN')}</span></span>
              </div>
            </div>

            {userInfo.bio && (
              <p className="mt-4 text-gray-600 dark:text-gray-400 text-center md:text-left">
                {userInfo.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Layout Switcher */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          TA 的文章 ({posts.length})
        </h2>
        <LayoutSwitcher />
      </div>

      {/* Posts */}
      {isLoading && posts.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">暂无文章</p>
        </div>
      ) : (
        renderLayout()
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-10" />

      {isFetchingNextPage && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}
    </div>
  )
}

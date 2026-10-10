import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiHeart, FiMessageCircle, FiEye, FiEdit, FiTrash2, FiBookmark, FiCheck, FiCheckCircle } from 'react-icons/fi'
import { postsApi, commentsApi, usersApi } from '../../services/api'
import { useAuthStore } from '../../stores'
import { PhotoCard } from '../../components/PhotoCard/PhotoCard'
import { FollowButton } from '../../components/FollowButton/FollowButton'

export function Post() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, isAuthenticated } = useAuthStore()
  const [commentContent, setCommentContent] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: () => postsApi.getPost(id!),
  })

  const post = data?.data.data.post

  const { data: followStatusData } = useQuery({
    queryKey: ['followStatus', post?.user.id],
    queryFn: () => usersApi.getFollowStatus(post!.user.id),
    enabled: !!post?.user.id && !!user && user.id !== post.user.id,
  })

  const isAuthor = user?.id === post?.user.id

  const deleteMutation = useMutation({
    mutationFn: () => postsApi.deletePost(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      navigate('/')
    },
  })

  const commentMutation = useMutation({
    mutationFn: (content: string) => commentsApi.createComment(id!, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', id] })
      setCommentContent('')
    },
  })

  const pinMutation = useMutation({
    mutationFn: (commentId: string) => commentsApi.togglePin(commentId, id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', id] })
    },
  })

  const approveMutation = useMutation({
    mutationFn: (commentId: string) => commentsApi.approve(commentId, id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', id] })
    },
  })

  const approveAllMutation = useMutation({
    mutationFn: () => commentsApi.approveAll(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', id] })
    },
  })

  const unapproveAllMutation = useMutation({
    mutationFn: () => postsApi.unapproveAllComments(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', id] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600 dark:text-gray-400">文章不存在</p>
        <Link to="/" className="btn-primary mt-4 inline-block">
          返回首页
        </Link>
      </div>
    )
  }

  const handleDelete = () => {
    if (confirm('确定要删除这篇文章吗？')) {
      deleteMutation.mutate()
    }
  }

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentContent.trim()) return
    commentMutation.mutate(commentContent)
  }

  const handlePin = (commentId: string) => {
    pinMutation.mutate(commentId)
  }

  const handleApprove = (commentId: string) => {
    approveMutation.mutate(commentId)
  }

  const handleApproveAll = () => {
    if (confirm('确定要审核通过所有评论吗？')) {
      approveAllMutation.mutate()
    }
  }

  const handleUnapproveAll = () => {
    if (confirm('确定要取消审核所有评论吗？')) {
      unapproveAllMutation.mutate()
    }
  }

  // 分类评论 - pinnedComment 从 API 直接获取
  const pinnedComment = (post as any).pinnedComment || null
  const pinnedUnapprovedComment = post.comments?.find(c => c.pinned && c.approved === false) || null
  const approvedComments = post.comments?.filter(c => !c.pinned && c.approved !== false) || []
  const unapprovedComments = post.comments?.filter(c => !c.pinned && c.approved === false) || []

  return (
    <article className="max-w-4xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          {post.tags.map((tag) => (
            <span key={tag.id} className="text-xs px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full">
              {tag.name}
            </span>
          ))}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {post.title}
        </h1>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium">
                {post.user.nickname.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{post.user.nickname}</p>
              <time className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(post.createdAt).toLocaleString('zh-CN')}
              </time>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><FiEye className="w-4 h-4" /> {post.viewCount}</span>
              <span className="flex items-center gap-1"><FiHeart className="w-4 h-4" /> {post.likeCount}</span>
              <span className="flex items-center gap-1"><FiMessageCircle className="w-4 h-4" /> {post.commentCount}</span>
            </div>
            {user && user.id !== post.user.id && followStatusData && (
              <FollowButton
                userId={post.user.id}
                isFollowing={followStatusData.data.data.isFollowing}
                isFriend={followStatusData.data.data.isFriend}
                size="sm"
              />
            )}
          </div>
        </div>
      </header>

      {post.photos.length > 0 && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {post.photos.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} showEdit={isAuthor} />
          ))}
        </div>
      )}

      <div className="prose dark:prose-invert max-w-none mb-8">
        {post.content || <p className="text-gray-500 italic">暂无内容</p>}
      </div>

      {isAuthor && (
        <div className="flex gap-3 mb-8">
          <Link to={`/editor/${post.id}`} className="btn-secondary flex items-center gap-2">
            <FiEdit className="w-4 h-4" /> 编辑
          </Link>
          <button onClick={handleDelete} className="btn bg-red-100 text-red-700 hover:bg-red-200 flex items-center gap-2">
            <FiTrash2 className="w-4 h-4" /> 删除
          </button>
        </div>
      )}

      <div className="card p-6" id="comments">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          评论 ({post.commentCount})
        </h3>

        {isAuthenticated && (
          <form onSubmit={handleSubmitComment} className="mb-6">
            <textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="写下你的评论..."
              rows={3}
              className="input resize-none mb-2"
            />
            <button type="submit" disabled={commentMutation.isPending} className="btn-primary">
              {commentMutation.isPending ? '提交中...' : '发表评论'}
            </button>
          </form>
        )}

        {isAuthor && (approvedComments.length > 0 || pinnedComment) && (
          <button
            onClick={handleUnapproveAll}
            disabled={unapproveAllMutation.isPending}
            className="mb-4 text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 flex items-center gap-1"
          >
            <FiCheckCircle className="w-4 h-4" />
            {unapproveAllMutation.isPending ? '处理中...' : `一键取消审核 (${approvedComments.length + (pinnedComment ? 1 : 0)})`}
          </button>
        )}

        <div className="space-y-4">
          {pinnedComment && (
            <div className="bg-primary-50 dark:bg-primary-900/20 -mx-4 px-4 rounded-lg mb-4">
              <div className="flex gap-3 pb-4">
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-white">{pinnedComment.user.nickname.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-white">{pinnedComment.user.nickname}</span>
                    <span className="text-xs px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full flex items-center gap-1">
                      <FiBookmark className="w-3 h-3" /> 置顶
                    </span>
                    <time className="text-xs text-gray-500">{new Date(pinnedComment.createdAt).toLocaleDateString('zh-CN')}</time>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">{pinnedComment.content}</p>
                  {isAuthor && (
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => handlePin(pinnedComment.id)}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1"
                      >
                        <FiBookmark className="w-3 h-3" /> 取消置顶
                      </button>
                      <button
                        onClick={() => handleApprove(pinnedComment.id)}
                        className="text-xs text-gray-400 hover:text-green-600 flex items-center gap-1"
                      >
                        <FiCheck className="w-3 h-3" /> 取消审核
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {approvedComments.map((comment) => (
            <div key={comment.id} className={`flex gap-3 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0 ${comment.pinned ? 'bg-primary-50 dark:bg-primary-900/20 -mx-4 px-4 rounded-lg' : ''}`}>
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium">{comment.user.nickname.charAt(0)}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium text-gray-900 dark:text-white">{comment.user.nickname}</span>
                  {comment.pinned && (
                    <span className="text-xs px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full flex items-center gap-1">
                      <FiBookmark className="w-3 h-3" /> 置顶
                    </span>
                  )}
                  <time className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleDateString('zh-CN')}</time>
                </div>
                <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
                {isAuthor && (
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => handlePin(comment.id)}
                      className={`text-xs flex items-center gap-1 transition-colors ${
                        comment.pinned ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 hover:text-primary-600'
                      }`}
                    >
                      <FiBookmark className="w-3 h-3" />
                      {comment.pinned ? '取消置顶' : '设为置顶'}
                    </button>
                    <button
                      onClick={() => handleApprove(comment.id)}
                      className="text-xs text-gray-400 hover:text-green-600 flex items-center gap-1"
                    >
                      <FiCheck className="w-3 h-3" /> 取消审核
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {(unapprovedComments.length > 0 || pinnedUnapprovedComment) && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-end mb-3">
                <button
                  onClick={handleApproveAll}
                  disabled={approveAllMutation.isPending}
                  className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 flex items-center gap-1"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  {approveAllMutation.isPending ? '审核中...' : '一键审核通过'}
                </button>
              </div>
              <div className="space-y-3 opacity-60">
                {pinnedUnapprovedComment && (
                  <div key={pinnedUnapprovedComment.id} className="flex gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-white">{pinnedUnapprovedComment.user.nickname.charAt(0)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-gray-900 dark:text-white">{pinnedUnapprovedComment.user.nickname}</span>
                        <span className="text-xs px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full flex items-center gap-1">
                          <FiBookmark className="w-3 h-3" /> 置顶
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
                          待审核
                        </span>
                        <time className="text-xs text-gray-500">{new Date(pinnedUnapprovedComment.createdAt).toLocaleDateString('zh-CN')}</time>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">{pinnedUnapprovedComment.content}</p>
                      {isAuthor && (
                        <div className="flex items-center gap-3 mt-2">
                          <button
                            onClick={() => handleApprove(pinnedUnapprovedComment.id)}
                            className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 flex items-center gap-1"
                          >
                            <FiCheck className="w-3 h-3" /> 审核通过
                          </button>
                          <button
                            onClick={() => handlePin(pinnedUnapprovedComment.id)}
                            className="text-xs text-gray-400 hover:text-primary-600 flex items-center gap-1"
                          >
                            <FiBookmark className="w-3 h-3" /> 取消置顶
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {unapprovedComments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 pb-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium">{comment.user.nickname.charAt(0)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white">{comment.user.nickname}</span>
                        <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
                          待审核
                        </span>
                        <time className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleDateString('zh-CN')}</time>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
                      {isAuthor && (
                        <button
                          onClick={() => handleApprove(comment.id)}
                          className="mt-2 text-xs text-green-600 dark:text-green-400 hover:text-green-700 flex items-center gap-1"
                        >
                          <FiCheck className="w-3 h-3" /> 审核通过
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

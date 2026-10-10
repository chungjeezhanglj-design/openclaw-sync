import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../../services/api'
import { useAuthStore } from '../../stores'
import { FiUserPlus, FiUserCheck } from 'react-icons/fi'

interface FollowButtonProps {
  userId: string
  isFollowing: boolean
  isFriend: boolean
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  showIcon?: boolean
  disabled?: boolean
  mode?: 'auto' | 'follow' | 'unfollow'
  showFriendBadge?: boolean
  onSuccess?: () => void
}

export function FollowButton({
  userId,
  isFollowing,
  isFriend,
  size = 'md',
  showText = true,
  showIcon = true,
  disabled = false,
  mode = 'auto',
  showFriendBadge = false,
  onSuccess,
}: FollowButtonProps) {
  const queryClient = useQueryClient()
  const { isAuthenticated, user } = useAuthStore()

  const isSelf = user?.id === userId

  const followMutation = useMutation({
    mutationFn: () => usersApi.followUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followStatus', userId] })
      queryClient.invalidateQueries({ queryKey: ['followCounts', userId] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      onSuccess?.()
    },
  })

  const unfollowMutation = useMutation({
    mutationFn: () => usersApi.unfollowUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followStatus', userId] })
      queryClient.invalidateQueries({ queryKey: ['followCounts', userId] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      onSuccess?.()
    },
  })

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isFollowing) {
      unfollowMutation.mutate()
    } else {
      followMutation.mutate()
    }
  }

  if (!isAuthenticated || isSelf) {
    return null
  }

  const isLoading = followMutation.isPending || unfollowMutation.isPending

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  const renderButton = () => {
    const isUnfollowMode = mode === 'unfollow'

    if (isFriend && !isUnfollowMode) {
      return (
        <button
          onClick={handleClick}
          disabled={isLoading || disabled}
          className={`btn-secondary flex items-center gap-1.5 ${sizeClasses[size]} ${
            isLoading || disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {showIcon && <FiUserCheck className="w-4 h-4" />}
          {showText && <span>互关</span>}
        </button>
      )
    }

    if (isFollowing || isUnfollowMode) {
      return (
        <button
          onClick={handleClick}
          disabled={isLoading || disabled}
          className={`btn-secondary flex items-center gap-1.5 ${sizeClasses[size]} ${
            isLoading || disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {showIcon && <FiUserCheck className="w-4 h-4" />}
          {showText && <span>取消关注</span>}
        </button>
      )
    }

    return (
      <button
        onClick={handleClick}
        disabled={isLoading || disabled}
        className={`btn-primary flex items-center gap-1.5 ${sizeClasses[size]} ${
          isLoading || disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {showIcon && <FiUserPlus className="w-4 h-4" />}
        {showText && <span>关注</span>}
      </button>
    )
  }

  if (showFriendBadge && isFriend) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
          互关
        </span>
        {renderButton()}
      </div>
    )
  }

  return renderButton()
}

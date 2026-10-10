import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FiSearch } from 'react-icons/fi'
import { usersApi } from '../../services/api'
import { useAuthStore } from '../../stores'
import { FollowButton } from '../../components/FollowButton/FollowButton'

export function SearchUsers() {
  const { isAuthenticated, user } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['searchUsers', searchQuery],
    queryFn: () => usersApi.searchUsers(searchQuery, { page: 1, limit: 20 }),
    enabled: searchQuery.length >= 2,
  })

  const users = data?.data?.data?.users || []

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.length >= 2) {
      refetch()
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">搜索用户</h1>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入用户名或邮箱搜索"
              className="input w-full pl-10"
            />
          </div>
          <button type="submit" className="btn-primary">
            搜索
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">至少输入2个字符进行搜索</p>
      </form>

      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      )}

      {!isLoading && searchQuery.length >= 2 && users.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          未找到匹配的用户
        </div>
      )}

      {!isLoading && users.length > 0 && (
        <div className="space-y-3">
          {users.map((u: any) => (
            <div
              key={u.id}
              className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
            >
              <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                {u.avatar ? (
                  <img src={u.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <span className="text-white font-medium text-lg">
                    {u.nickname?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {u.nickname}
                </p>
                {u.bio && (
                  <p className="text-sm text-gray-500 truncate">{u.bio}</p>
                )}
              </div>
{isAuthenticated && user?.id !== u.id && (
                <FollowButton
                  userId={u.id}
                  isFollowing={u.isFollowing || false}
                  isFriend={u.isFriend || false}
                  size="sm"
                  onSuccess={() => refetch()}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

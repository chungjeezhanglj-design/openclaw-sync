import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../../services/api'
import { User } from '../../types'

interface UserManagementProps {
  currentUser: User
}

export function UserManagement({ currentUser }: UserManagementProps) {
  const queryClient = useQueryClient()
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['users', roleFilter, search],
    queryFn: () => usersApi.getUsers({ role: roleFilter || undefined, search: search || undefined }),
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => usersApi.updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => usersApi.updateUserStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'editor':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">全部角色</option>
          <option value="admin">管理员</option>
          <option value="editor">编辑</option>
          <option value="user">用户</option>
        </select>

        <input
          type="text"
          placeholder="搜索用户昵称或邮箱..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white flex-1 min-w-[200px]"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">加载中...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">用户</th>
                <th className="px-4 py-3">邮箱</th>
                <th className="px-4 py-3">角色</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">注册时间</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.data.users.map((user) => (
                <tr key={user.id} className="border-b dark:border-gray-700">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {user.avatar ? (
                        <img src={user.avatar} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          {user.nickname[0]}
                        </div>
                      )}
                      <span className="font-medium">{user.nickname}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{user.email || '-'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) => updateRoleMutation.mutate({ id: user.id, role: e.target.value })}
                      disabled={user.id === currentUser.id}
                      className={`px-2 py-1 text-xs rounded-full border-0 cursor-pointer ${getRoleBadgeClass(user.role)}`}
                    >
                      <option value="user">用户</option>
                      <option value="editor">编辑</option>
                      <option value="admin">管理员</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleStatusMutation.mutate({ id: user.id, isActive: !user.isActive })}
                      disabled={user.id === currentUser.id}
                      className={`px-2 py-1 text-xs rounded ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} disabled:opacity-50`}
                    >
                      {user.isActive ? '启用' : '禁用'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3">
                    {user.id !== currentUser.id && user.role !== 'admin' && (
                      <button
                        onClick={() => {
                          if (confirm('确定要删除此用户吗？')) {
                            deleteUserMutation.mutate(user.id)
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        删除
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data?.data.data.users.length === 0 && (
        <div className="text-center py-8 text-gray-500">暂无用户</div>
      )}
    </div>
  )
}

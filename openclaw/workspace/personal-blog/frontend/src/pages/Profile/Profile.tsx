import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiMail, FiFileText, FiEdit, FiEye, FiClock, FiSettings, FiCpu, FiHeart, FiMessageCircle, FiUser, FiSave, FiX, FiVolume2, FiPlay, FiUsers, FiFile, FiLock, FiUserPlus, FiUserCheck } from 'react-icons/fi'
import { postsApi, authApi, aiPromptPresetsApi, aiConfigApi, usersApi } from '../../services/api'
import { useAuthStore } from '../../stores'
import { Link } from 'react-router-dom'
import { User } from '../../types'
import { getAvailableVoices, setPreferredVoice, getPreferredVoice, speak } from '../../utils/tts'
import { UserManagement } from '../../components/UserManagement/UserManagement'
import { FollowButton } from '../../components/FollowButton/FollowButton'

type TabType = 'posts' | 'profile' | 'settings' | 'ai-config' | 'ai-prompts' | 'liked' | 'commented' | 'users' | 'posts-manage' | 'followers' | 'following' | 'friends'

interface SettingsForm {
  displayTimePreference: string
  displayOrderPreference: string
  aiPromptPresetId: string
}

export function Profile() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, isAuthenticated, isEditor, isAdmin } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabType>('posts')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    nickname: '',
    bio: '',
    phone: '',
    location: '',
    website: '',
    gender: '',
    birthday: '',
  })
  const [isEditingSettings, setIsEditingSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState<SettingsForm>({
    displayTimePreference: 'createdAt',
    displayOrderPreference: 'desc',
    aiPromptPresetId: '',
  })
  const [voices, setVoices] = useState<any[]>([])
  const [selectedVoice, setSelectedVoice] = useState<string>('')
  const [testPlaying, setTestPlaying] = useState(false)
  
  const [aiPromptModalOpen, setAiPromptModalOpen] = useState(false)
  const [aiPromptForm, setAiPromptForm] = useState({
    name: '',
    description: '',
    prompt: '',
    isDefault: false,
    type: 'image',
    isSystem: false,
  })
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null)

  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordError, setPasswordError] = useState('')

  const [aiConfigModalOpen, setAiConfigModalOpen] = useState(false)
  const [aiConfigForm, setAiConfigForm] = useState({
    ollamaBaseUrl: '',
    ollamaModel: '',
    customApiUrl: '',
    customApiModel: '',
    aiProvider: 'ollama',
    aiPromptPresetId: '',
  })

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => authApi.changePassword(data),
    onSuccess: () => {
      setPasswordModalOpen(false)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      alert('密码修改成功')
    },
    onError: (error: any) => {
      setPasswordError(error.response?.data?.message || '密码修改失败')
    },
  })

  const handleChangePassword = () => {
    setPasswordError('')
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('新密码长度至少 8 位')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('两次输入的密码不一致')
      return
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    })
  }

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = getAvailableVoices()
      setVoices(availableVoices)
      const preferred = getPreferredVoice()
      if (preferred) {
        setSelectedVoice(preferred.name)
      }
    }
    loadVoices()
    speechSynthesis.onvoiceschanged = loadVoices
  }, [])

  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoice(voiceName)
    setPreferredVoice(voiceName)
  }

  const handleTestVoice = () => {
    if (testPlaying) {
      speechSynthesis.cancel()
      setTestPlaying(false)
    } else {
      setTestPlaying(true)
      speak(
        '这是一段测试语音，点击博客卡片上的播放按钮可以朗读文章内容。',
        () => setTestPlaying(true),
        () => setTestPlaying(false),
        () => setTestPlaying(false)
      )
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, navigate])

  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: () => authApi.getProfile(),
    enabled: isAuthenticated,
  })

  const { data: postsData } = useQuery({
    queryKey: ['my-posts', statusFilter],
    queryFn: () => {
      if (statusFilter === 'all') {
        return postsApi.getMyPosts({ page: 1, limit: 100 })
      }
      return postsApi.getMyPosts({ page: 1, limit: 100, status: statusFilter })
    },
    enabled: isAuthenticated,
  })

  const { data: likedPostsData } = useQuery({
    queryKey: ['liked-posts'],
    queryFn: () => authApi.getLikedPosts({ page: 1, limit: 100 }),
    enabled: isAuthenticated,
  })

  const { data: commentedPostsData } = useQuery({
    queryKey: ['commented-posts'],
    queryFn: () => authApi.getCommentedPosts({ page: 1, limit: 100 }),
    enabled: isAuthenticated,
  })

  const { data: aiPromptsData } = useQuery({
    queryKey: ['aiPromptPresets'],
    queryFn: () => aiPromptPresetsApi.getPresets(),
    enabled: isAuthenticated && (activeTab === 'settings' || activeTab === 'ai-config'),
  })

  const { data: aiConfigData } = useQuery({
    queryKey: ['aiConfig'],
    queryFn: () => aiConfigApi.getConfig(),
    enabled: isAuthenticated && activeTab === 'ai-config',
  })

  const profile = profileData?.data.data.user || user

  const { data: ollamaModelsData } = useQuery({
    queryKey: ['ollamaModels'],
    queryFn: () => aiConfigApi.getOllamaModels(),
    enabled: isAuthenticated && aiConfigModalOpen && aiConfigForm.aiProvider === 'ollama',
  })

  const { data: followCountsData } = useQuery({
    queryKey: ['followCounts', profile?.id],
    queryFn: () => usersApi.getFollowCounts(profile?.id!),
    enabled: !!profile?.id,
  })

  const { data: followersData } = useQuery({
    queryKey: ['followers', profile?.id],
    queryFn: () => usersApi.getFollowers(profile?.id!, { page: 1, limit: 50 }),
    enabled: !!profile?.id && activeTab === 'followers',
  })

  const { data: followingData } = useQuery({
    queryKey: ['following', profile?.id],
    queryFn: () => usersApi.getFollowing(profile?.id!, { page: 1, limit: 50 }),
    enabled: !!profile?.id && activeTab === 'following',
  })

  const { data: friendsData } = useQuery({
    queryKey: ['friends', profile?.id],
    queryFn: () => usersApi.getFriends(profile?.id!, { page: 1, limit: 50 }),
    enabled: !!profile?.id && activeTab === 'friends',
  })

  const ollamaModels = ollamaModelsData?.data?.data?.models || []

  const updateAiConfigMutation = useMutation({
    mutationFn: (data: any) => aiConfigApi.updateConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiConfig'] })
      setAiConfigModalOpen(false)
      alert('AI 配置已保存')
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || '保存失败')
    },
  })

  const posts = postsData?.data.data.posts || []
  const likedPosts = likedPostsData?.data.data.posts || []
  const commentedPosts = commentedPostsData?.data.data.posts || []
  const aiPrompts = aiPromptsData?.data.data.presets || []
  const followCounts = followCountsData?.data.data || { followingCount: 0, followersCount: 0, friendsCount: 0 }
  const followers = followersData?.data.data.users || []
  const following = followingData?.data.data.users || []
  const friends = friendsData?.data.data.users || []

  const publishedCount = posts.filter((p: any) => p.status === 'published').length
  const draftCount = posts.filter((p: any) => p.status === 'draft').length

  useEffect(() => {
    if (profile && !isEditingProfile) {
      setProfileForm({
        nickname: profile.nickname || '',
        bio: profile.bio || '',
        phone: profile.phone || '',
        location: profile.location || '',
        website: profile.website || '',
        gender: profile.gender || '',
        birthday: profile.birthday || '',
      })
    }
  }, [profileData])

  // 同步设置表单数据
  useEffect(() => {
    if (profile && !isEditingSettings) {
      setSettingsForm({
        displayTimePreference: profile.displayTimePreference || 'createdAt',
        displayOrderPreference: profile.displayOrderPreference || 'desc',
        aiPromptPresetId: profile.aiPromptPresetId || '',
      })
    }
  }, [profileData])

  // 同步 AI 配置数据
  useEffect(() => {
    if (aiConfigData?.data?.data?.config && !aiConfigModalOpen) {
      const config = aiConfigData.data.data.config
      setAiConfigForm({
        ollamaBaseUrl: config.ollamaBaseUrl || '',
        ollamaModel: config.ollamaModel || '',
        customApiUrl: config.customApiUrl || '',
        customApiModel: config.customApiModel || '',
        aiProvider: config.aiProvider || 'ollama',
        aiPromptPresetId: config.aiPromptPresetId || '',
      })
    }
  }, [aiConfigData, aiConfigModalOpen])

  // 检查设置是否已修改
  const settingsChanged = useMemo(() => {
    if (!profile) return false
    const original: SettingsForm = {
      displayTimePreference: profile.displayTimePreference || 'createdAt',
      displayOrderPreference: profile.displayOrderPreference || 'desc',
      aiPromptPresetId: profile.aiPromptPresetId || '',
    }
    return JSON.stringify(original) !== JSON.stringify(settingsForm)
  }, [settingsForm, profile])

  // 取消编辑设置
  const handleCancelSettings = () => {
    setSettingsForm({
      displayTimePreference: profile?.displayTimePreference || 'createdAt',
      displayOrderPreference: profile?.displayOrderPreference || 'desc',
      aiPromptPresetId: profile?.aiPromptPresetId || '',
    })
    setIsEditingSettings(false)
  }

  // 应用设置
  const handleApplySettings = () => {
    updateSettingsMutation.mutate({
      displayTimePreference: settingsForm.displayTimePreference,
      displayOrderPreference: settingsForm.displayOrderPreference,
      aiPromptPresetId: settingsForm.aiPromptPresetId || undefined,
    })
    setIsEditingSettings(false)
  }

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<User>) => authApi.updateProfile(data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      // 直接获取最新数据并更新表单
      try {
        const newProfile = await authApi.getProfile()
        const newUser = newProfile.data.data.user
        setProfileForm({
          nickname: newUser.nickname || '',
          bio: newUser.bio || '',
          phone: newUser.phone || '',
          location: newUser.location || '',
          website: newUser.website || '',
          gender: newUser.gender || '',
          birthday: newUser.birthday || '',
        })
      } catch (e) {
        console.error('获取最新数据失败:', e)
      }
      setIsEditingProfile(false)
    },
    onError: (error) => {
      console.error('更新失败:', error)
      alert('保存失败，请重试')
    },
  })

  const updateSettingsMutation = useMutation({
    mutationFn: (data: { displayTimePreference?: string; displayOrderPreference?: string; aiPromptPresetId?: string }) => authApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (error) => {
      console.error('设置保存失败:', error)
      alert('保存失败，请重试')
    },
  })

  const createPromptMutation = useMutation({
    mutationFn: (data: { name: string; description: string; prompt: string; isDefault: boolean; type: string }) => aiPromptPresetsApi.createPreset(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiPromptPresets'] })
      setAiPromptModalOpen(false)
      setAiPromptForm({ name: '', description: '', prompt: '', isDefault: false, type: 'image', isSystem: false })
    },
    onError: (error) => {
      console.error('创建失败:', error)
      alert('创建失败，请重试')
    },
  })

  const updatePromptMutation = useMutation({
    mutationFn: (data: { id: string; name: string; description: string; prompt: string; isDefault: boolean; type: string }) => aiPromptPresetsApi.updatePreset(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiPromptPresets'] })
      setAiPromptModalOpen(false)
      setEditingPromptId(null)
      setAiPromptForm({ name: '', description: '', prompt: '', isDefault: false, type: 'image', isSystem: false })
    },
    onError: (error) => {
      console.error('更新失败:', error)
      alert('更新失败，请重试')
    },
  })

  const deletePromptMutation = useMutation({
    mutationFn: (id: string) => aiPromptPresetsApi.deletePreset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiPromptPresets'] })
    },
    onError: (error) => {
      console.error('删除失败:', error)
      alert('删除失败，请重试')
    },
  })

  const setDefaultPromptMutation = useMutation({
    mutationFn: (id: string) => aiPromptPresetsApi.setDefaultPreset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiPromptPresets'] })
    },
    onError: (error) => {
      console.error('设置默认失败:', error)
      alert('设置默认失败，请重试')
    },
  })

  const handleSaveProfile = () => {
    const data: Partial<User> = {}
    if (profileForm.nickname) data.nickname = profileForm.nickname
    if (profileForm.bio) data.bio = profileForm.bio
    if (profileForm.phone) data.phone = profileForm.phone
    if (profileForm.location) data.location = profileForm.location
    if (profileForm.website) data.website = profileForm.website
    if (profileForm.gender) data.gender = profileForm.gender
    if (profileForm.birthday) data.birthday = profileForm.birthday
    updateProfileMutation.mutate(data)
  }

  if (!isAuthenticated) return null

  const renderTabButton = (tab: TabType, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap w-full justify-start ${
        activeTab === tab
          ? 'bg-primary-600 text-white'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )

  const renderPostCard = (post: any) => (
    <div key={post.id} className="card p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
        {post.photos?.[0] && (
          <img
            src={post.photos[0].url?.startsWith('http') ? post.photos[0].url : `${window.location.origin}${post.photos[0].url}`}
            alt=""
            className="w-full sm:w-20 h-32 sm:h-20 object-cover rounded-lg flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              post.status === 'published'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              {post.status === 'published' ? '已发布' : '草稿'}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(post.createdAt).toLocaleDateString('zh-CN')}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
            {post.title}
          </h3>
          <p className="text-sm text-gray-500 line-clamp-1">
            {post.content?.slice(0, 60) || post.photos?.[0]?.caption || '暂无内容'}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <FiEye className="w-3 h-3" /> {post.viewCount || 0}
            </span>
            <span className="flex items-center gap-1">
              <FiFileText className="w-3 h-3" /> {post.commentCount || 0}
            </span>
          </div>
        </div>
        <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto sm:flex-none">
          {post.status === 'draft' ? (
            <Link
              to={`/editor/${post.id}`}
              className="btn-secondary text-xs sm:text-sm flex items-center justify-center gap-1 flex-1 sm:flex-none"
            >
              <FiEdit className="w-3 h-3" /> <span className="sm:hidden">编辑</span><span className="hidden sm:inline">继续编辑</span>
            </Link>
          ) : (
            <a
              href={`/post/${post.id}`}
              className="btn-secondary text-xs sm:text-sm flex items-center justify-center gap-1 flex-1 sm:flex-none"
            >
              <FiEye className="w-3 h-3" /> 查看
            </a>
          )}
        </div>
      </div>
    </div>
  )

  const renderPostsTab = () => (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            statusFilter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          全部 ({posts.length})
        </button>
        <button
          onClick={() => setStatusFilter('published')}
          className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            statusFilter === 'published'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          已发布 ({publishedCount})
        </button>
        <button
          onClick={() => setStatusFilter('draft')}
          className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            statusFilter === 'draft'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <FiClock className="w-3 sm:w-4 h-3 sm:h-4 inline mr-1" /> 草稿 ({draftCount})
        </button>
      </div>
      {posts.length > 0 ? (
        <div className="space-y-4">{posts.map(renderPostCard)}</div>
      ) : (
        <div className="card p-12 text-center">
          <p className="text-gray-500 mb-4">
            {statusFilter === 'all' ? '暂无文章' : statusFilter === 'published' ? '暂无已发布的文章' : '暂无草稿'}
          </p>
          <Link to="/editor" className="btn-primary inline-flex items-center gap-2">
            <FiEdit className="w-4 h-4" /> 写第一篇文章
          </Link>
        </div>
      )}
    </>
  )

  const renderProfileTab = () => (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">个人资料</h2>
        {isEditingProfile ? (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditingProfile(false)}
              className="btn-secondary flex items-center gap-1"
            >
              <FiX className="w-4 h-4" /> 取消
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending}
              className="btn-primary flex items-center gap-1"
            >
              <FiSave className="w-4 h-4" /> 保存
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditingProfile(true)}
            className="btn-secondary flex items-center gap-1"
          >
            <FiEdit className="w-4 h-4" /> 编辑
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="w-16 sm:w-24 h-16 sm:h-24 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-2xl sm:text-4xl font-bold text-white">
            {profile?.nickname?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {profile?.nickname}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            {profile?.email && (
              <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <FiMail className="w-4 h-4" /> <span className="hidden sm:inline">{profile.email}</span>
                <span className="sm:hidden">{profile.email.split('@')[0]}@...</span>
              </p>
            )}
            <span className={`text-xs px-2 py-1 rounded-full ${
              profile?.role === 'admin' 
                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                : profile?.role === 'editor'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {profile?.role === 'admin' ? '管理员' : profile?.role === 'editor' ? '编辑' : '用户'}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">昵称</label>
          {isEditingProfile ? (
            <input
              type="text"
              value={profileForm.nickname}
              onChange={(e) => setProfileForm({ ...profileForm, nickname: e.target.value })}
              className="input w-full"
            />
          ) : (
            <p className="text-gray-900 dark:text-white">{profile?.nickname || '-'}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">个人简介</label>
          {isEditingProfile ? (
            <textarea
              value={profileForm.bio}
              onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
              className="input w-full" rows={3}
            />
          ) : (
            <p className="text-gray-900 dark:text-white">{profile?.bio || '-'}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">手机号</label>
            {isEditingProfile ? (
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="input w-full"
              />
            ) : (
              <p className="text-gray-900 dark:text-white">{profile?.phone || '-'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">性别</label>
            {isEditingProfile ? (
              <select
                value={profileForm.gender}
                onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                className="input w-full"
              >
                <option value="">未设置</option>
                <option value="male">男</option>
                <option value="female">女</option>
                <option value="other">其他</option>
              </select>
            ) : (
              <p className="text-gray-900 dark:text-white">
                {profile?.gender === 'male' ? '男' : profile?.gender === 'female' ? '女' : profile?.gender === 'other' ? '其他' : '-'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">地区</label>
            {isEditingProfile ? (
              <input
                type="text"
                value={profileForm.location}
                onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                className="input w-full"
              />
            ) : (
              <p className="text-gray-900 dark:text-white">{profile?.location || '-'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">生日</label>
            {isEditingProfile ? (
              <input
                type="date"
                value={profileForm.birthday}
                onChange={(e) => setProfileForm({ ...profileForm, birthday: e.target.value })}
                className="input w-full"
              />
            ) : (
              <p className="text-gray-900 dark:text-white">{profile?.birthday || '-'}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">个人网站</label>
          {isEditingProfile ? (
            <input
              type="url"
              value={profileForm.website}
              onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
              className="input w-full"
              placeholder="https://"
            />
          ) : (
            <p className="text-gray-900 dark:text-white">{profile?.website || '-'}</p>
          )}
        </div>

        <div className="pt-4 border-t dark:border-gray-700">
          <button
            onClick={() => setPasswordModalOpen(true)}
            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
          >
            <FiLock className="w-4 h-4" />
            修改密码
          </button>
        </div>
      </div>

      {passwordModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">修改密码</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">当前密码</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">新密码</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="input w-full"
                  placeholder="至少 8 位"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">确认新密码</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="input w-full"
                />
              </div>
              {passwordError && (
                <p className="text-sm text-red-600">{passwordError}</p>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setPasswordModalOpen(false)
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                  setPasswordError('')
                }}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleChangePassword}
                disabled={changePasswordMutation.isPending}
                className="btn-primary"
              >
                {changePasswordMutation.isPending ? '提交中...' : '确认修改'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderSettingsTab = () => (
    <div className="card p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">显示设置</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            博客卡片时间显示
          </label>
          <p className="text-xs text-gray-500 mb-3">选择时间线、网格、瀑布流布局中显示的时间依据</p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <button
              onClick={() => { setSettingsForm({ ...settingsForm, displayTimePreference: 'createdAt' }); setIsEditingSettings(true); }}
              className={`px-3 sm:px-4 py-2 rounded-lg border-2 transition-colors text-sm ${
                settingsForm.displayTimePreference === 'createdAt'
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              发布时间
            </button>
            <button
              onClick={() => { setSettingsForm({ ...settingsForm, displayTimePreference: 'takenAt' }); setIsEditingSettings(true); }}
              className={`px-3 sm:px-4 py-2 rounded-lg border-2 transition-colors text-sm ${
                settingsForm.displayTimePreference === 'takenAt'
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              拍摄时间
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            博客卡片排序
          </label>
          <p className="text-xs text-gray-500 mb-3">选择博客列表的排序方式</p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <button
              onClick={() => { setSettingsForm({ ...settingsForm, displayOrderPreference: 'desc' }); setIsEditingSettings(true); }}
              className={`px-3 sm:px-4 py-2 rounded-lg border-2 transition-colors text-sm ${
                settingsForm.displayOrderPreference === 'desc'
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              降序（最新在前）
            </button>
            <button
              onClick={() => { setSettingsForm({ ...settingsForm, displayOrderPreference: 'asc' }); setIsEditingSettings(true); }}
              className={`px-3 sm:px-4 py-2 rounded-lg border-2 transition-colors text-sm ${
                settingsForm.displayOrderPreference === 'asc'
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              升序（最早在前）
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            朗读语音设置
          </label>
          <p className="text-xs text-gray-500 mb-3">选择博客文章的朗读语音</p>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <select
              value={selectedVoice}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="input w-full sm:w-64"
            >
              <option value="">默认语音</option>
              {voices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
            <button
              onClick={handleTestVoice}
              className="btn-secondary flex items-center gap-2"
            >
              {testPlaying ? (
                <>
                  <FiVolume2 className="w-4 h-4 animate-pulse" />
                  播放中...
                </>
              ) : (
                <>
                  <FiPlay className="w-4 h-4" />
                  测试语音
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            点击博客卡片上的播放按钮可以朗读文章标题和正文
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            默认 AI 提示词
          </label>
          <p className="text-xs text-gray-500 mb-3">选择图片分析时使用的默认提示词</p>
          <select
            value={settingsForm.aiPromptPresetId}
            onChange={(e) => { setSettingsForm({ ...settingsForm, aiPromptPresetId: e.target.value }); setIsEditingSettings(true); }}
            className="input w-full max-w-md"
          >
            <option value="">默认提示词</option>
            {aiPrompts.map((preset: any) => (
              <option key={preset.id} value={preset.id}>{preset.name}</option>
            ))}
          </select>
        </div>
      </div>

      {isEditingSettings && (
        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleCancelSettings}
            disabled={updateSettingsMutation.isPending}
            className="btn-secondary flex items-center gap-2"
          >
            <FiX className="w-4 h-4" /> 取消
          </button>
          <button
            onClick={handleApplySettings}
            disabled={!settingsChanged || updateSettingsMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            <FiSave className="w-4 h-4" /> 
            {updateSettingsMutation.isPending ? '保存中...' : '应用'}
          </button>
        </div>
      )}
    </div>
  )

  const handleOpenCreatePrompt = () => {
    setEditingPromptId(null)
    setAiPromptForm({ name: '', description: '', prompt: '', isDefault: false, type: 'image', isSystem: false })
    setAiPromptModalOpen(true)
  }

  const handleOpenEditPrompt = (preset: any) => {
    setEditingPromptId(preset.id)
    setAiPromptForm({
      name: preset.name,
      description: preset.description,
      prompt: preset.prompt,
      isDefault: preset.isDefault,
      type: preset.type || 'image',
      isSystem: preset.userId === 'system',
    })
    setAiPromptModalOpen(true)
  }

  const handleSavePrompt = () => {
    if (!aiPromptForm.name || !aiPromptForm.prompt) {
      alert('请填写名称和提示词内容')
      return
    }
    const promptData = {
      name: aiPromptForm.name,
      description: aiPromptForm.description,
      prompt: aiPromptForm.prompt,
      isDefault: aiPromptForm.isDefault,
      type: aiPromptForm.type,
    }
    if (editingPromptId) {
      updatePromptMutation.mutate({
        id: editingPromptId,
        ...promptData,
      })
    } else {
      createPromptMutation.mutate(promptData)
    }
  }

  const handleDeletePrompt = (id: string) => {
    if (confirm('确定要删除这个提示词吗？')) {
      deletePromptMutation.mutate(id)
    }
  }

  const handleSaveAiConfig = () => {
    updateAiConfigMutation.mutate({
      ollamaBaseUrl: aiConfigForm.ollamaBaseUrl,
      ollamaModel: aiConfigForm.ollamaModel,
      customApiUrl: aiConfigForm.customApiUrl,
      customApiModel: aiConfigForm.customApiModel,
      aiProvider: aiConfigForm.aiProvider,
      aiPromptPresetId: aiConfigForm.aiPromptPresetId || null,
    })
  }

  const renderAiConfigTab = () => {
    const imagePrompts = aiPrompts.filter((p: any) => p.type === 'image')
    const searchPrompts = aiPrompts.filter((p: any) => p.type === 'search')

    const renderPromptCard = (preset: any) => (
      <div key={preset.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-900 dark:text-white">{preset.name}</h3>
          <div className="flex items-center gap-2">
            {preset.isDefault ? (
              <span className="text-xs px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded">默认</span>
            ) : (
              <button
                onClick={() => setDefaultPromptMutation.mutate(preset.id)}
                className="text-xs px-2 py-0.5 text-gray-500 hover:text-primary-600 border border-gray-300 rounded"
              >
                设为默认
              </button>
            )}
            <button
              onClick={() => handleOpenEditPrompt(preset)}
              className="text-xs px-2 py-0.5 text-gray-500 hover:text-primary-600"
            >
              编辑
            </button>
            <button
              onClick={() => handleDeletePrompt(preset.id)}
              className="text-xs px-2 py-0.5 text-gray-500 hover:text-red-600"
            >
              删除
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{preset.description}</p>
        <p className="text-xs text-gray-500 line-clamp-2">{preset.prompt}</p>
      </div>
    )

    return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">大模型配置</h2>
        <button
          onClick={() => setAiConfigModalOpen(true)}
          className="btn-primary text-sm"
        >
          编辑配置
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              AI 提供商
            </label>
            <p className="text-gray-900 dark:text-white">
              {aiConfigForm.aiProvider === 'ollama' ? 'Ollama' : '自定义 API'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              使用的提示词
            </label>
            <p className="text-gray-900 dark:text-white">
              {aiPrompts.find(p => p.id === aiConfigForm.aiPromptPresetId)?.name || '默认提示词'}
            </p>
          </div>
        </div>

        {aiConfigForm.aiProvider === 'ollama' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ollama 地址
              </label>
              <p className="text-gray-900 dark:text-white">{aiConfigForm.ollamaBaseUrl || '默认'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                模型名称
              </label>
              <p className="text-gray-900 dark:text-white">{aiConfigForm.ollamaModel || '默认'}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API 地址
              </label>
              <p className="text-gray-900 dark:text-white">{aiConfigForm.customApiUrl || '未设置'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API 模型
              </label>
              <p className="text-gray-900 dark:text-white">{aiConfigForm.customApiModel || '未设置'}</p>
            </div>
          </div>
        )}
      </div>

      {aiConfigModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                编辑大模型配置
              </h3>
              <button
                onClick={() => setAiConfigModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  AI 提供商
                </label>
                <select
                  value={aiConfigForm.aiProvider}
                  onChange={(e) => setAiConfigForm({ ...aiConfigForm, aiProvider: e.target.value })}
                  className="input w-full"
                >
                  <option value="ollama">Ollama</option>
                  <option value="custom">自定义 API (OpenAI 兼容)</option>
                </select>
              </div>

              {aiConfigForm.aiProvider === 'ollama' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ollama API 地址
                    </label>
                    <input
                      type="text"
                      value={aiConfigForm.ollamaBaseUrl}
                      onChange={(e) => setAiConfigForm({ ...aiConfigForm, ollamaBaseUrl: e.target.value })}
                      className="input w-full"
                      placeholder="http://192.168.1.111:11434"
                    />
                    <p className="text-xs text-gray-500 mt-1">留空使用默认地址</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      模型名称
                    </label>
                    {ollamaModels.length > 0 ? (
                      <select
                        value={aiConfigForm.ollamaModel}
                        onChange={(e) => setAiConfigForm({ ...aiConfigForm, ollamaModel: e.target.value })}
                        className="input w-full"
                      >
                        <option value="">默认</option>
                        {ollamaModels.map((model: any) => (
                          <option key={model.name} value={model.name}>{model.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={aiConfigForm.ollamaModel}
                        onChange={(e) => setAiConfigForm({ ...aiConfigForm, ollamaModel: e.target.value })}
                        className="input w-full"
                        placeholder="openbmb/minicpm-v4.5:8b"
                      />
                    )}
                    <p className="text-xs text-gray-500 mt-1">{ollamaModels.length > 0 ? '从 Ollama 已安装模型中选择' : '留空使用默认模型'}</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      API 地址
                    </label>
                    <input
                      type="text"
                      value={aiConfigForm.customApiUrl}
                      onChange={(e) => setAiConfigForm({ ...aiConfigForm, customApiUrl: e.target.value })}
                      className="input w-full"
                      placeholder="https://api.openai.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">支持 OpenAI 兼容的 API</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      API Key
                    </label>
                    <input
                      type="password"
                      className="input w-full"
                      placeholder="需要 API Key 请联系管理员"
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">暂不支持自定义 API Key</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      模型名称
                    </label>
                    <input
                      type="text"
                      value={aiConfigForm.customApiModel}
                      onChange={(e) => setAiConfigForm({ ...aiConfigForm, customApiModel: e.target.value })}
                      className="input w-full"
                      placeholder="gpt-4o"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  搜索解析提示词
                </label>
                <select
                  value={aiConfigForm.aiPromptPresetId}
                  onChange={(e) => setAiConfigForm({ ...aiConfigForm, aiPromptPresetId: e.target.value })}
                  className="input w-full"
                >
                  <option value="">默认提示词</option>
                  {aiPrompts.filter((p: any) => p.type === 'search').map((preset: any) => (
                    <option key={preset.id} value={preset.id}>{preset.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">选择在"AI提示词"标签中创建的搜索类型提示词</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setAiConfigModalOpen(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleSaveAiConfig}
                disabled={updateAiConfigMutation.isPending}
                className="btn-primary"
              >
                {updateAiConfigMutation.isPending ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI 提示词管理</h2>
          <button onClick={handleOpenCreatePrompt} className="btn-primary text-sm">
            新建提示词
          </button>
        </div>

        {aiPrompts.length > 0 ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                图片理解提示词 ({imagePrompts.length})
              </h3>
              <div className="space-y-3">
                {imagePrompts.map(renderPromptCard)}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                搜索关键词提示词 ({searchPrompts.length})
              </h3>
              <div className="space-y-3">
                {searchPrompts.map(renderPromptCard)}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">暂无提示词，请点击"新建提示词"创建</p>
        )}

        {aiPromptModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {editingPromptId ? '编辑提示词' : '新建提示词'}
                </h3>
                <button onClick={() => setAiPromptModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    提示词类型 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={aiPromptForm.type}
                    onChange={(e) => setAiPromptForm({ ...aiPromptForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                  >
                    <option value="image">图片理解</option>
                    <option value="search">搜索关键词</option>
                  </select>
                </div>
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      提示词归属
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="presetType"
                          checked={aiPromptForm.isSystem === true}
                          onChange={() => setAiPromptForm({ ...aiPromptForm, isSystem: true })}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">系统级</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="presetType"
                          checked={aiPromptForm.isSystem === false}
                          onChange={() => setAiPromptForm({ ...aiPromptForm, isSystem: false })}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">用户级</span>
                      </label>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    提示词名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={aiPromptForm.name}
                    onChange={(e) => setAiPromptForm({ ...aiPromptForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                    placeholder="输入提示词名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    提示词描述
                  </label>
                  <input
                    type="text"
                    value={aiPromptForm.description}
                    onChange={(e) => setAiPromptForm({ ...aiPromptForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                    placeholder="简要描述此提示词的用途"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    提示词内容 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={aiPromptForm.prompt}
                    onChange={(e) => setAiPromptForm({ ...aiPromptForm, prompt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 min-h-[200px]"
                    placeholder="输入 AI 提示词内容"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setAiPromptModalOpen(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  取消
                </button>
                <button
                  onClick={handleSavePrompt}
                  disabled={createPromptMutation.isPending || updatePromptMutation.isPending}
                  className="btn-primary"
                >
                  {createPromptMutation.isPending || updatePromptMutation.isPending ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
  }

  const renderFollowTab = () => {
    const list = activeTab === 'followers' ? followers : activeTab === 'following' ? following : friends
    const title = activeTab === 'followers' ? '粉丝' : activeTab === 'following' ? '关注' : '好友'

    const renderUserCard = (u: any) => {
      const isFollowersTab = activeTab === 'followers'
      const isFollowingTab = activeTab === 'following'
      const isFriendsTab = activeTab === 'friends'
      const isFriend = (u as any).isFriend || false

      let buttonProps: {
        mode?: 'auto' | 'follow' | 'unfollow'
        disabled?: boolean
        showFriendBadge?: boolean
      } = {}

      if (isFollowersTab) {
        if (isFriend) {
          buttonProps = { mode: 'auto', disabled: true }
        } else {
          buttonProps = { mode: 'follow' }
        }
      } else if (isFollowingTab) {
        buttonProps = { mode: 'unfollow', showFriendBadge: isFriend }
      } else if (isFriendsTab) {
        buttonProps = { mode: 'unfollow' }
      }

      return (
        <div key={u.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
            {u.avatar ? (
              <img src={u.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <span className="text-white font-medium">{u.nickname?.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-white truncate">{u.nickname}</p>
            {u.bio && <p className="text-sm text-gray-500 truncate">{u.bio}</p>}
          </div>
          {user && user.id !== u.id && (
            <FollowButton
              userId={u.id}
              isFollowing={(u as any).isFollowing || false}
              isFriend={isFriend}
              size="sm"
              {...buttonProps}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['followers', profile?.id] })
                queryClient.invalidateQueries({ queryKey: ['following', profile?.id] })
                queryClient.invalidateQueries({ queryKey: ['friends', profile?.id] })
                queryClient.invalidateQueries({ queryKey: ['followCounts', profile?.id] })
              }}
            />
          )}
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{title}</h2>
        {list.length > 0 ? (
          <div className="space-y-2">{list.map(renderUserCard)}</div>
        ) : (
          <div className="card p-12 text-center">
            <p className="text-gray-500">暂无{title}</p>
          </div>
        )}
      </div>
    )
  }

  const renderLikedTab = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">我点赞的文章</h2>
      {likedPosts.length > 0 ? (
        likedPosts.map(renderPostCard)
      ) : (
        <div className="card p-12 text-center">
          <p className="text-gray-500">暂无点赞的文章</p>
        </div>
      )}
    </div>
  )

  const renderCommentedTab = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">我评论的文章</h2>
      {commentedPosts.length > 0 ? (
        commentedPosts.map(renderPostCard)
      ) : (
        <div className="card p-12 text-center">
          <p className="text-gray-500">暂无评论的文章</p>
        </div>
      )}
    </div>
  )

  const [manageStatusFilter, setManageStatusFilter] = useState<string>('')
  const [manageVisibilityFilter, setManageVisibilityFilter] = useState<string>('')
  const [manageUserFilter, setManageUserFilter] = useState<string>('')

  const { data: usersData } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => usersApi.getAllUsers(),
    enabled: isAdmin,
  })

  const { data: allPostsData, isLoading: allPostsLoading } = useQuery({
    queryKey: ['posts-all', manageStatusFilter, manageVisibilityFilter, manageUserFilter],
    queryFn: () => postsApi.getAllPosts({ 
      status: manageStatusFilter || undefined,
      visibility: manageVisibilityFilter || undefined,
      userId: manageUserFilter || undefined,
    }),
    enabled: isAdmin,
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => postsApi.updatePostStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts-all'] })
    },
  })

  const deletePostMutation = useMutation({
    mutationFn: (id: string) => postsApi.deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts-all'] })
    },
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published':
        return '已发布'
      case 'draft':
        return '草稿'
      case 'archived':
        return '归档'
      default:
        return status
    }
  }

  const renderPostsManageTab = () => {
    const getVisibilityBadge = (visibility: string) => {
      switch (visibility) {
        case 'public':
          return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        case 'friends':
          return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
        case 'followers':
          return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
        case 'private':
          return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        default:
          return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      }
    }

    const getVisibilityLabel = (visibility: string) => {
      switch (visibility) {
        case 'public':
          return '公开'
        case 'friends':
          return '好友'
        case 'followers':
          return '关注者'
        case 'private':
          return '私有'
        default:
          return visibility
      }
    }

    const users = usersData?.data.data.users || []

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <select
            value={manageStatusFilter}
            onChange={(e) => setManageStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">全部状态</option>
            <option value="published">已发布</option>
            <option value="draft">草稿</option>
            <option value="archived">归档</option>
          </select>

          <select
            value={manageVisibilityFilter}
            onChange={(e) => setManageVisibilityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">全部可见范围</option>
            <option value="public">公开</option>
            <option value="friends">好友</option>
            <option value="followers">关注者</option>
            <option value="private">私有</option>
          </select>

          <select
            value={manageUserFilter}
            onChange={(e) => setManageUserFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">全部用户</option>
            {users.map((user: any) => (
              <option key={user.id} value={user.id}>
                {user.nickname}
              </option>
            ))}
          </select>
        </div>

        {allPostsLoading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : (
          <div className="space-y-3">
            {allPostsData?.data.data.posts.map((post: any) => (
              <div key={post.id} className="card p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(post.status)}`}>
                      {getStatusLabel(post.status)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getVisibilityBadge(post.visibility)}`}>
                      {getVisibilityLabel(post.visibility)}
                    </span>
                    <span className="text-xs text-gray-400">{post.user?.nickname}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">{post.title}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(post.createdAt).toLocaleDateString('zh-CN')} · {post.viewCount} 阅读 · {post.likeCount} 点赞
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {post.status === 'published' ? (
                    <button
                      onClick={() => updateStatusMutation.mutate({ id: post.id, status: 'draft' })}
                      className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                    >
                      下架
                    </button>
                  ) : (
                    <button
                      onClick={() => updateStatusMutation.mutate({ id: post.id, status: 'published' })}
                      className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                    >
                      发布
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('确定要删除这篇文章吗？')) {
                        deletePostMutation.mutate(post.id)
                      }
                    }}
                    className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          {allPostsData?.data.data.posts.length === 0 && (
            <div className="text-center py-8 text-gray-500">暂无文章</div>
          )}
        </div>
      )}
    </div>
  )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="flex-1 min-w-0 order-2 sm:order-1">
          {activeTab === 'posts' && renderPostsTab()}
          {activeTab === 'profile' && renderProfileTab()}
          {(activeTab === 'followers' || activeTab === 'following' || activeTab === 'friends') && renderFollowTab()}
          {activeTab === 'settings' && renderSettingsTab()}
          {activeTab === 'ai-config' && renderAiConfigTab()}
          {activeTab === 'liked' && renderLikedTab()}
          {activeTab === 'commented' && renderCommentedTab()}
          {activeTab === 'posts-manage' && isAdmin && renderPostsManageTab()}
          {activeTab === 'users' && isAdmin && user && <UserManagement currentUser={user} />}
        </div>

        <div className="w-full sm:w-48 flex-shrink-0 order-1 sm:order-2">
          <div className="flex sm:flex-col gap-2 overflow-x-auto pb-2 sm:pb-0">
            {renderTabButton('profile', '个人资料', <FiUser className="w-4 h-4" />)}
            {renderTabButton('posts', `我的文章 (${posts.length})`, <FiFileText className="w-4 h-4" />)}
            {renderTabButton('liked', `点赞 (${likedPosts.length})`, <FiHeart className="w-4 h-4" />)}
            {renderTabButton('commented', `评论 (${commentedPosts.length})`, <FiMessageCircle className="w-4 h-4" />)}
            {renderTabButton('followers', `粉丝 ${followCounts.followersCount}`, <FiUserCheck className="w-4 h-4" />)}
            {renderTabButton('following', `关注 ${followCounts.followingCount}`, <FiUserPlus className="w-4 h-4" />)}
            {renderTabButton('friends', `好友 ${followCounts.friendsCount}`, <FiUsers className="w-4 h-4" />)}
            {renderTabButton('settings', '布局设置', <FiSettings className="w-4 h-4" />)}
            {renderTabButton('ai-config', '大模型配置', <FiCpu className="w-4 h-4" />)}
            {isAdmin && renderTabButton('posts-manage', '文章管理', <FiFile className="w-4 h-4" />)}
            {isEditor && renderTabButton('users', '用户管理', <FiUsers className="w-4 h-4" />)}
          </div>
        </div>
      </div>
    </div>
  )
}

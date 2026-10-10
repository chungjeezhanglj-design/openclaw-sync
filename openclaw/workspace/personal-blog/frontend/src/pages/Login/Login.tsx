import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { FiMail, FiLock, FiUser, FiMessageCircle } from 'react-icons/fi'
import { authApi } from '../../services/api'
import { useAuthStore } from '../../stores'

export function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ email: '', password: '', nickname: '' })

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data.data.data.user, data.data.data.token)
      navigate('/')
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.message || '登录失败，请检查邮箱和密码'
      alert(msg)
    },
  })

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setAuth(data.data.data.user, data.data.data.token)
      navigate('/')
    },
    onError: (error: any) => {
      console.error('Register error:', error.response?.data)
      const data = error.response?.data
      if (data?.errors) {
        const msg = data.errors.map((e: any) => e.msg).join(', ')
        alert(msg)
      } else {
        const msg = data?.message || error.message || '注册失败，请检查输入信息'
        alert(msg)
      }
    },
  })

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate(loginForm)
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    registerMutation.mutate(registerForm)
  }

  const handleWechatLogin = async () => {
    try {
      const response = await authApi.getWechatAuthUrl()
      window.location.href = response.data.data.authUrl
    } catch (error) {
      alert('获取微信登录链接失败')
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="card p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
          欢迎回来
        </h1>

        {/* Tabs */}
        <div className="flex mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'login'
                ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            登录
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'register'
                ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            注册
          </button>
        </div>

        {/* Forms */}
        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                邮箱
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="input pl-10"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                密码
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="input pl-10"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full btn-primary disabled:opacity-50"
            >
              {loginMutation.isPending ? '登录中...' : '登录'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                昵称
              </label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={registerForm.nickname}
                  onChange={(e) => setRegisterForm({ ...registerForm, nickname: e.target.value })}
                  className="input pl-10"
                  placeholder="你的昵称"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                邮箱
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  className="input pl-10"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                密码
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  className="input pl-10"
                  placeholder="至少6位字符"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full btn-primary disabled:opacity-50"
            >
              {registerMutation.isPending ? '注册中...' : '注册'}
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">或使用</span>
          </div>
        </div>

        {/* WeChat Login */}
        <button
          onClick={handleWechatLogin}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <FiMessageCircle className="w-5 h-5 text-green-500" />
          <span className="text-gray-700 dark:text-gray-300">微信登录</span>
        </button>
      </div>
    </div>
  )
}

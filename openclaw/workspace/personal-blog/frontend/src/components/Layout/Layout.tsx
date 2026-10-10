import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiHome, FiEdit, FiMoon, FiSun, FiLogOut, FiHelpCircle, FiMenu, FiX, FiSearch, FiUsers, FiShield } from 'react-icons/fi'
import { useAuthStore, useThemeStore } from '../../stores'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { isAuthenticated, user, logout } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)

  const isActive = (path: string) => location.pathname === path
  const isHomePage = location.pathname === '/'

  // 管理员菜单项
  const adminItems = [
    { to: '/admin/logs', label: '日志管理' },
  ]

  const handleSearchClick = () => {
    if (isHomePage) {
      window.dispatchEvent(new Event('trigger-search'))
    } else {
      navigate('/')
      setTimeout(() => {
        window.dispatchEvent(new Event('trigger-search'))
      }, 100)
    }
  }

  const navItems = [
    { to: '/', icon: FiHome, label: '首页', onClick: undefined },
    { to: '/search', icon: FiSearch, label: '搜索', onClick: handleSearchClick },
    ...(isAuthenticated ? [{ to: '/search-users', icon: FiUsers, label: '找用户', onClick: undefined }] : []),
    ...(isAuthenticated ? [{ to: '/editor', icon: FiEdit, label: '写文章', onClick: undefined }] : []),
    { to: '/help', icon: FiHelpCircle, label: '帮助', onClick: undefined },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm sm:text-lg">B</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white hidden sm:block">博客</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const { to, icon: Icon, label, onClick } = item
                const isCurrentPage = isActive(to)
                
                const handleClick = (e: React.MouseEvent) => {
                  if (onClick) {
                    e.preventDefault()
                    onClick()
                  }
                }

                return (
                  <Link
                    key={to}
                    to={onClick ? '#' : to}
                    onClick={handleClick}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                      isCurrentPage 
                        ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20' 
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {isDark ? <FiSun className="w-4 h-4 sm:w-5 sm:h-5" /> : <FiMoon className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>

              {/* Desktop Auth */}
              <div className="hidden md:flex items-center space-x-3">
                {isAuthenticated ? (
                  <div className="flex items-center space-x-3">
                    {/* 管理员菜单 */}
                    {user?.role === 'admin' && (
                      <div className="relative">
                        <button
                          onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                          className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="管理"
                        >
                          <FiShield className="w-5 h-5" />
                        </button>
                        {adminMenuOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setAdminMenuOpen(false)}
                            />
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                              {adminItems.map((item) => (
                                <Link
                                  key={item.to}
                                  to={item.to}
                                  onClick={() => setAdminMenuOpen(false)}
                                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  {item.label}
                                </Link>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    <Link
                      to="/profile"
                      className="flex items-center space-x-2"
                    >
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.nickname}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {user?.nickname?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </Link>
                    <button
                      onClick={logout}
                      className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <FiLogOut className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className="btn-primary text-sm py-1.5 px-3"
                  >
                    登录
                  </Link>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                {mobileMenuOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden py-3 border-t border-gray-200 dark:border-gray-700">
              {navItems.map((item) => {
                const { to, icon: Icon, label } = item
                
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Icon className="w-5 h-5" />
                    <span>{label}</span>
                  </Link>
                )
              })}
              
              {/* Mobile Auth */}
              <div className="border-t border-gray-200 dark:border-gray-700 mt-3 pt-3">
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-3 px-3 py-2.5 text-gray-600 dark:text-gray-300"
                    >
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.nickname}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium">
                            {user?.nickname?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span>{user?.nickname}</span>
                    </Link>
                    <button
                      onClick={() => {
                        logout()
                        setMobileMenuOpen(false)
                      }}
                      className="flex items-center space-x-3 px-3 py-2.5 w-full text-left text-gray-600 dark:text-gray-300"
                    >
                      <FiLogOut className="w-5 h-5" />
                      <span>退出登录</span>
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center w-full btn-primary mx-3"
                  >
                    登录
                  </Link>
                )}
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
          <p className="text-center text-sm sm:text-base text-gray-600 dark:text-gray-400">
            © 2024 个人博客. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

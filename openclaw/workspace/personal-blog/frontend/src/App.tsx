import { Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Layout } from './components/Layout/Layout'
import { Home } from './pages/Home/Home'
import { Post } from './pages/Post/Post'
import { Editor } from './pages/Editor/Editor'
import { Login } from './pages/Login/Login'
import { Profile } from './pages/Profile/Profile'
import { Help } from './pages/Help/Help'
import { ApiDocs } from './pages/ApiDocs/ApiDocs'
import { Setup } from './pages/Setup/Setup'
import Search from './pages/Search/Search'
import { SearchUsers } from './pages/SearchUsers/SearchUsers'
import { UserPage } from './pages/User/User'
import { Logs } from './pages/Admin/Logs'
import { BehaviorSettings } from './pages/Admin/BehaviorSettings'
import { TestGPS } from './pages/Test/TestGPS'
import { useThemeStore } from './stores'
import axios from 'axios'
import { useBehaviorTrack } from './hooks/useBehaviorTrack'
import { PrivacyBanner } from './components/PrivacyBanner/PrivacyBanner'

function App() {
  const { isDark } = useThemeStore()
  const [needsSetup, setNeedsSetup] = useState(false)
  const [loading, setLoading] = useState(true)

  // 初始化行为追踪
  useBehaviorTrack()

  useEffect(() => {
    checkSystemStatus()
  }, [])

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  const checkSystemStatus = async () => {
    try {
      const res = await axios.get('/api/system/status')
      const { setupComplete } = res.data.data

      if (!setupComplete) {
        setNeedsSetup(true)
      }
    } catch (error) {
      console.error('Failed to check system status:', error)
      setNeedsSetup(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (needsSetup) {
    return <Setup />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/post/:id" element={<Post />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/editor/:id" element={<Editor />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/help" element={<Help />} />
        <Route path="/api-docs" element={<ApiDocs />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/search" element={<Search />} />
        <Route path="/search-users" element={<SearchUsers />} />
        <Route path="/user/:userId" element={<UserPage />} />
        <Route path="/admin/logs" element={<Logs />} />
        <Route path="/admin/behavior-settings" element={<BehaviorSettings />} />
        <Route path="/test/gps" element={<TestGPS />} />
      </Routes>
      <PrivacyBanner />
    </Layout>
  )
}

export default App

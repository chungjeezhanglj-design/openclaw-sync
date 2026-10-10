import { useState, useRef, useEffect } from 'react'
import { FiSearch, FiX, FiCalendar, FiMapPin, FiTag } from 'react-icons/fi'
import { searchApi, SearchIntent, SearchPhoto } from '../../services/api'

interface SearchBarProps {
  onSearchResults?: (photos: SearchPhoto[]) => void
}

export default function SearchBar({ onSearchResults }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [showPanel, setShowPanel] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editedIntent, setEditedIntent] = useState<SearchIntent | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowPanel(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    try {
      const response = await searchApi.parseSearch(query)
      const parsedIntent = response.data.data.intent
      setEditedIntent(parsedIntent)
      setShowPanel(true)

      const searchResponse = await searchApi.searchPhotos({ intent: parsedIntent })
      const photos = searchResponse.data.data.photos
      onSearchResults?.(photos)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmSearch = async () => {
    if (!editedIntent) return

    setIsLoading(true)
    try {
      const searchResponse = await searchApi.searchPhotos({ intent: editedIntent })
      const photos = searchResponse.data.data.photos
      onSearchResults?.(photos)
      setShowPanel(false)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="flex items-center">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索照片，如：近三年青岛的海滩"
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500"
          />
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={!query.trim() || isLoading}
          className="ml-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '...' : '搜索'}
        </button>
      </div>

      {/* Search Panel */}
      {showPanel && editedIntent && (
        <div
          ref={panelRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50"
        >
          <div className="space-y-4">
            {/* Time Range */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiCalendar className="w-4 h-4 mr-2" />
                时间范围
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={editedIntent.startDate || ''}
                  onChange={(e) =>
                    setEditedIntent({ ...editedIntent, startDate: e.target.value || null })
                  }
                  className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-900 dark:text-white text-sm"
                />
                <span className="text-gray-400">~</span>
                <input
                  type="date"
                  value={editedIntent.endDate || ''}
                  onChange={(e) =>
                    setEditedIntent({ ...editedIntent, endDate: e.target.value || null })
                  }
                  className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiMapPin className="w-4 h-4 mr-2" />
                地点
              </label>
              <input
                type="text"
                value={editedIntent.location || ''}
                onChange={(e) =>
                  setEditedIntent({ ...editedIntent, location: e.target.value || null })
                }
                placeholder="输入地点"
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-900 dark:text-white text-sm"
              />
            </div>

            {/* Keywords */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiTag className="w-4 h-4 mr-2" />
                关键词
              </label>
              <div className="flex flex-wrap gap-2">
                {editedIntent.keywords.map((kw, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded text-sm"
                  >
                    {kw}
                    <button
                      onClick={() => {
                        const newKeywords = editedIntent.keywords.filter((_, i) => i !== index)
                        setEditedIntent({ ...editedIntent, keywords: newKeywords })
                      }}
                      className="ml-1 text-primary-500 hover:text-primary-700"
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder="添加关键词"
                  className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-0 rounded text-sm text-gray-900 dark:text-white"
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
            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowPanel(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmSearch}
                disabled={isLoading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? '搜索中...' : '确认搜索'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

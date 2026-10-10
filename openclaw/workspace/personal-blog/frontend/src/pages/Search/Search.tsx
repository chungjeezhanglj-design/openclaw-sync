import { useState } from 'react'
import SearchBar from '../../components/SearchBar/SearchBar'
import SearchResults from '../../components/SearchResults/SearchResults'
import { SearchPhoto } from '../../services/api'

export default function SearchPage() {
  const [photos, setPhotos] = useState<SearchPhoto[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearchResults = (results: SearchPhoto[]) => {
    setPhotos(results)
    setHasSearched(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            智能搜索
          </h1>
          <SearchBar onSearchResults={handleSearchResults} />
        </div>

        {hasSearched && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              找到 {photos.length} 张照片
            </p>
            <SearchResults photos={photos} />
          </div>
        )}

        {!hasSearched && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>输入关键词开始搜索照片</p>
            <p className="text-sm mt-2">例如：近三年青岛的海滩、去年夏天的上海</p>
          </div>
        )}
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { FiMapPin, FiCalendar, FiImage } from 'react-icons/fi'
import { SearchPhoto } from '../../services/api'

interface SearchResultsProps {
  photos: SearchPhoto[]
  isLoading?: boolean
}

export default function SearchResults({ photos, isLoading }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <FiImage className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>没有找到匹配的照片</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {photos.map((photo) => (
        <Link
          key={photo.id}
          to={photo.post ? `/post/${photo.post.id}` : '#'}
          className="group block"
        >
          <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
            <img
              src={photo.url}
              alt={photo.caption || ''}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          </div>
          {photo.locationName && (
            <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
              <FiMapPin className="w-3 h-3 mr-1" />
              <span className="truncate">{photo.locationName}</span>
            </div>
          )}
          {photo.takenAt && (
            <div className="flex items-center text-xs text-gray-400 dark:text-gray-500">
              <FiCalendar className="w-3 h-3 mr-1" />
              <span>{new Date(photo.takenAt).toLocaleDateString('zh-CN')}</span>
            </div>
          )}
          {photo.post && (
            <div className="mt-1 text-xs text-primary-600 dark:text-primary-400 truncate">
              {photo.post.title}
            </div>
          )}
        </Link>
      ))}
    </div>
  )
}

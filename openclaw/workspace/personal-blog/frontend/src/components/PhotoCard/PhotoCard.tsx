import { useState, useEffect } from 'react'
import { FiCheck, FiX, FiCpu } from 'react-icons/fi'
import { Photo } from '../../types'

interface PhotoCardProps {
  photo: Photo
  onUpdateCaption?: (id: string, caption: string) => void
  onAnalyze?: (photoId: string) => void
  showEdit?: boolean
  size?: 'small' | 'medium' | 'large'
}

export function PhotoCard({ photo, onUpdateCaption, onAnalyze, showEdit = false, size = 'medium' }: PhotoCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [caption, setCaption] = useState(photo.caption || '')
  const [analyzing, setAnalyzing] = useState(false)

  // 当 AI 分析完成（有了 caption）时，停止 analyzing 状态
  useEffect(() => {
    if (analyzing && photo.caption) {
      setAnalyzing(false)
    }
  }, [photo.caption, analyzing])

  const handleSave = () => {
    onUpdateCaption?.(photo.id, caption)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setCaption(photo.caption || '')
    setIsEditing(false)
  }

  const sizeClasses = {
    small: 'h-48',
    medium: 'h-64',
    large: 'h-96',
  }

  // 判断是否正在分析（没有caption时显示分析中）
  const isAnalyzing = !photo.caption && analyzing
  const showCaptionArea = photo.caption || isAnalyzing || showEdit

  return (
    <div className="group relative overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
      <img
        src={photo.url}
        alt={photo.caption || '照片'}
        className={`w-full ${sizeClasses[size]} object-cover transition-transform group-hover:scale-105`}
      />
      
      {/* AI 分析中状态 */}
      {isAnalyzing && (
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
          <FiCpu className="w-8 h-8 text-primary-400 animate-pulse mb-2" />
          <p className="text-white text-sm">AI 正在理解照片...</p>
        </div>
      )}

      {/* Caption Overlay - 默认隐藏，如需显示请将下方 false 改为 true */}
      {false && showCaptionArea && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-2 py-1 text-sm bg-white/90 dark:bg-gray-800/90 rounded resize-none text-gray-900 dark:text-gray-100"
                rows={2}
                placeholder="添加配文..."
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  <FiCheck className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {photo.caption && (
                  <div className="space-y-1">
                    <p className="text-white text-sm">{photo.caption}</p>
                    <div className="flex items-center gap-1 text-xs text-primary-300">
                      <FiCpu className="w-3 h-3" />
                      <span>AI 生成</span>
                    </div>
                  </div>
                )}
                {photo.aiConfidence && photo.caption && (
                  <p className="text-white/60 text-xs mt-1">
                    AI置信度: {((photo.aiConfidence ?? 0) * 100).toFixed(0)}%
                  </p>
                )}
              </div>
              {showEdit && (
                <button
                  onClick={() => {
                    setAnalyzing(true)
                    onAnalyze?.(photo.id)
                  }}
                  className="ml-2 p-1.5 bg-white/20 text-white rounded hover:bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <FiCpu className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* AI Tags */}
      {photo.aiTags && photo.aiTags.length > 0 && (
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {photo.aiTags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-0.5 bg-primary-600/80 text-white text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

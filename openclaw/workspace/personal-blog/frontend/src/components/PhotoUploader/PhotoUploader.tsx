import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { FiUpload, FiImage, FiLoader, FiCpu, FiCheck, FiAlertTriangle, FiSave } from 'react-icons/fi'
import { photosApi } from '../../services/api'
import { Photo } from '../../types'

interface PhotoUploaderProps {
  postId?: string
  onUploadComplete?: (photos: Photo[]) => void
  onPhotoSaved?: (photo: Photo) => void
  onAITitleGenerated?: (title: string) => void
}

interface PendingPhoto {
  id: string
  url: string
  caption?: string
  tags?: string[]
  title?: string
  saved: boolean
}

export function PhotoUploader({ postId, onUploadComplete, onPhotoSaved, onAITitleGenerated }: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [analyzingCount, setAnalyzingCount] = useState(0)
  const [analyzingPhotos, setAnalyzingPhotos] = useState<Set<string>>(new Set())
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([])
  const [savingPhotos, setSavingPhotos] = useState<Set<string>>(new Set())
  const [titleGenerated, setTitleGenerated] = useState(false)

  const handleSavePhoto = async (photoId: string, caption: string, tags: string[]) => {
    setSavingPhotos(prev => new Set(prev).add(photoId))
    try {
      await photosApi.updateCaption(photoId, caption)
      await photosApi.updatePhotoTags(photoId, tags)
      setPendingPhotos(prev => prev.map(p =>
        p.id === photoId ? { ...p, caption, tags, saved: true } : p
      ))
      onPhotoSaved?.({ id: photoId, caption, tags, url: '', order: 0 } as Photo)
    } catch (error) {
      console.error('保存失败:', error)
      alert('保存失败，请重试')
    } finally {
      setSavingPhotos(prev => {
        const next = new Set(prev)
        next.delete(photoId)
        return next
      })
    }
  }

  const handleSaveAll = async () => {
    const unsavedPhotos = pendingPhotos.filter(p => !p.saved)
    for (const photo of unsavedPhotos) {
      await handleSavePhoto(photo.id, photo.caption || '', photo.tags || [])
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    setUploading(true)
    setUploadProgress(0)
    setPendingPhotos([])

    try {
      setUploadProgress(30)

      const response = await photosApi.uploadPhotos(acceptedFiles as unknown as FileList, postId)
      const photos = response.data.data.photos

      setUploadProgress(60)
      onUploadComplete?.(photos)

      setAnalyzingCount(photos.length)

      for (const photo of photos) {
        setAnalyzingPhotos(prev => new Set(prev).add(photo.id))

        try {
          const result = await photosApi.analyzePhoto(photo.id)
          const data = result.data

          const aiTitle = data.data?.photo?.aiTitle || ''

          setPendingPhotos(prev => [...prev, {
            id: photo.id,
            url: photo.url,
            caption: data.data?.photo?.caption || '',
            tags: data.data?.photo?.aiTags || [],
            title: aiTitle,
            saved: false,
          }])

          if (aiTitle && !titleGenerated) {
            setTitleGenerated(true)
            onAITitleGenerated?.(aiTitle)
          }
        } catch {
          setPendingPhotos(prev => [...prev, {
            id: photo.id,
            url: photo.url,
            caption: '',
            tags: [],
            saved: false,
          }])
        } finally {
          setAnalyzingPhotos(prev => {
            const next = new Set(prev)
            next.delete(photo.id)
            return next
          })
          setAnalyzingCount(prev => Math.max(0, prev - 1))
        }
      }

      setUploadProgress(100)
    } catch (error) {
      console.error('上传失败:', error)
      alert('上传失败，请重试')
    } finally {
      setUploading(false)
      setAnalyzingCount(0)
      setAnalyzingPhotos(new Set())
    }
  }, [postId, onUploadComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', 'webp'],
    },
    multiple: true,
    disabled: uploading,
  })

  const isAnalyzing = analyzingCount > 0 || analyzingPhotos.size > 0
  const unsavedCount = pendingPhotos.filter(p => !p.saved).length

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div className="space-y-4">
            <FiLoader className="w-12 h-12 mx-auto text-primary-600 animate-spin" />
            <div>
              <p className="text-gray-700 dark:text-gray-300">
                {isAnalyzing ? '正在分析和理解照片...' : '正在上传...'}
              </p>

              {uploadProgress < 60 && (
                <div className="w-64 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mt-2 overflow-hidden">
                  <div
                    className="h-full bg-primary-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}

              {isAnalyzing && (
                <div className="mt-3">
                  <div className="flex items-center justify-center gap-2 text-sm text-primary-600 dark:text-primary-400">
                    <FiCpu className="w-4 h-4 animate-pulse" />
                    <span>AI 正在理解照片... ({analyzingCount} 张待处理)</span>
                  </div>
                </div>
              )}

              {uploadProgress >= 60 && !isAnalyzing && (
                <div className="mt-4 space-y-2">
                  {pendingPhotos.length > 0 && (
                    <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <FiCheck className="w-4 h-4" />
                      <span>✓ {pendingPhotos.length} 张照片分析完成，请确认后保存</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {isDragActive ? (
              <FiImage className="w-12 h-12 mx-auto text-primary-600" />
            ) : (
              <FiUpload className="w-12 h-12 mx-auto text-gray-400" />
            )}
            <div>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                {isDragActive ? '释放以上传照片' : '拖拽照片到此处'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                或点击选择文件，支持 JPG、PNG、GIF、WebP 格式
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                单张最大 10MB，最多一次上传 10 张
              </p>
              <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                上传后自动进行 AI 场景识别和配文生成
              </p>
            </div>
          </div>
        )}
      </div>

      {pendingPhotos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
              AI 分析结果 ({unsavedCount > 0 ? `${unsavedCount} 张待保存` : '已全部保存'})
            </h3>
            {unsavedCount > 0 && (
              <button
                onClick={handleSaveAll}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FiSave className="w-4 h-4" />
                保存全部
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingPhotos.map((photo) => (
              <div
                key={photo.id}
                className={`border rounded-xl p-4 ${photo.saved ? 'bg-green-50 dark:bg-green-900/20' : 'bg-white dark:bg-gray-800'}`}
              >
                <div className="flex gap-4">
                  <img
                    src={photo.url.startsWith('http') ? photo.url : `${window.location.origin}${photo.url}`}
                    alt="预览"
                    className="w-24 h-24 object-cover rounded-lg"
                  />

                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        AI 配文
                      </label>
                      <textarea
                        value={photo.caption || ''}
                        onChange={(e) => setPendingPhotos(prev => prev.map(p =>
                          p.id === photo.id ? { ...p, caption: e.target.value } : p
                        ))}
                        className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
                        rows={2}
                        placeholder="AI配文..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        标签 (逗号分隔)
                      </label>
                      <input
                        type="text"
                        value={photo.tags?.join(', ') || ''}
                        onChange={(e) => setPendingPhotos(prev => prev.map(p =>
                          p.id === photo.id
                            ? { ...p, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }
                            : p
                        ))}
                        className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="标签1, 标签2"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {photo.saved ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <FiCheck className="w-3 h-3" />
                            已保存
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                            <FiAlertTriangle className="w-3 h-3" />
                            待确认
                          </span>
                        )}
                      </div>

                      {!photo.saved && (
                        <button
                          onClick={() => handleSavePhoto(photo.id, photo.caption || '', photo.tags || [])}
                          disabled={savingPhotos.has(photo.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-xs rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                        >
                          {savingPhotos.has(photo.id) ? (
                            <FiLoader className="w-3 h-3 animate-spin" />
                          ) : (
                            <FiSave className="w-3 h-3" />
                          )}
                          保存
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

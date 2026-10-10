import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiSend, FiImage, FiTag, FiUpload, FiX, FiCpu, FiZap, FiInfo, FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi'
import { postsApi, tagsApi, photosApi, aiPromptPresetsApi, AIPromptPreset } from '../../services/api'
import { useAuthStore } from '../../stores'
import { Photo, Post } from '../../types'

const AMAP_KEY = '6bc5d2c072de57286a8558fa03f34d29'

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${lng},${lat}&output=json`
    const response = await fetch(url)
    const data = await response.json() as any
    if (data.status === '1' && data.regeocode) {
      return data.regeocode.formatted_address
    }
    return null
  } catch {
    return null
  }
}

function getDeviceLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      () => {
        resolve(null)
      },
      { timeout: 5000, maximumAge: 300000 }
    )
  })
}

interface ExifData {
  deviceMake?: string
  deviceModel?: string
  software?: string
  imageWidth?: number
  imageHeight?: number
  orientation?: number
  takenAt?: string
  exposureTime?: string
  fNumber?: number
  isoSpeed?: number
  focalLength?: number
  focalLength35mm?: number
  flash?: string
  whiteBalance?: string
  meteringMode?: string
  exposureMode?: string
  lensModel?: string
  gpsLat?: number
  gpsLng?: number
  gpsAltitude?: number
  gpsLatitudeRef?: string
  gpsLongitudeRef?: string
  locationName?: string
}

function extractExifFromFile(file: File): Promise<ExifData> {
  return new Promise((resolve) => {
    if (!file.type.match(/^image\/jpeg$/)) {
      resolve({})
      return
    }

    const reader = new FileReader()
    reader.onload = function(e) {
      try {
        const view = new DataView(e.target?.result as ArrayBuffer)
        const exifData: ExifData = {}

        if (view.getUint16(0) !== 0xFFD8) {
          resolve({})
          return
        }

        let offset = 2
        let foundExif = false
        while (offset < view.byteLength - 4) {
          const marker = view.getUint16(offset)
          if (marker === 0xFFE1) {
            const exifStart = offset + 4
            
            if (view.getUint32(exifStart) === 0x45786966 && view.getUint16(exifStart + 4) === 0x0000) {
              const tiffStart = exifStart + 6
              const littleEndian = view.getUint16(tiffStart) === 0x4949
              
              const ifdOffset = view.getUint32(tiffStart + 4, littleEndian)
              const ifdStart = tiffStart + ifdOffset
              const numEntries = view.getUint16(ifdStart, littleEndian)
              
              for (let i = 0; i < numEntries && i < 100; i++) {
                const entryStart = ifdStart + 2 + i * 12
                const tag = view.getUint16(entryStart, littleEndian)
                const type = view.getUint16(entryStart + 2, littleEndian)
                const numValues = view.getUint32(entryStart + 4, littleEndian)
                const valueOffset = entryStart + 8

                let actualOffset = valueOffset
                if (numValues > 4 && type === 2) { // ASCII string longer than 4 bytes
                  actualOffset = tiffStart + view.getUint32(valueOffset, littleEndian)
                }

                switch (tag) {
                  case 0x010F: exifData.deviceMake = readStringValue(view, actualOffset, littleEndian, tiffStart); break
                  case 0x0110: exifData.deviceModel = readStringValue(view, actualOffset, littleEndian, tiffStart); break
                  case 0x0131: exifData.software = readStringValue(view, actualOffset, littleEndian, tiffStart); break
                  case 0x0132: exifData.takenAt = readStringValue(view, actualOffset, littleEndian, tiffStart)?.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'); break
                  case 0x8825: // GPS IFD in IFD0
                    const gpsOffset = view.getUint32(valueOffset, littleEndian)
                    if (gpsOffset > 0) {
                      parseGPSIFD(view, tiffStart + gpsOffset, littleEndian, exifData, tiffStart)
                    }
                    break
                  case 0x8769: 
                    const exifIfdOffset = view.getUint32(valueOffset, littleEndian)
                    parseExifIFD(view, tiffStart, exifIfdOffset, littleEndian, exifData); 
                    break
                }
              }
              foundExif = true
            }
            break
          } else if ((marker & 0xFF00) === 0xFF00) {
            offset += 2 + view.getUint16(offset + 2)
          } else {
            break
          }
        }

        if (!foundExif) {
          resolve({})
          return
        }
        resolve(exifData)
      } catch (err) {
        console.warn('EXIF解析失败:', err)
        resolve({})
      }
    }
    reader.onerror = () => resolve({})
    reader.readAsArrayBuffer(file.slice(0, 10 * 1024 * 1024))
  })
}

function readStringValue(view: DataView, offset: number, littleEndian: boolean, _tiffStart: number): string {
  try {
    let str = ''
    let i = 0
    while (i < 100) {
      const byte = view.getUint8(offset + i)
      if (byte === 0) break
      if (byte >= 32 && byte < 127) {
        str += String.fromCharCode(byte)
      } else {
        break
      }
      i++
    }
    if (str.length > 0) return str.trim()
    
    // 尝试 UTF-16
    str = ''
    for (let j = 0; j < 50; j++) {
      const char = view.getUint16(offset + j * 2, littleEndian)
      if (char === 0) break
      if (char >= 32) str += String.fromCharCode(char)
    }
    return str.trim()
  } catch {
    return ''
  }
}

function parseExifIFD(view: DataView, tiffStart: number, ifdOffset: number, littleEndian: boolean, exifData: ExifData) {
  const ifdStart = tiffStart + ifdOffset
  const numEntries = view.getUint16(ifdStart, littleEndian)
  
  for (let i = 0; i < numEntries; i++) {
    const entryStart = ifdStart + 2 + i * 12
    const tag = view.getUint16(entryStart, littleEndian)
    const numValues = view.getUint32(entryStart + 4, littleEndian)
    const valueOffset = entryStart + 8

    // 处理需要通过偏移量读取的值（类型为 ASCII(2) 或 RATIREL(5)）
    let actualOffset = valueOffset
    if (numValues > 4) {
      actualOffset = tiffStart + view.getUint32(valueOffset, littleEndian)
    }

    switch (tag) {
      case 0x9003: exifData.takenAt = readStringValue(view, actualOffset, littleEndian, tiffStart)?.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'); break
      case 0x829A: exifData.exposureTime = `1/${Math.round(view.getUint32(valueOffset + 4, littleEndian) / view.getUint32(valueOffset, littleEndian))}s`; break
      case 0x829D: exifData.fNumber = view.getUint32(valueOffset, littleEndian) / view.getUint32(valueOffset + 4, littleEndian); break
      case 0x8827: exifData.isoSpeed = view.getUint16(valueOffset, littleEndian); break
      case 0x920A: exifData.focalLength = view.getUint32(valueOffset, littleEndian) / view.getUint32(valueOffset + 4, littleEndian); break
      case 0xA405: exifData.focalLength35mm = view.getUint16(valueOffset, littleEndian); break
      case 0xA002: if (numValues > 4) { exifData.imageWidth = view.getUint32(actualOffset, littleEndian) } else { exifData.imageWidth = view.getUint16(valueOffset, littleEndian) }; break
      case 0xA003: if (numValues > 4) { exifData.imageHeight = view.getUint32(actualOffset, littleEndian) } else { exifData.imageHeight = view.getUint16(valueOffset, littleEndian) }; break
      case 0x0112: exifData.orientation = view.getUint16(valueOffset, littleEndian); break
      case 0x9209: const flash = view.getUint16(valueOffset, littleEndian); exifData.flash = { 0: 'No Flash', 1: 'Fired', 16: 'Off, Did not fire', 24: 'Auto', 25: 'Auto' }[flash] || `Unknown (${flash})`; break
      case 0x9208: exifData.whiteBalance = view.getUint16(valueOffset, littleEndian) === 0 ? 'Auto' : 'Manual'; break
      case 0x9207: exifData.meteringMode = { 1: 'Average', 2: 'Center-weighted', 3: 'Spot', 5: 'Pattern' }[view.getUint16(valueOffset, littleEndian)] || 'Unknown'; break
      case 0x9202: exifData.exposureMode = { 0: 'Auto', 1: 'Manual', 2: 'Auto Bracket' }[view.getUint16(valueOffset, littleEndian)] || 'Unknown'; break
      case 0xA434: exifData.lensModel = readStringValue(view, actualOffset, littleEndian, tiffStart); break
          case 0x8825: // GPS IFD
            const gpsOffset = view.getUint32(valueOffset, littleEndian)
            if (gpsOffset > 0) {
              parseGPSIFD(view, tiffStart + gpsOffset, littleEndian, exifData, tiffStart)
            }
            break
    }
  }
}

function parseGPSIFD(view: DataView, gpsStart: number, littleEndian: boolean, exifData: ExifData, tiffStart: number) {
  try {
    if (gpsStart < 0 || gpsStart + 2 > view.byteLength) {
      return
    }
    const numEntries = view.getUint16(gpsStart, littleEndian)
    if (numEntries > 100 || numEntries < 0) {
      return
    }
    
    let latitudeRef: string | undefined
    let longitudeRef: string | undefined

    for (let i = 0; i < numEntries; i++) {
      const entryStart = gpsStart + 2 + i * 12
      if (entryStart + 12 > view.byteLength) break

      const tag = view.getUint16(entryStart, littleEndian)
      const type = view.getUint16(entryStart + 2, littleEndian)
      const numValues = view.getUint32(entryStart + 4, littleEndian)
      const valueOffset = entryStart + 8

      if (tag === 0x0001 && numValues > 0) {
        latitudeRef = String.fromCharCode(view.getUint8(valueOffset))
      } else if (tag === 0x0002 && numValues === 3 && type === 5) {
        const offset = view.getUint32(valueOffset, littleEndian)
        if (offset > 0 && offset < 1000000 && tiffStart + offset + 24 <= view.byteLength) {
          const lat = parseDMSToDecimal(view, tiffStart + offset, littleEndian)
          if (lat !== undefined) {
            exifData.gpsLat = latitudeRef === 'S' ? -lat : lat
          }
        }
      } else if (tag === 0x0003 && numValues > 0) {
        longitudeRef = String.fromCharCode(view.getUint8(valueOffset))
      } else if (tag === 0x0004 && numValues === 3 && type === 5) {
        const offset = view.getUint32(valueOffset, littleEndian)
        if (offset > 0 && offset < 1000000 && tiffStart + offset + 24 <= view.byteLength) {
          const lng = parseDMSToDecimal(view, tiffStart + offset, littleEndian)
          if (lng !== undefined) {
            exifData.gpsLng = longitudeRef === 'W' ? -lng : lng
          }
        }
      }
    }
  } catch {
    // 忽略解析错误
  }
}

function parseDMSToDecimal(view: DataView, offset: number, littleEndian: boolean): number | undefined {
  try {
    const degreesNum = view.getUint32(offset, littleEndian)
    const degreesDen = view.getUint32(offset + 4, littleEndian)
    const minutesNum = view.getUint32(offset + 8, littleEndian)
    const minutesDen = view.getUint32(offset + 12, littleEndian)
    const secondsNum = view.getUint32(offset + 16, littleEndian)
    const secondsDen = view.getUint32(offset + 20, littleEndian)
    
    if (degreesDen === 0 || minutesDen === 0 || secondsDen === 0) return undefined
    
    const degrees = degreesNum / degreesDen
    const minutes = minutesNum / minutesDen
    const seconds = secondsNum / secondsDen
    
    return degrees + minutes / 60 + seconds / 3600
  } catch {
    return undefined
  }
}

function compressImage(file: File, quality: number = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      const maxWidth = 1920
      const maxHeight = 1920
      let width = img.width
      let height = img.height

      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height
        height = maxHeight
      }

      canvas.width = width
      canvas.height = height
      ctx?.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          } else {
            reject(new Error('压缩失败'))
          }
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}

export function Editor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = Boolean(id)
  const { isAuthenticated, isEditor } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) {
      alert('请先登录')
      navigate('/login')
    } else if (!isEditor) {
      alert('您没有编辑权限')
      navigate('/')
    }
  }, [isAuthenticated, isEditor, navigate])

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<'draft' | 'published'>('published')
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'followers' | 'private'>('public')
  const [enableAI, setEnableAI] = useState(true)
  const [compressEnabled, setCompressEnabled] = useState(true)
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [showPromptEditor, setShowPromptEditor] = useState(false)
  const [editingPreset, setEditingPreset] = useState<AIPromptPreset | null>(null)
  const [newPresetName, setNewPresetName] = useState('')
  const [newPresetPrompt, setNewPresetPrompt] = useState('')

  const { data: postData } = useQuery({
    queryKey: ['post', id],
    queryFn: () => postsApi.getPost(id!),
    enabled: isEditing,
  })

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsApi.getTags(),
  })

  const { data: presetsData, refetch: refetchPresets } = useQuery({
    queryKey: ['aiPromptPresets'],
    queryFn: () => aiPromptPresetsApi.getPresets(),
  })

  useEffect(() => {
    if (postData?.data.data.post) {
      const post = postData.data.data.post
      setTitle(post.title)
      setContent(post.content || '')
      setSelectedTags(post.tags.map((t) => t.id))
      setPhotos(post.photos)
      setStatus(post.status as 'draft' | 'published')
      setVisibility(post.visibility || 'public')
    }
  }, [postData])

  const tags = tagsData?.data.data.tags || []

  const createMutation = useMutation({
    mutationFn: postsApi.createPost,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      navigate(`/post/${data.data.data.post.id}`)
    },
    onError: (error: any) => {
      console.error('Create post error:', error)
      const msg = error.response?.data?.message || error.message || '发布失败，请重试'
      alert('发布失败: ' + msg)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; post: Partial<Post> }) =>
      postsApi.updatePost(data.id, data.post),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['post', id] })
      navigate(`/post/${id}`)
    },
    onError: (error: any) => {
      console.error('Update post error:', error)
      const msg = error.response?.data?.message || error.message || '保存失败，请重试'
      alert('保存失败: ' + msg)
    },
  })

  const presets = presetsData?.data.data.presets || []
  // 只显示图片类型的预设
  const imagePresets = presets.filter(p => p.type === 'image' || !p.type)

  useEffect(() => {
    if (imagePresets.length > 0 && !selectedPreset) {
      const defaultPreset = imagePresets.find(p => p.isDefault) || imagePresets[0]
      setSelectedPreset(defaultPreset.id)
      setCustomPrompt(defaultPreset.prompt)
    }
  }, [imagePresets])

  const handlePresetChange = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId)
    if (preset) {
      setSelectedPreset(presetId)
      setCustomPrompt(preset.prompt)
      setShowPromptEditor(false)
    }
  }

  const handleSavePreset = async () => {
    if (!newPresetName.trim() || !newPresetPrompt.trim()) {
      alert('请输入名称和提示词')
      return
    }
    if (editingPreset) {
      await aiPromptPresetsApi.updatePreset(editingPreset.id, {
        name: newPresetName,
        prompt: newPresetPrompt,
      })
    } else {
      await aiPromptPresetsApi.createPreset({
        name: newPresetName,
        prompt: newPresetPrompt,
      })
    }
    setNewPresetName('')
    setNewPresetPrompt('')
    setEditingPreset(null)
    setShowPromptEditor(false)
    refetchPresets()
  }

  const handlePublish = async () => {
    if (!title.trim()) {
      alert('请输入文章标题')
      return
    }
    if (!content.trim()) {
      alert('请输入文章内容')
      return
    }
    if (photos.length === 0) {
      alert('请至少上传一张照片')
      return
    }

    if (isEditing) {
      const postData = {
        title,
        content,
        tagIds: selectedTags,
        status,
        visibility,
        photoIds: photos.map(p => p.id),
      } as Partial<Post> & { tagIds: string[]; photoIds: string[] }
      updateMutation.mutate({ id: id!, post: postData })
    } else {
      const postData = {
        title,
        content,
        tagIds: selectedTags,
        status,
        visibility,
        photoIds: photos.map(p => p.id),
      } as Partial<Post> & { tagIds: string[]; photoIds: string[] }

      // 发布前更新照片EXIF数据
      const exifData = photos.map(p => ({
        id: p.id,
        gpsLat: p.gpsLat,
        gpsLng: p.gpsLng,
        locationName: p.locationName,
        gpsAltitude: p.gpsAltitude,
        deviceMake: p.deviceMake,
        deviceModel: p.deviceModel,
        deviceName: p.deviceName,
        takenAt: p.takenAt || new Date().toISOString(),
      }))
      await photosApi.updatePhotosExif(exifData)

      createMutation.mutate(postData)
    }
  }

  const handleUpload = async (files: FileList) => {
    setUploading(true)
    try {
      let filesToUpload = Array.from(files)
      console.log('[DEBUG] 收到文件数量:', filesToUpload.length)

      console.log('[DEBUG] 开始提取 EXIF 数据...')
      let exifDataListResult: ExifData[] = []
      try {
        const exifDataPromises = filesToUpload.map(file => extractExifFromFile(file))
        exifDataListResult = await Promise.all(exifDataPromises)
      } catch (err) {
        console.error('[ERROR] EXIF 提取失败:', err)
        exifDataListResult = filesToUpload.map(() => ({}))
      }
      console.log('[DEBUG] EXIF 提取完成, 结果:', exifDataListResult)

      // 检查是否有任何照片需要获取设备位置
      const needsDeviceLocation = exifDataListResult.some((exif: ExifData) => !exif.gpsLat || !exif.gpsLng || exif.gpsLat === 0 || exif.gpsLng === 0)
      console.log('[DEBUG] 需要设备位置:', needsDeviceLocation)
      
      let deviceLocation: { lat: number; lng: number } | null = null
      if (needsDeviceLocation) {
        try {
          console.log('[DEBUG] 获取设备位置...')
          deviceLocation = await getDeviceLocation()
          console.log('[DEBUG] 设备位置:', deviceLocation)
        } catch (err) {
          console.error('[ERROR] 获取设备位置失败:', err)
        }
      }

      // 如果有GPS，前端直接调用高德API获取中文地址
      for (let i = 0; i < exifDataListResult.length; i++) {
        const exif = exifDataListResult[i]
        try {
          if (exif.gpsLat && exif.gpsLng && exif.gpsLat !== 0 && exif.gpsLng !== 0) {
            const addr = await reverseGeocode(exif.gpsLat, exif.gpsLng)
            if (addr) {
              exif.locationName = addr
            }
          } else if (deviceLocation) {
            // 如果没有EXIF GPS，使用设备位置
            exif.gpsLat = deviceLocation.lat
            exif.gpsLng = deviceLocation.lng
            const addr = await reverseGeocode(deviceLocation.lat, deviceLocation.lng)
            if (addr) {
              exif.locationName = addr
            }
          }
        } catch (err) {
          console.error('[ERROR] 地理编码失败:', err)
        }
      }

      if (compressEnabled) {
        console.log('[DEBUG] 开始压缩图片, 数量:', filesToUpload.length)
        try {
          filesToUpload = await Promise.all(
            filesToUpload.map((file, i) => {
              // 将原始 EXIF 数据保存到文件对象上，供后续使用
              (file as any).exifData = exifDataListResult[i]
              console.log('[DEBUG] 压缩前文件:', file.name, '大小:', file.size)
              return compressImage(file, 0.8)
            })
          )
        } catch (err) {
          console.error('[ERROR] 图片压缩失败:', err)
        }
        console.log('[DEBUG] 压缩完成')
      }

      console.log('[DEBUG] 准备上传到后端, 文件数:', filesToUpload.length)
      const response = await photosApi.uploadPhotos(filesToUpload as unknown as FileList, undefined, exifDataListResult)
      const newPhotos = response.data.data.photos

      // 合并前端提取的 EXIF 信息
      const photosWithExif = newPhotos.map((photo, i) => ({
        ...photo,
        ...exifDataListResult[i]
      }))

      setPhotos(prev => [...prev, ...photosWithExif])

      if (enableAI) {
        for (const photo of newPhotos) {
          try {
            const result = await photosApi.analyzePhoto(photo.id, customPrompt, selectedPreset)
            const data = result.data.data

            if (data.photo?.caption) {
              const newContent = content ? `${content}\n\n${data.photo.caption}` : data.photo.caption
              setContent(newContent)
            }
            if (data.photo?.aiTitle && !title.trim()) {
              setTitle(data.photo.aiTitle)
            }

            setPhotos(prev => prev.map(p =>
              p.id === photo.id ? { 
                ...p, 
                aiTags: data.photo.aiTags,
                aiConfidence: data.photo.aiConfidence,
                aiTitle: data.photo.aiTitle,
                caption: data.photo.caption,
              } : p
            ))
          } catch (err) {
            console.error('AI分析失败:', err)
          }
        }
      }
    } catch (error) {
      console.error('上传失败:', error)
      alert('上传失败，请重试')
    } finally {
      setUploading(false)
    }
  }

  const handlePhotoDelete = async (photoId: string) => {
    try {
      await photosApi.deletePhoto(photoId)
      setPhotos(photos.filter(p => p.id !== photoId))
    } catch (error) {
      alert('删除失败')
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          {isEditing ? '编辑文章' : '写文章'}
        </h1>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'public' | 'friends' | 'followers' | 'private')}
            className="px-2 sm:px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 flex-1 sm:flex-none"
          >
            <option value="public">公开</option>
            <option value="friends">好友可见</option>
            <option value="followers">粉丝可见</option>
            <option value="private">私密</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
            className="px-2 sm:px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 flex-1 sm:flex-none"
          >
            <option value="draft">草稿</option>
            <option value="published">发布</option>
          </select>
          <button
            onClick={handlePublish}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="btn-primary flex items-center gap-2 flex-1 sm:flex-none justify-center"
          >
            <FiSend className="w-4 h-4" />
            {createMutation.isPending || updateMutation.isPending ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="文章标题"
            className="w-full text-xl sm:text-3xl font-bold border-0 border-b-2 border-gray-200 dark:border-gray-700 bg-transparent py-2 focus:outline-none focus:border-primary-600 dark:text-white"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <FiTag className="w-4 h-4" />
            标签
          </label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() =>
                  setSelectedTags((prev) =>
                    prev.includes(tag.id)
                      ? prev.filter((id) => id !== tag.id)
                      : [...prev, tag.id]
                  )
                }
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedTags.includes(tag.id)
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            正文内容{enableAI ? '（AI会自动填充配文）' : ''}
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={enableAI ? "写下你的想法... 上传照片后AI会自动生成配文" : "写下你的想法..."}
            rows={6}
            className="input resize-none"
          />
        </div>

        <div>
          <label className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <span className="flex items-center gap-2">
              <FiImage className="w-4 h-4" />
              照片
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={enableAI}
                    onChange={(e) => setEnableAI(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-10 h-6 rounded-full transition-colors ${enableAI ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${enableAI ? 'translate-x-4' : ''}`} />
                </div>
                <span className="text-xs flex items-center gap-1">
                  <FiCpu className="w-3 h-3" /> AI识别
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={compressEnabled}
                    onChange={(e) => setCompressEnabled(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-10 h-6 rounded-full transition-colors ${compressEnabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${compressEnabled ? 'translate-x-4' : ''}`} />
                </div>
                <span className="text-xs flex items-center gap-1">
                  <FiZap className="w-3 h-3" /> 压缩图片
                </span>
              </label>
            </div>
          </label>

          {enableAI && (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">AI 分析提示词</span>
                <button
                  onClick={() => setShowPromptEditor(!showPromptEditor)}
                  className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <FiEdit2 className="w-3 h-3" /> {showPromptEditor ? '收起' : '编辑提示词'}
                </button>
              </div>
              
              <select
                value={selectedPreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm mb-2"
              >
                <option value="">选择提示词预设</option>
                {imagePresets.map(preset => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name} {preset.isDefault ? '(默认)' : ''}
                  </option>
                ))}
              </select>

              {showPromptEditor && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">提示词内容</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingPreset(null)
                          setNewPresetName('')
                          setNewPresetPrompt(customPrompt)
                        }}
                        className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <FiPlus className="w-3 h-3" /> 新建预设
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={editingPreset ? newPresetPrompt : customPrompt}
                    onChange={(e) => editingPreset ? setNewPresetPrompt(e.target.value) : setCustomPrompt(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-mono"
                    placeholder="输入自定义提示词..."
                  />
                  {(editingPreset || newPresetName) && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={editingPreset ? editingPreset.name : newPresetName}
                        onChange={(e) => editingPreset ? setEditingPreset({...editingPreset, name: e.target.value}) : setNewPresetName(e.target.value)}
                        placeholder="预设名称"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <button
                        onClick={handleSavePreset}
                        className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
                      >
                        保存
                      </button>
                      {editingPreset && (
                        <button
                          onClick={() => {
                            setEditingPreset(null)
                            setNewPresetName('')
                            setNewPresetPrompt('')
                          }}
                          className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 md:p-6 text-center">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                try {
                  if (e.target.files) {
                    handleUpload(e.target.files)
                  }
                } catch (err) {
                  console.error('[ERROR] 选择文件失败:', err)
                }
              }}
              disabled={uploading}
              className="hidden"
              id="photo-upload"
            />
            <label htmlFor="photo-upload" className="cursor-pointer">
              {uploading ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-2" />
                  <span className="text-gray-600 dark:text-gray-400">正在上传{enableAI ? '和分析...' : '...'}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <FiUpload className="w-8 md:w-10 h-8 md:h-10 text-gray-400 mb-2" />
                  <span className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                    点击或拖拽上传照片
                  </span>
                  {enableAI && (
                    <span className="text-xs md:text-sm text-gray-500 mt-1">
                      AI会自动分析并生成配文
                    </span>
                  )}
                </div>
              )}
            </label>
          </div>

          {photos.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:g-4">
              {photos.map((photo) => {
                const photoUrl = photo.url?.startsWith('http')
                  ? photo.url
                  : `${window.location.origin}${photo.url}`
                const locationInfo = photo.locationName || ''
                const takenAtInfo = photo.takenAt 
                  ? new Date(photo.takenAt).toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : ''
                return (
                  <div key={photo.id} className="relative group">
                    <img
                      src={photoUrl}
                      alt=""
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => handlePhotoDelete(photo.id)}
                      className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      title="删除照片"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                    {locationInfo ? (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-1" title={locationInfo}>
                        {locationInfo}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1">未知地点</p>
                    )}
                    {takenAtInfo && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {takenAtInfo}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {photos.length > 0 && (
            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
              <details className="group">
                <summary className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer list-none">
                  <FiInfo className="w-4 h-4" />
                  <span>图片扩展信息 ({photos.length} 张)</span>
                  <span className="ml-auto transform group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-4 space-y-4">
                  {photos.map((photo) => {
                    const hasExif = photo.deviceMake || photo.deviceModel || photo.takenAt || photo.exposureTime || photo.fNumber || photo.isoSpeed || photo.locationName
                    if (!hasExif) {
                      return (
                        <div key={photo.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-xs text-gray-500">无扩展信息</p>
                        </div>
                      )
                    }
                    return (
                      <div key={photo.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs space-y-2">
                        {photo.deviceMake && <p><span className="text-gray-500">设备:</span> {photo.deviceMake} {photo.deviceModel}</p>}
                        {photo.software && <p><span className="text-gray-500">软件:</span> {photo.software}</p>}
                        {photo.takenAt && <p><span className="text-gray-500">拍摄时间:</span> {new Date(photo.takenAt).toLocaleString('zh-CN')}</p>}
                        {photo.imageWidth && photo.imageHeight && <p><span className="text-gray-500">尺寸:</span> {photo.imageWidth} × {photo.imageHeight}</p>}
                        {photo.exposureTime && <p><span className="text-gray-500">快门:</span> {photo.exposureTime}</p>}
                        {photo.fNumber && <p><span className="text-gray-500">光圈:</span> f/{photo.fNumber}</p>}
                        {photo.isoSpeed && <p><span className="text-gray-500">ISO:</span> {photo.isoSpeed}</p>}
                        {photo.focalLength && <p><span className="text-gray-500">焦距:</span> {photo.focalLength}mm</p>}
                        {photo.focalLength35mm && <p><span className="text-gray-500">等效焦距:</span> {photo.focalLength35mm}mm</p>}
                        {photo.flash && <p><span className="text-gray-500">闪光灯:</span> {photo.flash}</p>}
                        {photo.whiteBalance && <p><span className="text-gray-500">白平衡:</span> {photo.whiteBalance}</p>}
                        {photo.meteringMode && <p><span className="text-gray-500">测光:</span> {photo.meteringMode}</p>}
                        {photo.exposureMode && <p><span className="text-gray-500">曝光模式:</span> {photo.exposureMode}</p>}
                        {photo.lensModel && <p><span className="text-gray-500">镜头:</span> {photo.lensModel}</p>}
                        {photo.gpsLat && photo.gpsLng && (
                          <p><span className="text-gray-500">GPS:</span> {photo.gpsLat.toFixed(6)}, {photo.gpsLng.toFixed(6)}</p>
                        )}
                        {photo.locationName && (
                          <p className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 font-medium text-gray-700 dark:text-gray-300">
                            <span className="text-gray-500">地点:</span> {photo.locationName}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

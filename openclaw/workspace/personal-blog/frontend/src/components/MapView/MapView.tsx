import { useEffect, useRef, useState } from 'react'
import { Post } from '../../types'

interface MapViewProps {
  posts: Post[]
}

const AMAP_KEY = '6bc5d2c072de57286a8558fa03f34d29'

export function MapView({ posts }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const postsRef = useRef(posts)
  postsRef.current = posts

  const postsWithGPS = posts.filter(post => 
    post.photos.some(photo => photo.gpsLat && photo.gpsLng)
  )

  useEffect(() => {
    const loadMap = () => {
      if ((window as any).AMap) {
        setMapLoaded(true)
        return
      }

      const script = document.createElement('script')
      script.src = `https://webapi.amap.com/maps?v=1.4.15&key=${AMAP_KEY}`
      script.onload = () => setMapLoaded(true)
      document.head.appendChild(script)
    }

    loadMap()
  }, [])

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || postsWithGPS.length === 0) return

    // 如果地图已初始化，先检查posts是否变化
    if (mapInstanceRef.current) {
      const currentPosts = mapInstanceRef.current._postsRef
      if (currentPosts && JSON.stringify(currentPosts) === JSON.stringify(postsRef.current)) {
        return // posts没有变化，不重新创建地图
      }
    }

    // 销毁旧地图
    if (mapInstanceRef.current) {
      mapInstanceRef.current.destroy()
      mapInstanceRef.current = null
    }

    const AMap = (window as any).AMap
    
    const map = new AMap.Map(mapRef.current, {
      zoom: 4,
      viewMode: '2D',
      center: [postsWithGPS[0].photos[0].gpsLng, postsWithGPS[0].photos[0].gpsLat],
    })

    // 保存posts引用，用于比较
    map._postsRef = postsRef.current

    mapInstanceRef.current = map

    postsWithGPS.forEach(post => {
      const gpsPhoto = post.photos.find(photo => photo.gpsLat && photo.gpsLng)
      if (!gpsPhoto) return

      const photoUrl = gpsPhoto.url?.startsWith('http') ? gpsPhoto.url : window.location.origin + gpsPhoto.url
      
      const marker = new AMap.Marker({
        position: new AMap.LngLat(gpsPhoto.gpsLng, gpsPhoto.gpsLat),
        title: post.title,
      })

      marker.setMap(map)

      const infoContent = `
        <div style="width: 200px; padding: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <a href="/post/${post.id}" style="text-decoration: none;">
            <img src="${photoUrl}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px; margin-bottom: 6px; display: block;" />
            <div style="font-weight: 500; font-size: 13px; color: #333;">${post.title}</div>
          </a>
          <div style="font-size: 11px; color: #888; margin-top: 4px;">${post.user?.nickname || '匿名用户'}</div>
        </div>
      `

      marker.on('click', () => {
        const infoWindow = new AMap.InfoWindow({
          content: infoContent,
          offset: new AMap.Pixel(0, -30),
        })
        infoWindow.open(map, marker.getPosition())
      })

      if (post === postsWithGPS[0]) {
        setTimeout(() => {
          const infoWindow = new AMap.InfoWindow({
            content: infoContent,
            offset: new AMap.Pixel(0, -30),
          })
          infoWindow.open(map, marker.getPosition())
        }, 500)
      }
    })

    map.setFitView()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }
      // 移除高德地图的版权信息元素（全局插入的）
      const amapElements = document.querySelectorAll('[class*="amap"], [id*="amap"]')
      amapElements.forEach(el => el.remove())
    }
  }, [mapLoaded, postsWithGPS.length])

  if (postsWithGPS.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            暂无带位置信息的照片
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            上传带有GPS信息的照片后即可在地图上查看
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen">
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

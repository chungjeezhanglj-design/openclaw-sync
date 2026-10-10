export interface GeocodingResult {
  address: string
  province: string
  city: string
  district: string
  street: string
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null> {
  const apiKey = process.env.AMAP_KEY
  
  if (!apiKey) {
    console.log('未配置高德地图 API Key，无法获取地址信息')
    return null
  }

  try {
    const url = `https://restapi.amap.com/v3/geocode/regeo?key=${apiKey}&location=${lng},${lat}&output=json`
    
    const response = await fetch(url)
    const data = await response.json() as any
    
    if (data.status === '1' && data.regeocode) {
      const regeocode = data.regeocode
      const addressComponent = regeocode.addressComponent
      
      const province = addressComponent.province || ''
      const city = addressComponent.city || addressComponent.province || ''
      const district = addressComponent.district || ''
      const street = addressComponent.streetNumber?.street || addressComponent.township || ''
      
      const address = `${province}${city}${district}${street}`.replace(/市$/, '')
      
      return {
        address,
        province,
        city,
        district,
        street,
      }
    }
    
    console.log('逆地理编码失败:', data)
    return null
  } catch (error) {
    console.error('逆地理编码请求失败:', error)
    return null
  }
}

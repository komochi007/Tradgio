export type WeatherInfo = {
  city: string
  temperature: number
  description: string
  icon: string
}

const SHANGHAI = { lat: 31.2304, lon: 121.4737, name: "上海" }

const weatherCodeMap: Record<number, { description: string; icon: string }> = {
  0: { description: "晴", icon: "☀️" },
  1: { description: "大部晴", icon: "🌤" },
  2: { description: "多云", icon: "⛅" },
  3: { description: "阴", icon: "☁️" },
  45: { description: "雾", icon: "🌫" },
  48: { description: "霜雾", icon: "🌫" },
  51: { description: "小毛毛雨", icon: "🌦" },
  53: { description: "毛毛雨", icon: "🌦" },
  55: { description: "大毛毛雨", icon: "🌧" },
  61: { description: "小雨", icon: "🌧" },
  63: { description: "中雨", icon: "🌧" },
  65: { description: "大雨", icon: "🌧" },
  71: { description: "小雪", icon: "🌨" },
  73: { description: "中雪", icon: "🌨" },
  75: { description: "大雪", icon: "🌨" },
  77: { description: "雪粒", icon: "🌨" },
  80: { description: "阵雨", icon: "🌦" },
  81: { description: "中阵雨", icon: "🌧" },
  82: { description: "大阵雨", icon: "🌧" },
  85: { description: "小阵雪", icon: "🌨" },
  86: { description: "大阵雪", icon: "🌨" },
  95: { description: "雷暴", icon: "⛈" },
  96: { description: "雷暴伴小冰雹", icon: "⛈" },
  99: { description: "雷暴伴大冰雹", icon: "⛈" },
}

function getCurrentPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("浏览器不支持定位"))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: 5000, maximumAge: 600000 }
    )
  })
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?latitude=${lat}&longitude=${lon}&count=1&language=zh`
    )
    if (!res.ok) throw new Error("geocoding failed")
    const data = await res.json()
    if (data.results?.length > 0) {
      return data.results[0].name || data.results[0].admin1 || SHANGHAI.name
    }
  } catch {}
  return SHANGHAI.name
}

async function fetchWeather(
  lat: number,
  lon: number
): Promise<{ temperature: number; code: number }> {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`
  )
  if (!res.ok) throw new Error("weather fetch failed")
  const data = await res.json()
  return {
    temperature: Math.round(data.current.temperature_2m),
    code: data.current.weather_code,
  }
}

export async function getWeather(): Promise<WeatherInfo> {
  try {
    const pos = await getCurrentPosition()
    const [city, weather] = await Promise.all([
      reverseGeocode(pos.lat, pos.lon),
      fetchWeather(pos.lat, pos.lon),
    ])
    const info = weatherCodeMap[weather.code] ?? { description: "未知", icon: "🌤" }
    return { city, temperature: weather.temperature, ...info }
  } catch {
    const weather = await fetchWeather(SHANGHAI.lat, SHANGHAI.lon)
    const info = weatherCodeMap[weather.code] ?? { description: "未知", icon: "🌤" }
    return { city: SHANGHAI.name, temperature: weather.temperature, ...info }
  }
}

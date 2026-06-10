export type WeatherInfo = {
  city: string
  temperature: number
  description: string
  icon: string
}

const DONGGUAN = { lat: 23.0207, lon: 113.7518, name: "东莞" }

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
  const weather = await fetchWeather(DONGGUAN.lat, DONGGUAN.lon)
  const info = weatherCodeMap[weather.code] ?? { description: "未知", icon: "🌤" }
  return { city: DONGGUAN.name, temperature: weather.temperature, ...info }
}

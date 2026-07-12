// 地点解析模块（与页面组件解耦）。
//
// 设计原则：
// - 优先使用本地城市库（无网络、无 API Key、即时、隐私安全）；
// - 接口为异步（resolveBirthLocation），便于将来插入线上地理编码服务（替换内部实现即可）；
// - 对“无匹配 / 多匹配 / 超时 / 接口失败”统一以 LocationResolveError 抛出，由界面处理；
// - 不把任何密钥硬编码到前端。
//
// 规范要求内置的常见城市（含中文名 / 拼音 / 英文别名 + IANA 时区）已覆盖。

import { GeoLocationResult, LocationResolveError } from './types'

interface CityRecord {
  displayName: string
  latitude: number
  longitude: number
  timezone: string
  countryCode: string
  /** 匹配别名（小写、去空格后比较） */
  aliases: string[]
}

// 必填城市 + 常用扩展。坐标取城市中心点近似值；IANA 时区用于正确换算夏令时。
const CITY_DB: CityRecord[] = [
  { displayName: '北京市', latitude: 39.9042, longitude: 116.4074, timezone: 'Asia/Shanghai', countryCode: 'CN', aliases: ['北京', 'beijing', 'bj'] },
  { displayName: '上海市', latitude: 31.2304, longitude: 121.4737, timezone: 'Asia/Shanghai', countryCode: 'CN', aliases: ['上海', 'shanghai', 'sh'] },
  { displayName: '广州市', latitude: 23.1291, longitude: 113.2644, timezone: 'Asia/Shanghai', countryCode: 'CN', aliases: ['广州', 'guangzhou', 'gz'] },
  { displayName: '深圳市', latitude: 22.5431, longitude: 114.0579, timezone: 'Asia/Shanghai', countryCode: 'CN', aliases: ['深圳', 'shenzhen', 'sz'] },
  { displayName: '辽宁省锦州市', latitude: 41.1, longitude: 121.13, timezone: 'Asia/Shanghai', countryCode: 'CN', aliases: ['辽宁锦州', '锦州', 'jinzhou', 'liaoning jinzhou'] },
  { displayName: '沈阳市', latitude: 41.8057, longitude: 123.4315, timezone: 'Asia/Shanghai', countryCode: 'CN', aliases: ['沈阳', 'shenyang', 'sy'] },
  { displayName: '成都市', latitude: 30.5728, longitude: 104.0668, timezone: 'Asia/Shanghai', countryCode: 'CN', aliases: ['成都', 'chengdu', 'cd'] },
  { displayName: '重庆市', latitude: 29.563, longitude: 106.5516, timezone: 'Asia/Shanghai', countryCode: 'CN', aliases: ['重庆', 'chongqing', 'cq'] },
  { displayName: '杭州市', latitude: 30.2741, longitude: 120.1551, timezone: 'Asia/Shanghai', countryCode: 'CN', aliases: ['杭州', 'hangzhou', 'hz'] },
  { displayName: '南京市', latitude: 32.0603, longitude: 118.7969, timezone: 'Asia/Shanghai', countryCode: 'CN', aliases: ['南京', 'nanjing', 'nj'] },
  { displayName: '武汉市', latitude: 30.5928, longitude: 114.3055, timezone: 'Asia/Shanghai', countryCode: 'CN', aliases: ['武汉', 'wuhan', 'wh'] },
  { displayName: '西安市', latitude: 34.3416, longitude: 108.9398, timezone: 'Asia/Shanghai', countryCode: 'CN', aliases: ['西安', 'xian', 'xa'] },
  { displayName: '青岛市', latitude: 36.0671, longitude: 120.3826, timezone: 'Asia/Shanghai', countryCode: 'CN', aliases: ['青岛', 'qingdao', 'qd'] },
  { displayName: '香港特别行政区', latitude: 22.3193, longitude: 114.1694, timezone: 'Asia/Hong_Kong', countryCode: 'HK', aliases: ['香港', 'hong kong', 'hk', 'xianggang'] },
  { displayName: '澳门特别行政区', latitude: 22.1987, longitude: 113.5439, timezone: 'Asia/Macau', countryCode: 'MO', aliases: ['澳门', 'macau', 'macao', 'aomen'] },
  { displayName: '台北市', latitude: 25.033, longitude: 121.5654, timezone: 'Asia/Taipei', countryCode: 'TW', aliases: ['台北', 'taipei', 'taibei'] },
  { displayName: '拉萨市', latitude: 29.652, longitude: 91.1721, timezone: 'Asia/Shanghai', countryCode: 'CN', aliases: ['拉萨', 'lhasa', 'ls'] },
  { displayName: '乌鲁木齐市', latitude: 43.8256, longitude: 87.6168, timezone: 'Asia/Shanghai', countryCode: 'CN', aliases: ['乌鲁木齐', 'urumqi', 'wlmq'] },
  { displayName: 'New York', latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York', countryCode: 'US', aliases: ['new york', 'nyc', '纽约'] },
  { displayName: 'London', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London', countryCode: 'GB', aliases: ['london', '伦敦'] },
  { displayName: 'Paris', latitude: 48.8566, longitude: 2.3522, timezone: 'Europe/Paris', countryCode: 'FR', aliases: ['paris', '巴黎'] },
  { displayName: 'Tokyo', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo', countryCode: 'JP', aliases: ['tokyo', '东京'] },
  { displayName: 'Sydney', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney', countryCode: 'AU', aliases: ['sydney', '悉尼'] },
  { displayName: 'Los Angeles', latitude: 34.0522, longitude: -118.2437, timezone: 'America/Los_Angeles', countryCode: 'US', aliases: ['los angeles', 'la', '洛杉矶'] },
  { displayName: 'San Francisco', latitude: 37.7749, longitude: -122.4194, timezone: 'America/Los_Angeles', countryCode: 'US', aliases: ['san francisco', 'sf', '旧金山'] },
  { displayName: 'Chicago', latitude: 41.8781, longitude: -87.6298, timezone: 'America/Chicago', countryCode: 'US', aliases: ['chicago', '芝加哥'] },
  { displayName: 'Berlin', latitude: 52.52, longitude: 13.405, timezone: 'Europe/Berlin', countryCode: 'DE', aliases: ['berlin', '柏林'] },
  { displayName: 'Moscow', latitude: 55.7558, longitude: 37.6173, timezone: 'Europe/Moscow', countryCode: 'RU', aliases: ['moscow', '莫斯科'] },
  { displayName: 'Singapore', latitude: 1.3521, longitude: 103.8198, timezone: 'Asia/Singapore', countryCode: 'SG', aliases: ['singapore', '新加坡'] },
  { displayName: 'Dubai', latitude: 25.2048, longitude: 55.2708, timezone: 'Asia/Dubai', countryCode: 'AE', aliases: ['dubai', '迪拜'] },
  { displayName: 'Mumbai', latitude: 19.076, longitude: 72.8777, timezone: 'Asia/Kolkata', countryCode: 'IN', aliases: ['mumbai', '孟买', 'bombay'] },
  { displayName: 'Toronto', latitude: 43.6532, longitude: -79.3832, timezone: 'America/Toronto', countryCode: 'CA', aliases: ['toronto', '多伦多'] },
  { displayName: 'Mexico City', latitude: 19.4326, longitude: -99.1332, timezone: 'America/Mexico_City', countryCode: 'MX', aliases: ['mexico city', '墨西哥城'] },
  { displayName: 'São Paulo', latitude: -23.5505, longitude: -46.6333, timezone: 'America/Sao_Paulo', countryCode: 'BR', aliases: ['sao paulo', 'são paulo', '圣保罗'] },
  { displayName: 'Cairo', latitude: 30.0444, longitude: 31.2357, timezone: 'Africa/Cairo', countryCode: 'EG', aliases: ['cairo', '开罗'] },
  { displayName: 'Istanbul', latitude: 41.0082, longitude: 28.9784, timezone: 'Europe/Istanbul', countryCode: 'TR', aliases: ['istanbul', '伊斯坦布尔'] },
]

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * 解析出生地点为经纬度 + 时区。
 * - 当前实现：本地城市库精确匹配（中文 / 拼音 / 英文别名）。
 * - 未命中时抛出 LocationResolveError，由界面提示用户确认或换用附近城市。
 * - 接口保持异步，便于将来在不改变调用方的情况下接入线上地理编码服务。
 */
export async function resolveBirthLocation(locationName: string): Promise<GeoLocationResult> {
  const q = normalize(locationName)
  if (!q) throw new LocationResolveError('请先填写出生地点')

  const hit = CITY_DB.find((c) => c.aliases.includes(q) || normalize(c.displayName) === q)
  if (!hit) {
    throw new LocationResolveError(`未找到地点“${locationName}”。请检查拼写，或换用附近的主要城市（如省会 / 直辖市）。`)
  }

  return {
    displayName: hit.displayName,
    latitude: hit.latitude,
    longitude: hit.longitude,
    timezone: hit.timezone,
    countryCode: hit.countryCode,
  }
}

/** 同步查询（供已知经纬度或测试使用，不抛 LocationResolveError） */
export function findCitySync(locationName: string): GeoLocationResult | null {
  const q = normalize(locationName)
  const hit = CITY_DB.find((c) => c.aliases.includes(q) || normalize(c.displayName) === q)
  if (!hit) return null
  return {
    displayName: hit.displayName,
    latitude: hit.latitude,
    longitude: hit.longitude,
    timezone: hit.timezone,
    countryCode: hit.countryCode,
  }
}

/** 城市联想建议项（供下拉展示用） */
export interface CitySuggestion {
  displayName: string
  latitude: number
  longitude: number
  timezone: string
  countryCode: string
}

/**
 * 模糊搜索城市（供输入联想下拉使用）。
 * - 本地城市库，无网络 / 无 API Key / 即时；
 * - 对 displayName 与别名做包含匹配，按“开头命中优先”排序；
 * - 返回空串 / 过短查询直接返回空数组。
 */
export function searchCities(query: string, limit = 8): CitySuggestion[] {
  const q = normalize(query)
  if (!q) return []
  const hits = CITY_DB
    .map((c) => {
      const name = normalize(c.displayName)
      const aliasHit = c.aliases.some((a) => a.includes(q))
      const nameHit = name.includes(q)
      if (!aliasHit && !nameHit) return null
      let score = 2
      if (name.startsWith(q)) score = 0
      else if (c.aliases.some((a) => a.startsWith(q))) score = 1
      return { c, score }
    })
    .filter((x): x is { c: CityRecord; score: number } => x !== null)
    .sort((a, b) => a.score - b.score || a.c.displayName.localeCompare(b.c.displayName))
    .slice(0, limit)
  return hits.map(({ c }) => ({
    displayName: c.displayName,
    latitude: c.latitude,
    longitude: c.longitude,
    timezone: c.timezone,
    countryCode: c.countryCode,
  }))
}

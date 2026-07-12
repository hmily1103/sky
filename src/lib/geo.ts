// 离线城市坐标解析（视觉模拟兜底用）。
// 直接复用 astronomy/location 的统一城市库，避免两份城市数据漂移；
// 时区偏移由 IANA 时区经 Luxon 推导。未命中时回退北京并标记 approx。

import { DateTime } from 'luxon'
import { findCitySync } from '../astronomy/location'

export interface ResolvedLocation {
  lat: number
  lng: number
  /** 时区偏移（小时，整数近似） */
  tz: number
  /** 未命中城市库、使用回退坐标时为 true */
  approx: boolean
}

const DEFAULT: ResolvedLocation = { lat: 39.9042, lng: 116.4074, tz: 8, approx: true }

export function resolveLocation(locationName: string): ResolvedLocation {
  const hit = findCitySync(locationName)
  if (!hit) return { ...DEFAULT }
  const tz = hit.timezone
    ? Math.round(DateTime.now().setZone(hit.timezone).offset / 60)
    : 8
  return { lat: hit.latitude, lng: hit.longitude, tz, approx: false }
}

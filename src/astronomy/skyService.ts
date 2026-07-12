// 天文数据服务层（统一入口）。
//
// 职责：
// - 把 BirthSkyInput 解析为地点（经纬度 + IANA 时区）与时刻（UTC）；
// - 计算真实恒星 / 月亮 / 行星地平坐标；
// - 判断白昼；
// - 缓存相同输入，避免重复计算；
// - 产出 AstronomicalSkyResult（界面层展示用）并映射为渲染层 SkyData。
//
// 失败策略：本服务只做真实计算。若地点无法解析或计算异常，直接抛错，
// 由调用方（App）捕获并回退到视觉模拟，且必须显式告知用户“当前为演示数据”，
// 绝不静默伪装成真实天空。

import * as Astronomy from 'astronomy-engine'
import { BirthSkyInput, SkyData, SkyObject, GeoLocationResult, BirthMoment } from '../types/sky'
import { AstronomicalSkyResult, ComputedPlanet } from './types'
import { resolveBirthLocation } from './location'
import { resolveBirthMoment, toUtcDate } from './time'
import { computeStars } from './starPosition'
import { computeSolarSystem } from './solarSystem'
import { buildMilkyWay } from './galaxy'
import { computeConstellationLines } from './constellationLines'
import { computeDeepSky } from './deepSky'
import { CATALOG_META } from './starCatalog'

const ASTRONOMY_LIBRARY = 'astronomy-engine (v2)'
const CACHE_VERSION = 'sky-v2.1'

export const REAL_NOTE =
  '天体位置依据真实天文计算得到：恒星来自亮星星表（J2000 赤经赤纬，由 astronomy-engine 换算至观测时刻地平坐标），' +
  '月亮与行星由 astronomy-engine 计算，银河带依真实银道坐标系定位。' +
  '地平线轮廓、银河纹理、星点光晕、闪烁、雾化、环境音与镜头动画属于视觉增强，不代表当晚肉眼实际所见。'

// ---------- 缓存 ----------
// 内存缓存；浏览器环境下再叠加 localStorage（星表/算法版本变化即失效）。
const memoryCache = new Map<string, AstronomicalSkyResult>()

function cacheKey(input: BirthSkyInput, loc: GeoLocationResult, moment: BirthMoment): string {
  return [
    input.date,
    input.time ?? '21:00',
    loc.latitude.toFixed(3),
    loc.longitude.toFixed(3),
    loc.timezone ?? 'UTC',
    CACHE_VERSION,
  ].join('|')
}

function loadCache(key: string): AstronomicalSkyResult | null {
  const mem = memoryCache.get(key)
  if (mem) return mem
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('night-sky:' + key) : null
    if (raw) return JSON.parse(raw) as AstronomicalSkyResult
  } catch {
    /* 缓存损坏忽略 */
  }
  return null
}

function saveCache(key: string, val: AstronomicalSkyResult) {
  memoryCache.set(key, val)
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem('night-sky:' + key, JSON.stringify(val))
  } catch {
    /* 无痕模式等写入失败忽略 */
  }
}

// ---------- 主入口 ----------
export async function getAstronomicalSky(input: BirthSkyInput): Promise<AstronomicalSkyResult> {
  const location = await resolveBirthLocation(input.locationName)
  const moment = resolveBirthMoment(input.date, input.time, location.timezone ?? 'UTC')
  const date = toUtcDate(input.date, input.time, location.timezone ?? 'UTC')

  const key = cacheKey(input, location, moment)
  const cached = loadCache(key)
  if (cached) return cached

  const observer = new Astronomy.Observer(location.latitude, location.longitude, 0)

  const rawStars = computeStars(observer, date)
  const sys = computeSolarSystem(observer, date)
  const isDaytime = sys.sunAltitude > 0

  // 首星锚点：那夜最亮的星（位于地平线以上、视星等最小者）。仅作事实陈述，不臆造星名。
  const aboveHorizon = rawStars.filter((s) => s.altitude > -1)
  const heroStar = aboveHorizon.length
    ? (() => {
        const brightest = aboveHorizon.reduce((a, b) => (b.magnitude < a.magnitude ? b : a))
        return {
          magnitude: brightest.magnitude,
          azimuth: brightest.azimuth,
          altitude: brightest.altitude,
        }
      })()
    : undefined

  const warnings: string[] = []
  if (moment.isTimeEstimated) warnings.push('time-estimated')
  if (isDaytime) warnings.push('daytime')

  const planets: ComputedPlanet[] = []
  if (sys.moon) planets.push(sys.moon)
  planets.push(...sys.planets)

  const result: AstronomicalSkyResult = {
    input,
    location,
    moment,
    stars: rawStars,
    planets,
    isDaytime,
    metadata: {
      calculationMode: 'real',
      starCatalogSource: CATALOG_META.source,
      astronomyLibrary: ASTRONOMY_LIBRARY,
      generatedAt: new Date().toISOString(),
      warnings,
      starCount: rawStars.length,
      heroStar,
    },
  }

  saveCache(key, result)
  return result
}

// ---------- 映射为渲染层 SkyData ----------
export function toSkyData(result: AstronomicalSkyResult): SkyData {
  const { input, location, moment, stars, planets, isDaytime, metadata } = result
  const date = new Date(moment.utcDateTime)
  const observer = new Astronomy.Observer(location.latitude, location.longitude, 0)

  const objects: SkyObject[] = []

  for (const s of stars) {
    if (s.altitude < -1) continue // 地平线以下不显示
    objects.push({
      id: s.id,
      type: 'star',
      azimuth: s.azimuth,
      altitude: s.altitude,
      magnitude: s.magnitude,
      colorTemperature: s.colorTemperature,
      bodyName: s.name,
      isHero: false,
    })
  }
  // 首星锚点：按 id 标记那夜最亮的星
  if (metadata.heroStar) {
    const heroId = stars.find(
      (s) =>
        s.altitude > -1 &&
        Math.abs(s.magnitude - metadata.heroStar!.magnitude) < 1e-6 &&
        Math.abs(s.azimuth - metadata.heroStar!.azimuth) < 1e-6,
    )?.id
    if (heroId) {
      const o = objects.find((x) => x.id === heroId)
      if (o) o.isHero = true
    }
  }

  for (const p of planets) {
    if (p.altitude < -2) continue
    objects.push({
      id: `body-${p.name}`,
      type: p.type === 'moon' ? 'planet' : 'planet',
      azimuth: p.azimuth,
      altitude: p.altitude,
      magnitude: p.magnitude ?? -1,
      colorTemperature: p.colorTemperature,
      bodyName: p.name,
      isMoon: p.type === 'moon',
      phaseFrac: p.phase,
      phaseName: p.phaseName,
    })
  }

  // 真实深空天体（梅西耶目录，按观测时刻投影）
  objects.push(...computeDeepSky(observer, date))

  // 真实银河带（银道面定位）
  objects.push(...buildMilkyWay(observer, date))

  return {
    input,
    objects,
    generatedAt: metadata.generatedAt,
    note: REAL_NOTE,
    source: 'real',
    approxLocation: false,
    astronomy: {
      location,
      moment,
      isDaytime,
      catalogSource: metadata.starCatalogSource,
      astronomyLibrary: metadata.astronomyLibrary,
      warnings: metadata.warnings,
      heroStar: metadata.heroStar,
    },
    // 真实星座连线（按出生时刻与地点投影的 IAU 星座形状；视觉辅助，非伪造）
    constellationLines: computeConstellationLines(observer, date, { maxRank: 2 }),
  }
}

import { BirthSkyInput, SkyObject, SkyData } from '../types/sky'
import { createRng } from './prng'
import { resolveLocation } from './geo'
import { buildMilkyWay } from '../astronomy/galaxy'
import { getAstronomicalSky, toSkyData } from '../astronomy/skyService'
import * as Astronomy from 'astronomy-engine'

/**
 * 视觉模拟声明。
 * 任何面向用户的界面都必须展示此声明，且不得声称当前数据已通过真实天文还原。
 */
export const SIMULATION_NOTE =
  '当前为视觉原型数据：星空由确定性随机算法依据出生日期、时间与地点字符串生成，' +
  '仅用于验证视觉与体验，并非真实天文计算结果。'

/** 由地点字符串推断地形类型（仅用于视觉模拟的地平线轮廓） */
export type TerrainType = 'coast' | 'mountain' | 'city'

export function inferTerrain(locationName: string): TerrainType {
  const s = locationName
  if (/(海|岛|港|滨|湾|coast|island|bay|beach|sea|ocean)/i.test(s)) return 'coast'
  if (/(山|岭|峰|mountain|hill|peak|mt)/i.test(s)) return 'mountain'
  return 'city'
}

/** 地形 → 中文标签（单一真相源，徽标与渲染层共用，避免两处正则漂移） */
const TERRAIN_LABELS: Record<TerrainType, string> = {
  coast: '海滨',
  mountain: '山区',
  city: '城市',
}

export function terrainLabel(t: TerrainType): string {
  return TERRAIN_LABELS[t]
}

/** 由输入解析真实观测者与 UTC 时刻（模拟路径也给出真实走向的银河带，故复用） */
export function resolveObserverAndUtc(input: BirthSkyInput): {
  observer: Astronomy.Observer
  utc: Date
  geo: { lat: number; lng: number; tz: number; approx: boolean }
} {
  const timeKey = input.time && input.time.length >= 5 ? input.time : '21:00'
  const geo =
    input.latitude != null && input.longitude != null
      ? { lat: input.latitude, lng: input.longitude, tz: Math.round(input.longitude / 15), approx: false }
      : resolveLocation(input.locationName)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.date)
  const [h, min] = timeKey.split(':').map(Number)
  let utc: Date
  if (m) utc = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], h - geo.tz, min || 0))
  else utc = new Date()
  const observer = new Astronomy.Observer(geo.lat, geo.lng, 0)
  return { observer, utc, geo }
}

/**
 * 程序化星空生成（视觉模拟，数据层）。
 * - 相同输入 → 完全相同的结果（确定性）。
 * - 作为真实计算失败时的兜底；界面必须明确标注其为“视觉模拟数据”。
 * - 银河带走向采用真实银道面定位（buildMilkyWay），仅恒星位置为随机。
 */
export function generateSky(input: BirthSkyInput): SkyData {
  const { date, time, locationName } = input
  const timeKey = time && time.length >= 5 ? time : '21:00'
  const seedStr = `${date}|${timeKey}|${locationName}`
  const rng = createRng(seedStr)

  const { observer, utc } = resolveObserverAndUtc(input)

  // 数据层生成数量须 > CONFIG.stars.desktopMain（2400），否则桌面端裁剪上限到不了。
  const count = 2600
  const objects: SkyObject[] = []

  for (let i = 0; i < count; i++) {
    const altitude = Math.asin(rng() * 0.98) * (180 / Math.PI)
    const azimuth = rng() * 360
    const magRand = rng()
    const magnitude = -1 + Math.pow(magRand, 3) * 8
    let colorTemperature: number
    const ct = rng()
    if (ct < 0.15) colorTemperature = 3000 + rng() * 1500
    else if (ct > 0.82) colorTemperature = 8000 + rng() * 4500
    else colorTemperature = 5800 + (rng() - 0.5) * 1200
    objects.push({ id: `star-${i}`, type: 'star', azimuth, altitude, magnitude, colorTemperature })
  }

  const planetCount = 1 + Math.floor(rng() * 2)
  for (let p = 0; p < planetCount; p++) {
    objects.push({
      id: `planet-${p}`,
      type: 'planet',
      azimuth: rng() * 360,
      altitude: 5 + rng() * 50,
      magnitude: -3 + rng() * 1.5,
      colorTemperature: 5000 + rng() * 2000,
    })
  }

  // 真实走向的银河带（模拟模式下恒星随机、银河带真实）
  objects.push(...buildMilkyWay(observer, utc))

  return {
    input,
    objects,
    generatedAt: new Date().toISOString(),
    note: SIMULATION_NOTE,
    source: 'simulated',
  }
}

/**
 * 真实天文星空生成（数据层入口）。
 * 委托给 astronomy/skyService：解析地点 → 换算 UTC → 计算恒星/月亮/行星 → 映射为 SkyData。
 * 若地点无法解析或计算异常，会向上抛错，由调用方回退到 generateSky 并显式提示。
 */
export async function getRealAstronomicalSky(input: BirthSkyInput): Promise<SkyData> {
  const result = await getAstronomicalSky(input)
  return toSkyData(result)
}

import { createRng } from './prng'
import { TerrainType, inferTerrain } from './skyGenerator'

export interface HorizonPoint {
  azimuth: number
  /** 地平线以上高度角（度） */
  altitude: number
}

export interface HorizonProfile {
  terrain: TerrainType
  /** 环绕 0–360° 采样得到的轮廓点 */
  points: HorizonPoint[]
}

/**
 * 由地点字符串生成稳定但简化的地平线轮廓（视觉模拟）。
 * - 海滨类：更平缓
 * - 山区类：有明显山脊
 * - 普通城市：低矮远景，偶有高楼
 * 注意：这属于视觉模拟，不冒充真实地形数据（页面调试信息会明确标识）。
 */
export function generateHorizon(locationName: string, samples = 180): HorizonProfile {
  const terrain = inferTerrain(locationName)
  const rng = createRng(`horizon|${locationName}|${terrain}`)
  const points: HorizonPoint[] = []

  const base = terrain === 'mountain' ? 6 : terrain === 'coast' ? 1.2 : 2.5
  const ctrlCount = terrain === 'mountain' ? 7 : terrain === 'coast' ? 3 : 10
  const ctrl: number[] = []
  for (let i = 0; i < ctrlCount; i++) {
    if (terrain === 'mountain') ctrl.push(base + rng() * 9)
    else if (terrain === 'coast') ctrl.push(base + rng() * 1.5)
    else ctrl.push(base + (rng() < 0.25 ? rng() * 6 : rng() * 1.2)) // 城市偶有高楼
  }

  for (let i = 0; i <= samples; i++) {
    const az = (i / samples) * 360
    const f = (i / samples) * ctrlCount
    const i0 = Math.floor(f) % ctrlCount
    const i1 = (i0 + 1) % ctrlCount
    const frac = f - Math.floor(f)
    const smooth = frac * frac * (3 - 2 * frac) // smoothstep 平滑
    const alt = ctrl[i0] * (1 - smooth) + ctrl[i1] * smooth
    points.push({ azimuth: az, altitude: alt })
  }

  return { terrain, points }
}

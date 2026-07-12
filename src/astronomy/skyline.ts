import type { HorizonProfile, HorizonPoint } from '../lib/horizon'

// ============================================================
// 出生城市天际线（烫金剪影，礼物工艺层）
// ------------------------------------------------------------
// 产品定位：天空是真实数据（"真实在星"），城市天际线是"框"（"奢侈在框"）。
// 天际线为手绘矢量剪影，非伪造真实地形；仅对精选城市提供，其余城市优雅回退到
// 原有 procedural 地平线（防较真：绝不显示认不出的"通用高楼"冒充地标）。
// 渲染层会把它画成深色剪影 + 顶部金色描边（烫金印章感）。
// ============================================================

/** 天际线上一个点：t∈[0,1] 为横跨前弧的比例，h 为该处高度角（度） */
export interface SkylinePoint {
  t: number
  h: number
}

export interface SkylineProfile {
  /** 天际线正对的方位角（度）。相机初始正对 180°，故默认 180 */
  center: number
  /** 天际线横跨的总角宽（度） */
  span: number
  /** 沿前弧的地标轮廓点（t 升序） */
  points: SkylinePoint[]
}

// ------------------------------------------------------------
// 英雄城市：北京
// 手绘轮廓（相对比例，非精确测绘），刻意把代表性地标画得可辨认：
//   中国尊 = 中央收腰尖塔（最高）；央视"大裤衩" = 双塔 + 中间连桥下凹；
//   鸟巢 = 宽矮穹顶；祈年殿 = 三层檐圆顶；鼓楼 = 方塔。
// 新版原则：少峰、大高差、干净剪影，让天际线在底部 1/3 画面里即可读出"北京"。
// ------------------------------------------------------------
const BEIJING: SkylineProfile = {
  center: 180,
  span: 160,
  points: [
    // 西端平缓基线
    { t: 0.0, h: 0.8 },
    { t: 0.08, h: 1.0 },
    // 鸟巢：宽矮穹顶
    { t: 0.12, h: 1.2 },
    { t: 0.15, h: 5.2 },
    { t: 0.18, h: 5.2 },
    { t: 0.21, h: 1.2 },
    // 央视"大裤衩"：双塔 + 连桥下凹，形状要读出"M"形凹口
    { t: 0.28, h: 1.0 },
    { t: 0.31, h: 8.0 }, // 塔 A
    { t: 0.34, h: 3.8 }, // 连桥下凹
    { t: 0.37, h: 8.6 }, // 塔 B
    { t: 0.40, h: 1.0 },
    // 中国尊：中央收腰尖塔，最高，最窄
    { t: 0.47, h: 1.0 },
    { t: 0.49, h: 4.0 },
    { t: 0.51, h: 9.0 },
    { t: 0.52, h: 12.0 },
    { t: 0.53, h: 15.0 }, // 尖顶
    { t: 0.54, h: 10.0 },
    { t: 0.56, h: 4.0 },
    { t: 0.58, h: 1.0 },
    // 祈年殿：三层圆顶，矮但圆润
    { t: 0.64, h: 1.0 },
    { t: 0.66, h: 2.5 },
    { t: 0.67, h: 1.8 },
    { t: 0.68, h: 3.2 },
    { t: 0.69, h: 2.2 },
    { t: 0.70, h: 3.8 },
    { t: 0.72, h: 1.0 },
    // 鼓楼：方塔，末端明显竖块
    { t: 0.77, h: 1.0 },
    { t: 0.79, h: 2.0 },
    { t: 0.80, h: 5.5 },
    { t: 0.82, h: 5.5 },
    { t: 0.84, h: 1.5 },
    // 东端平缓基线
    { t: 0.90, h: 1.0 },
    { t: 1.0, h: 0.8 },
  ],
}

/** 城市名 → 天际线。后续可扩展更多精选城市。 */
export const CITY_SKYLINES: Record<string, SkylineProfile> = {
  北京: BEIJING,
}

/** 按地点名查找天际线：精确匹配优先，其次包含匹配；未命中返回 null（回退地平线） */
export function getSkyline(locationName: string): SkylineProfile | null {
  const key = locationName.trim()
  if (CITY_SKYLINES[key]) return CITY_SKYLINES[key]
  for (const k of Object.keys(CITY_SKYLINES)) {
    if (key.includes(k) || k.includes(key)) return CITY_SKYLINES[k]
  }
  return null
}

/** 线性插值：给定 t∈[0,1]，返回天际线高度角（度） */
function sampleSkyline(points: SkylinePoint[], t: number): number {
  if (t <= points[0].t) return points[0].h
  const last = points[points.length - 1]
  if (t >= last.t) return last.h
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    if (t >= a.t && t <= b.t) {
      const f = (t - a.t) / (b.t - a.t || 1)
      return a.h + (b.h - a.h) * f
    }
  }
  return last.h
}

export interface SkylineHorizon {
  /** 整圈地平线轮廓（前弧为地标，其余为低地平线） */
  profile: HorizonProfile
  /** 仅前弧地标顶部的描边点序列（用于金色烫金线） */
  edge: HorizonPoint[]
}

/**
 * 把天际线合并进整圈地平线。
 * - 前弧 [center-span/2, center+span/2]：使用天际线高度（地标剪影）
 * - 其余：使用低而平缓的基线（与天际线端点高度衔接，避免突跳）
 * 返回 null 表示无天际线数据，调用方应回退到 generateHorizon。
 */
export function buildSkylineHorizon(
  locationName: string,
  samples = 180,
  baselineAlt = 0.7,
): SkylineHorizon | null {
  const profile = getSkyline(locationName)
  if (!profile) return null

  const half = profile.span / 2
  const start = profile.center - half
  const end = profile.center + half
  if (start < 0 || end > 360) {
    // 当前仅支持不跨 0°/360° 的前弧；跨界的城市暂不在精选集内
    return null
  }

  const points: HorizonPoint[] = []
  for (let i = 0; i <= samples; i++) {
    const az = (i / samples) * 360
    let alt: number
    if (az >= start && az <= end) {
      const t = (az - start) / profile.span
      alt = sampleSkyline(profile.points, t)
    } else {
      alt = baselineAlt
    }
    points.push({ azimuth: az, altitude: alt })
  }

  // 金色描边：仅前弧，按 0.5° 步长细分，保证曲线顺滑
  const edge: HorizonPoint[] = []
  for (let az = start; az <= end + 1e-6; az += 0.5) {
    const t = (az - start) / profile.span
    edge.push({ azimuth: az, altitude: sampleSkyline(profile.points, t) })
  }

  return {
    profile: { terrain: 'city', points },
    edge,
  }
}

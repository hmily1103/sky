// 天文计算层类型定义。
// 这些类型描述“真实天文计算”的结果契约，与渲染层 SkyObject 解耦：
// 渲染层只消费 SkyData（objects），界面层可额外读取这些结构展示“真实数据说明”。

import type { GeoLocationResult, BirthMoment, AstronomyMeta } from '../types/sky'
export type { GeoLocationResult, BirthMoment, AstronomyMeta }

/** 地点解析失败（本地库与可选线上服务都无匹配） */
export class LocationResolveError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LocationResolveError'
  }
}

/** 精简亮星星表条目 */
export interface StarCatalogEntry {
  id: string
  name?: string
  /** 赤经，单位度（J2000） */
  rightAscension: number
  /** 赤纬，单位度（J2000） */
  declination: number
  /** 视星等，数值越小越亮 */
  magnitude: number
  /** B-V 色指数（可选） */
  colorIndex?: number
  /** 星座（可选） */
  constellation?: string
}

/** 计算后的恒星（含地平坐标与可见性） */
export interface ComputedStar extends StarCatalogEntry {
  type: 'star'
  /** 方位角，度，0–360（北为 0，向东增加） */
  azimuth: number
  /** 高度角，度（地平线以上为正） */
  altitude: number
  visibleAboveHorizon: boolean
  colorTemperature?: number
}

export type PlanetKind = 'planet' | 'moon' | 'sun'

/** 计算后的太阳系天体 */
export interface ComputedPlanet {
  type: PlanetKind
  /** 展示名：Moon / Mercury / Venus … */
  name: string
  azimuth: number
  altitude: number
  magnitude?: number
  /** 月相（满月分数 0–1），仅月亮 */
  phase?: number
  /** 月相中文名（如 盈凸月），仅月亮 */
  phaseName?: string
  /** 月亮是否“盈”（waxing）：月黄经领先太阳，处于上弦前。仅月亮 */
  waxing?: boolean
  visibleAboveHorizon: boolean
  colorTemperature?: number
}

/** 统一天文计算结果 */
export interface AstronomicalSkyResult {
  input: import('../types/sky').BirthSkyInput
  location: GeoLocationResult
  moment: BirthMoment
  stars: ComputedStar[]
  /** 月亮 + 主要行星（太阳不渲染，仅参与白昼判断） */
  planets: ComputedPlanet[]
  isDaytime: boolean
  metadata: {
    calculationMode: 'real' | 'fallback'
    starCatalogSource: string
    astronomyLibrary: string
    generatedAt: string
    warnings: string[]
    starCount: number
    /** 那夜最亮的星（首星锚点事实） */
    heroStar?: import('../types/sky').HeroStarInfo
  }
}

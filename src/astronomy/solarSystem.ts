// 太阳系天体计算：月亮、主要行星、太阳（太阳仅参与白昼判断，不直接渲染）。
// 位置按出生时刻 + 地点，由 astronomy-engine 计算为地平坐标。

import * as Astronomy from 'astronomy-engine'
import type { Observer, Body } from 'astronomy-engine'
import { ComputedPlanet } from './types'

export interface SolarSystemResult {
  /** 太阳高度角（度），用于白昼判断 */
  sunAltitude: number
  moon: ComputedPlanet | null
  planets: ComputedPlanet[]
}

// 各亮行星近似视星等（仅用于渲染亮度/尺寸映射；真实亮度随时变化，此处取典型值）
const PLANET_MAG: Partial<Record<Body, number>> = {
  Mercury: -0.5,
  Venus: -4.2,
  Mars: -1.5,
  Jupiter: -2.2,
  Saturn: 0.5,
  Uranus: 5.6,
  Neptune: 7.8,
}

const PLANET_NAMES: Record<string, string> = {
  Mercury: 'Mercury',
  Venus: 'Venus',
  Mars: 'Mars',
  Jupiter: 'Jupiter',
  Saturn: 'Saturn',
  Uranus: 'Uranus',
  Neptune: 'Neptune',
}

const PLANET_BODIES: Body[] = [
  Astronomy.Body.Mercury,
  Astronomy.Body.Venus,
  Astronomy.Body.Mars,
  Astronomy.Body.Jupiter,
  Astronomy.Body.Saturn,
  Astronomy.Body.Uranus,
  Astronomy.Body.Neptune,
]

// 月相中文名：依据照度分数（0 新月 → 1 满月）与盈亏方向（上弦前为“蛾眉/盈凸”，下弦后为“残/亏凸”）。
function moonPhaseName(frac: number, waxing: boolean): string {
  if (frac < 0.03) return '新月'
  if (frac > 0.97) return '满月'
  if (frac < 0.47) return waxing ? '蛾眉月' : '残月'
  if (frac < 0.53) return waxing ? '上弦月' : '下弦月'
  return waxing ? '盈凸月' : '亏凸月'
}

// 月亮是否“盈”（waxing）：比较月与日的黄经，月黄经领先太阳即处于上弦前（盈）。
function moonIsWaxing(date: Date, observer: Observer): boolean {
  try {
    const sunVec = Astronomy.Equator(Astronomy.Body.Sun, date, observer, true, true).vec
    const moonVec = Astronomy.Equator(Astronomy.Body.Moon, date, observer, true, true).vec
    const sunEl = Astronomy.Ecliptic(sunVec).elon
    const moonEl = Astronomy.Ecliptic(moonVec).elon
    let diff = moonEl - sunEl
    while (diff > 180) diff -= 360
    while (diff < -180) diff += 360
    return diff >= 0
  } catch {
    return true
  }
}

function toComputed(
  body: Body,
  date: Date,
  observer: Observer,
  kind: 'planet' | 'moon',
  name: string,
  magnitude: number,
  colorTemperature: number,
): ComputedPlanet | null {
  try {
    const eq = Astronomy.Equator(body, date, observer, true, true)
    const hor = Astronomy.Horizon(date, observer, eq.ra, eq.dec, 'normal')
    if (hor.altitude < -3) return null // 地平线以下不显示
    const p: ComputedPlanet = {
      type: kind,
      name,
      azimuth: hor.azimuth,
      altitude: hor.altitude,
      magnitude,
      visibleAboveHorizon: hor.altitude > 0,
      colorTemperature,
    }
    if (kind === 'moon') {
      try {
        const illum = Astronomy.Illumination(body, date)
        p.phase = illum.phase_fraction
        p.phaseName = moonPhaseName(illum.phase_fraction, moonIsWaxing(date, observer))
      } catch {
        /* 月相可选，失败不影响主流程 */
      }
    }
    return p
  } catch {
    return null
  }
}

export function computeSolarSystem(observer: Observer, date: Date): SolarSystemResult {
  // 太阳（仅判断白昼）
  let sunAltitude = -90
  try {
    const sunEq = Astronomy.Equator(Astronomy.Body.Sun, date, observer, true, true)
    sunAltitude = Astronomy.Horizon(date, observer, sunEq.ra, sunEq.dec, 'normal').altitude
  } catch {
    /* 忽略 */
  }

  // 月亮
  const moon = toComputed(
    Astronomy.Body.Moon,
    date,
    observer,
    'moon',
    'Moon',
    -12.7,
    4500,
  )

  // 行星
  const planets: ComputedPlanet[] = []
  for (const body of PLANET_BODIES) {
    const p = toComputed(
      body,
      date,
      observer,
      'planet',
      PLANET_NAMES[body] ?? String(body),
      PLANET_MAG[body] ?? -1,
      6000,
    )
    if (p) planets.push(p)
  }

  return { sunAltitude, moon, planets }
}

// 真实银河带：银道坐标系（l=银经, b=银纬）→ 赤道系 → 观测时刻地平坐标。
// 银心方向(l=0,b=0)位于人马座；北银极方向为已知固定赤道坐标（J2000）。
// 沿真实银道面采样，使银河的“走向”与“中心增亮”符合那一夜的真实天象。
// 属真实天文定位；银河带纹理/光晕本身仍为视觉增强，页面会明确区分。

import * as Astronomy from 'astronomy-engine'
import type { Observer } from 'astronomy-engine'
import { SkyObject } from '../types/sky'

const GC_RA = 266.4051 // 银心方向赤经 (deg, J2000)
const GC_DEC = -28.936175 // 银心方向赤纬 (deg, J2000)
const GNP_RA = 192.85948 // 北银极赤经 (deg, J2000)
const GNP_DEC = 27.12825 // 北银极赤纬 (deg, J2000)

function radecToVec(raDeg: number, decDeg: number): [number, number, number] {
  const ra = (raDeg * Math.PI) / 180
  const dec = (decDeg * Math.PI) / 180
  return [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)]
}
function cross(a: number[], b: number[]): [number, number, number] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}
function norm(v: [number, number, number]): [number, number, number] {
  const m = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / m, v[1] / m, v[2] / m]
}
// 银道系三轴在赤道系下的单位方向：x=银心, z=北银极, y=银经增加方向
const GC_VEC: [number, number, number] = radecToVec(GC_RA, GC_DEC)
const GNP_VEC: [number, number, number] = radecToVec(GNP_RA, GNP_DEC)
const GY_VEC: [number, number, number] = norm(cross(GNP_VEC, GC_VEC))

/** 银道 (l,b) → 赤道 (ra,dec)，单位度（J2000） */
function galacticToEquatorial(lDeg: number, bDeg: number): { ra: number; dec: number } {
  const l = (lDeg * Math.PI) / 180
  const b = (bDeg * Math.PI) / 180
  const xg = Math.cos(b) * Math.cos(l)
  const yg = Math.cos(b) * Math.sin(l)
  const zg = Math.sin(b)
  const ex = xg * GC_VEC[0] + yg * GY_VEC[0] + zg * GNP_VEC[0]
  const ey = xg * GC_VEC[1] + yg * GY_VEC[1] + zg * GNP_VEC[1]
  const ez = xg * GC_VEC[2] + yg * GY_VEC[2] + zg * GNP_VEC[2]
  const dec = (Math.asin(Math.max(-1, Math.min(1, ez))) * 180) / Math.PI
  let ra = (Math.atan2(ey, ex) * 180) / Math.PI
  if (ra < 0) ra += 360
  return { ra, dec }
}

/**
 * 沿真实银道面采样，生成“走向与中心增亮”都符合真实的银河带点。
 * magnitude 字段存相对亮度(0–1)，供渲染层决定亮度/尺寸。
 */
export function buildMilkyWay(observer: Observer, utc: Date): SkyObject[] {
  const out: SkyObject[] = []
  const lStep = 2.0
  const bMax = 16
  const bStep = 1.4
  for (let l = 0; l < 360; l += lStep) {
    const dl = Math.abs(((l + 180) % 360) - 180) // 距银心角距 0–180
    const longFactor = 0.22 + 0.78 * Math.exp(-(dl * dl) / (2 * 42 * 42))
    for (let b = -bMax; b <= bMax; b += bStep) {
      const latFactor = Math.exp(-(b * b) / (2 * 8.5 * 8.5))
      const intensity = longFactor * latFactor
      if (intensity < 0.05) continue
      const { ra, dec } = galacticToEquatorial(l, b)
      const hor = Astronomy.Horizon(utc, observer, ra, dec, 'normal')
      if (hor.altitude < -3) continue
      const ct = 5600 + (b / bMax) * 1600 + Math.sin(l * 1.7) * 300
      out.push({
        id: `mw-${l.toFixed(1)}_${b.toFixed(1)}`,
        type: 'galaxy',
        azimuth: hor.azimuth,
        altitude: hor.altitude,
        magnitude: intensity,
        colorTemperature: ct,
      })
    }
  }
  return out
}

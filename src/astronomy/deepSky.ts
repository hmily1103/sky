// 深空天体（真实梅西耶目录）投影到观测时刻地平坐标。
// 数据为真实 J2000 赤经/赤纬，由 astronomy-engine 换算至地平坐标；
// 与恒星同一套算法，位置真实。渲染层按类型画柔和图标（星系/星团/星云各异）。

import * as Astronomy from 'astronomy-engine'
import type { Observer } from 'astronomy-engine'
import { SkyObject } from '../types/sky'
import { raDegToHours } from './raUnits'

interface MessierEntry {
  m: string
  name: string
  type: string
  ra: number
  dec: number
  mag: number
  size: [number, number]
  pa: number
}

// 按类型给的色调（RGB 0–1），保证星云红/星系冷白/星团暖白等区分明显。
// 绕过色温，因为星云颜色来自发射谱线而非黑体辐射。
const KIND_COLOR: Record<string, [number, number, number]> = {
  open: [1.0, 0.96, 0.86], // 疏散星团：暖白
  globular: [1.0, 0.93, 0.82], // 球状星团：暖白偏橙
  nebula: [1.0, 0.42, 0.5], // 弥漫发射星云：红/品红（Hα）
  planetary: [0.55, 0.88, 1.0], // 行星状星云：青蓝
  snr: [0.55, 0.95, 0.82], // 超新星遗迹：青绿
  galaxy: [0.96, 0.93, 0.82], // 星系：冷黄白
  double: [1, 1, 1],
  asterism: [1, 1, 1],
}

export function computeDeepSky(observer: Observer, date: Date): SkyObject[] {
  const raw = (messierData as MessierEntry[]) || []
  const out: SkyObject[] = []
  for (const d of raw) {
    // 赤经为角度制，Horizon() 要求小时制，必须换算
    const hor = Astronomy.Horizon(date, observer, raDegToHours(d.ra), d.dec, 'normal')
    if (hor.altitude < -1) continue // 地平线以下不显示
    const label = d.name && d.name !== '—' ? `${d.m} ${d.name}` : d.m
    out.push({
      id: `ds-${d.m}`,
      type: 'deepsky',
      azimuth: hor.azimuth,
      altitude: hor.altitude,
      magnitude: d.mag,
      deepSkyKind: d.type as SkyObject['deepSkyKind'],
      sizeArcmin: d.size,
      pa: d.pa,
      color: KIND_COLOR[d.type] || [1, 1, 1],
      bodyName: label,
    })
  }
  return out
}

// 静态导入放在末尾，避免循环依赖干扰类型推断
import messierData from './data/messier.json'

// 恒星位置计算：把星表（赤经/赤纬 J2000）换算为观测时刻的地平坐标。
// 岁差 / 章动由 astronomy-engine 在 Horizon() 内部处理。

import * as Astronomy from 'astronomy-engine'
import type { Observer } from 'astronomy-engine'
import { STAR_CATALOG } from './starCatalog'
import { raDegToHours } from './raUnits'
import { bvToKelvin } from '../lib/color'
import { ComputedStar } from './types'

export function computeStars(observer: Observer, date: Date): ComputedStar[] {
  const out: ComputedStar[] = []
  for (const s of STAR_CATALOG) {
    // 星表赤经为角度制，Horizon() 要求小时制，必须换算
    const hor = Astronomy.Horizon(date, observer, raDegToHours(s.rightAscension), s.declination, 'normal')
    out.push({
      ...s,
      type: 'star',
      azimuth: hor.azimuth,
      altitude: hor.altitude,
      visibleAboveHorizon: hor.altitude > 0,
      colorTemperature: bvToKelvin(s.colorIndex ?? 0),
    })
  }
  return out
}

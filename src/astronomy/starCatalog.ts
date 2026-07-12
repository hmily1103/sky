// 亮星星表模块。
//
// 数据来源（务必诚实标注，见 README）：
//   基于 d3-celestial 公开星表（stars.6.json，Hipparcos / Yale Bright Star Catalogue 派生），
//   取视星等 ≤ 5.0 的亮星精简为项目内置星表，共 1627 颗，含赤经 / 赤纬（J2000）、视星等、B-V 色指数。
//   原始数据许可以 d3-celestial 项目发布为准（CC-BY 4.0）。本项目未使用 Gaia 数据，请勿声称使用 Gaia。
//
// 数据集仅覆盖肉眼可见的主要亮星，非完整星表；对几十年时间跨度的普通亮星，
// 未做恒星自行修正（影响远小于视觉分辨率，非专业测量级精度）。岁差 / 章动由 astronomy-engine 在计算时处理。

import raw from '../lib/starCatalog.json'
import { StarCatalogEntry } from './types'

interface RawStar {
  ra: number
  dec: number
  mag: number
  bv: number
}

export const STAR_CATALOG: StarCatalogEntry[] = (raw as RawStar[]).map((s, i) => ({
  id: `cat-${i}`,
  rightAscension: s.ra,
  declination: s.dec,
  magnitude: s.mag,
  colorIndex: Number.isFinite(s.bv) ? s.bv : 0,
}))

export const CATALOG_META = {
  source:
    'd3-celestial 公开亮星星表（Hipparcos / Yale BSC 派生，mag≤5.0 精简，1627 颗）',
  license: 'CC-BY 4.0（以 d3-celestial 原始发布为准）',
  count: STAR_CATALOG.length,
  epoch: 'J2000',
} as const

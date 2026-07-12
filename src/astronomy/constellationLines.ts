// 真实星座连线：IAU 星座形状，端点为真实恒星赤经/赤纬（J2000，度）。
// 对观测时刻与地点用 astronomy-engine 投影为方位/高度，得到“那夜那地”真实的星座走向。
// 数据来源：d3-celestial 的 constellations.lines.json（IAU 星座连线，CC-BY 4.0），
// 坐标为赤道 J2000 赤经/赤纬（度），与本项目恒星坐标同源，投影方式一致。
// 属真实天文定位；仅作“认出星座”的视觉辅助，页面会明确区分“真实天象”与“视觉增强”。

import * as Astronomy from 'astronomy-engine'
import type { Observer } from 'astronomy-engine'
import { raDegToHours } from './raUnits'
import raw from './data/constellations.lines.json'

interface RawFeature {
  id: string
  properties: { rank: string }
  geometry: { type: string; coordinates: number[][][] }
}

const DATA = raw as unknown as { features: RawFeature[] }

// 88 个 IAU 星座的中文名（缩写 → 中文），覆盖全部 rank，保证任何星座都有可读名。
const NAME_MAP: Record<string, string> = {
  And: '仙女座', Ant: '唧筒座', Aps: '天燕座', Aqr: '宝瓶座', Aql: '天鹰座',
  Ara: '天坛座', Ari: '白羊座', Aur: '御夫座', Boo: '牧夫座', Cae: '雕具座',
  Cam: '鹿豹座', Cap: '摩羯座', Car: '船底座', Cas: '仙后座', Cen: '半人马座',
  Cep: '仙王座', Cet: '鲸鱼座', Cha: '蝘蜓座', Cir: '圆规座', Col: '天鸽座',
  Com: '后发座', CrA: '南冕座', CrB: '北冕座', Crt: '巨爵座', Cru: '南十字座',
  Cvn: '猎犬座', Cya: '天鹅座', Del: '海豚座', Dor: '剑鱼座', Dra: '天龙座',
  Equ: '小马座', Eri: '波江座', For: '天炉座', Gem: '双子座', Gru: '天鹤座',
  Her: '武仙座', Hor: '时钟座', Hya: '长蛇座', Hyi: '水蛇座', Ind: '印第安座',
  Lac: '蝎虎座', Leo: '狮子座', LMi: '小狮座', Lep: '天兔座', Lib: '天秤座',
  Lup: '豺狼座', Lyn: '天猫座', Lyr: '天琴座', Men: '山案座', Mic: '显微镜座',
  Mon: '麒麟座', Mus: '苍蝇座', Nor: '矩尺座', Oct: '南极座', Oph: '蛇夫座',
  Ori: '猎户座', Pav: '孔雀座', Peg: '飞马座', Per: '英仙座', Phe: '凤凰座',
  Pic: '绘架座', PsA: '南鱼座', PsC: '双鱼座', Pup: '船尾座', Pyx: '罗盘座',
  Ret: '网罟座', Scl: '玉夫座', Sco: '天蝎座', Sct: '盾牌座', Ser: '巨蛇座',
  Sex: '六分仪座', Sge: '天箭座', Sgr: '人马座', Tau: '金牛座', Tel: '望远镜座',
  TrA: '南三角座', Tri: '三角座', Tuc: '杜鹃座', UMa: '大熊座', UMi: '小熊座',
  Vel: '船帆座', Vir: '室女座', Vol: '飞鱼座', Vul: '狐狸座',
}

export interface ProjectedPoint {
  azimuth: number
  altitude: number
}

export interface ConstellationLineOut {
  id: string
  name: string
  rank: number
  /** 一条或多条折线；每条折线是一串已投影的方位/高度点 */
  polylines: ProjectedPoint[][]
}

/**
 * 计算那夜那地的真实星座连线（端点投影到观测时刻的地平坐标）。
 * @param maxRank 仅渲染 rank ≤ maxRank 的星座（1=最著名，2=中等，3=次要）。默认 2，保证画面克制、可认。
 * 地平线以下（alt < -2°）的端点被丢弃；若一条折线因此不足 2 点则跳过。
 */
export function computeConstellationLines(
  observer: Observer,
  utc: Date,
  opts?: { maxRank?: number },
): ConstellationLineOut[] {
  const maxRank = opts?.maxRank ?? 2
  const out: ConstellationLineOut[] = []
  for (const f of DATA.features) {
    const rank = parseInt(f.properties.rank, 10) || 3
    if (rank > maxRank) continue
    const polylines: ProjectedPoint[][] = []
    for (const line of f.geometry.coordinates) {
      // 断点逻辑：一条星座折线可能有部分点在地平线以下。遇到不可见点时，
      // 把当前已累积的可见段先收尾（≥2 点才成线），再从下一个可见点重新开始，
      // 避免把地平线两侧原本不相邻的端点直接连成一条穿越天空的假线段。
      let pts: ProjectedPoint[] = []
      for (const [raDeg, dec] of line) {
        // 星座数据赤经为角度制，Horizon() 要求小时制，必须换算
        const hor = Astronomy.Horizon(utc, observer, raDegToHours(raDeg), dec, 'normal')
        if (hor.altitude < -2) {
          // 地平线以下：断开当前段
          if (pts.length >= 2) polylines.push(pts)
          pts = []
          continue
        }
        pts.push({ azimuth: hor.azimuth, altitude: hor.altitude })
      }
      if (pts.length >= 2) polylines.push(pts)
    }
    if (polylines.length === 0) continue
    out.push({
      id: f.id,
      name: NAME_MAP[f.id] ?? f.id,
      rank,
      polylines,
    })
  }
  return out
}

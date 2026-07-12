import { SkyData } from '../types/sky'

interface DataPanelProps {
  skyData: SkyData | null
  show: boolean
  onClose: () => void
}

const VISUAL_ENHANCEMENTS = [
  '地平线轮廓（按地形类别程序化生成，非出生地真实地貌）',
  '银河纹理与光晕（银河走向为真实银道定位，纹理属视觉增强）',
  '星点光晕与轻微非同步闪烁',
  '雾化与暗角',
  '环境音与镜头动画',
]

function fmtLat(lat: number): string {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`
}
function fmtLng(lng: number): string {
  return `${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`
}

// 方位角 → 八方位中文（北=0，向东增加）
function compass(az: number): string {
  const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
  return dirs[Math.round(((az % 360) + 360) % 360 / 45) % 8]
}

// 月相小图标：以两圆弧描绘亮缘与明暗界线（终结线为半椭圆）。
function MoonPhaseGlyph({ frac, waxing }: { frac: number; waxing: boolean }) {
  const R = 15
  const cx = 18
  const cy = 18
  const dark = '#161c2b'
  const lit = '#cdd3e0'
  if (frac <= 0.02) {
    return (
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden>
        <circle cx={cx} cy={cy} r={R} fill={dark} stroke="rgba(201,183,143,0.35)" strokeWidth="1" />
      </svg>
    )
  }
  if (frac >= 0.98) {
    return (
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden>
        <circle cx={cx} cy={cy} r={R} fill={lit} stroke="rgba(201,183,143,0.35)" strokeWidth="1" />
      </svg>
    )
  }
  const phaseAngle = Math.acos(Math.max(-1, Math.min(1, 2 * frac - 1)))
  const rxAbs = Math.abs(R * Math.cos(phaseAngle))
  const outerSweep = waxing ? 1 : 0 // 亮的半边：盈（waxing）在右
  const termSweep = frac >= 0.5 ? outerSweep : 1 - outerSweep
  const d = `M ${cx} ${cy - R} A ${R} ${R} 0 0 ${outerSweep} ${cx} ${cy + R} A ${rxAbs} ${R} 0 0 ${termSweep} ${cx} ${cy - R} Z`
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden>
      <circle cx={cx} cy={cy} r={R} fill={dark} stroke="rgba(201,183,143,0.35)" strokeWidth="1" />
      <path d={d} fill={lit} />
    </svg>
  )
}

export default function DataPanel({ skyData, show, onClose }: DataPanelProps) {
  if (!show || !skyData) return null
  const a = skyData.astronomy
  const isReal = skyData.source === 'real' && !!a

  const moon = skyData.objects.find((o) => o.isMoon)
  const moonWaxing = moon?.phaseName ? /(蛾眉|上弦|盈凸|新月)/.test(moon.phaseName) : true
  const moonPct = moon?.phaseFrac != null ? Math.round(moon.phaseFrac * 100) : null
  const moonVisible = moon ? moon.altitude > 0 : false

  const hero = a?.heroStar

  return (
    <div className="data-panel" role="dialog" aria-label="真实数据说明">
      <div className="data-panel-head">
        <span className="data-panel-title">真实数据说明</span>
        <button className="data-panel-close" onClick={onClose} aria-label="关闭">
          ×
        </button>
      </div>

      <p className="data-panel-lead">
        这片天空依据你输入的日期、当地时间和出生地点计算。
      </p>

      <div className={`data-badge ${isReal ? 'real' : 'sim'}`}>
        {isReal ? '天文位置：真实计算' : '当前使用视觉演示数据'}
      </div>

      {isReal && a && (
        <div className="data-rows">
          <Row k="地点" v={a.location.displayName} />
          <Row k="经纬度" v={`${fmtLat(a.location.latitude)}, ${fmtLng(a.location.longitude)}`} />
          <Row k="当地时间" v={a.moment.localDateTime + (a.moment.isTimeEstimated ? '（默认 21:00）' : '')} />
          <Row k="UTC 时间" v={a.moment.utcDateTime} />
          <Row
            k="时区"
            v={`${a.location.timezone ?? 'UTC'}${a.moment.isTimeEstimated ? ' · 时间未知，按 21:00 还原' : ''}`}
          />
          <Row k="星表来源" v={a.catalogSource} />
          <Row k="天文计算引擎" v={a.astronomyLibrary} />
          {hero && (
            <Row
              k="那夜最亮的星"
              v={
                (hero.altitude > 0 ? `位于${compass(hero.azimuth)}方天空 · ` : '') +
                `视星等 ${hero.magnitude.toFixed(2)}`
              }
            />
          )}
          {moon && (
            <div className="data-moon-row">
              <span className="data-k">月亮</span>
              <span className="data-moon-body">
                <MoonPhaseGlyph frac={moon.phaseFrac ?? 0} waxing={moonWaxing} />
                <span className="data-moon-text">
                  {moon.phaseName ?? '—'}
                  {moonPct != null && ` · 照度 ${moonPct}%`}
                  {!moonVisible && '（当时在地平线以下）'}
                </span>
              </span>
            </div>
          )}
          {a.isDaytime && (
            <Row
              k="白昼提示"
              v="出生时为当地白昼，已采用天文视图；太阳光与大气亮度属视觉处理。"
            />
          )}
        </div>
      )}

      <div className="data-section">
        <div className="data-section-title">视觉增强（非天文位置数据）</div>
        <ul className="data-list">
          {VISUAL_ENHANCEMENTS.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>

      <p className="data-foot">
        未模拟当天真实天气、云层、光污染、建筑物或地形遮挡；不代表当晚肉眼实际所见。
      </p>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="data-row">
      <span className="data-k">{k}</span>
      <span className="data-v">{v}</span>
    </div>
  )
}

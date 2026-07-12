// 数据层类型定义 —— 与渲染层完全解耦
// 渲染层只消费这些纯数据；后续接入真实天文计算库时，只需让 getRealAstronomicalSky 返回同样结构的 SkyData。

export interface BirthSkyInput {
  /** 出生日期，格式 YYYY-MM-DD */
  date: string
  /** 出生时间，格式 HH:mm，选填（缺省按当晚 21:00 还原） */
  time?: string
  /** 出生地点（城市名/地名文字） */
  locationName: string
  /** 纬度，选填（真实数据接入后用于天文计算） */
  latitude?: number
  /** 经度，选填 */
  longitude?: number
}

export interface SkyObject {
  id: string
  /** star/planet 走主星缓冲（按星等映射亮度尺寸）；galaxy 为真实银道面定位的银河带点，
   *  magnitude 字段在此解释为该点的相对亮度(0–1)，供渲染层决定亮度/尺寸 */
  type: 'star' | 'planet' | 'galaxy'
  /** 方位角，单位度，0–360 */
  azimuth: number
  /** 高度角（地平线以上），单位度，可为轻微负值 */
  altitude: number
  /** 视星等（star/planet）或相对亮度 0–1（galaxy） */
  magnitude: number
  /** 色温，单位开尔文（K） */
  colorTemperature?: number
  /** 展示名（行星/月亮用，如 Moon / Venus；恒星在派生星表中多数为空） */
  bodyName?: string
  /** 是否月亮（用于界面层展示月相） */
  isMoon?: boolean
  /** 月亮照度分数 0–1（0 新月，1 满月） */
  phaseFrac?: number
  /** 月相中文名（如 盈凸月），由数据层依据照度与盈亏方向计算 */
  phaseName?: string
  /** 是否“那夜最亮的星”（首星锚点：开场第一颗点亮，并有提示音） */
  isHero?: boolean
}

export interface SkyData {
  input: BirthSkyInput
  objects: SkyObject[]
  generatedAt: string
  /** 数据性质声明：当前为视觉模拟，不是真实天文还原 */
  note: string
  /** 数据来源：模拟随机 vs 真实天文计算 */
  source: 'simulated' | 'real'
  /** 仅真实模式：地点未命中坐标表、使用的是回退近似坐标 */
  approxLocation?: boolean
  /** 第二轮新增：真实天文计算的元数据，供“真实数据说明”面板与白天提示使用 */
  astronomy?: AstronomyMeta
  /** 真实星座连线（IAU 星座形状，按出生时刻与地点投影）。属真实天文定位，仅作视觉辅助。 */
  constellationLines?: ConstellationLine[]
}

/** 地点解析结果（第二轮统一接口，与页面组件解耦） */
export interface GeoLocationResult {
  displayName: string
  latitude: number
  longitude: number
  timezone?: string
  countryCode?: string
}

/** 出生时刻解析结果（含 IANA 时区与 UTC 换算） */
export interface BirthMoment {
  localDateTime: string
  timezone: string
  utcDateTime: string
  isTimeEstimated: boolean
}

/** 那夜最亮的星（首星锚点所用，仅作事实陈述，不臆造星名） */
export interface HeroStarInfo {
  /** 视星等（数值越小越亮） */
  magnitude: number
  /** 方位角，度 */
  azimuth: number
  /** 高度角，度（>0 表示位于地平线以上） */
  altitude: number
}

/** 真实计算元数据，随 SkyData 一并传给界面层 */
export interface AstronomyMeta {
  location: GeoLocationResult
  moment: BirthMoment
  isDaytime: boolean
  catalogSource: string
  astronomyLibrary: string
  warnings: string[]
  /** 那夜最亮的星（首星锚点事实；可能为空，如所有恒星都在地平线以下） */
  heroStar?: HeroStarInfo
}

/** 真实星座连线（IAU 星座形状）。
 *  端点为真实恒星赤经/赤纬（J2000），按出生时刻与地点投影为方位/高度，属真实天文定位；
 *  仅作“认出星座”的视觉辅助，非伪造。页面会在数据面板区分“真实天象”与“视觉增强”。 */
export interface ConstellationLine {
  /** 星座 IAU 缩写（如 Ori / UMa） */
  id: string
  /** 星座中文展示名 */
  name: string
  /** 重要性排名：1=最著名，2=中等，3=次要（用于在不过载前提下筛选） */
  rank: number
  /** 一条或多条折线；每条折线是一串方位/高度点（已投影到观测时刻地平坐标） */
  polylines: Array<Array<{ azimuth: number; altitude: number }>>
}

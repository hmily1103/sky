import { SkyData } from '../types/sky'
import { createRng } from './prng'
import { kelvinToRgb } from './color'
import { generateHorizon, HorizonProfile } from './horizon'
import { CONFIG } from '../config/animationConfig'

// 渲染层所需的缓冲数据（纯数值，交给 Three.js 使用）
export interface StarBuffers {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  reveals: Float32Array
  phases: Float32Array
  /** 逐顶点闪烁权重：1=正常闪烁，0=不闪烁（银河带用 0 保持柔静） */
  twinkles: Float32Array
  /** 首星锚点标记：1=那夜最亮的星（开场第一颗点亮，并有提示音），0=普通 */
  heros: Float32Array
}

function allocBuffers(n: number): StarBuffers {
  return {
    positions: new Float32Array(n * 3),
    colors: new Float32Array(n * 3),
    sizes: new Float32Array(n),
    reveals: new Float32Array(n),
    phases: new Float32Array(n),
    twinkles: new Float32Array(n),
    heros: new Float32Array(n),
  }
}

export interface HorizonGeometryData {
  positions: Float32Array
  index: Uint16Array
  profile: HorizonProfile
}

export interface BuiltSky {
  main: StarBuffers
  galaxy: StarBuffers
  dust: StarBuffers
  horizon: HorizonGeometryData
  /** 始终存在的星尘（Scene 1 背景） */
  ambient: Float32Array
  /** 真实星座连线（IAU 星座形状，按观测时刻投影的 LineSegments 顶点序列） */
  constellationLines: Float32Array
  /** 调试信息，便于页面明确标识“视觉模拟” */
  meta: {
    seed: string
    terrain: string
    mainCount: number
  }
}

/**
 * 单一坐标约定（spec §9.1）：方位角/高度角 → 场景三维坐标。
 * 约定：北=az0→+Z，东=az90→+X，南=az180→-Z，西=az270→-X；高度角 90°=天顶(+Y)，0°=地平线。
 * 全项目统一使用本方法，禁止在多个组件中重复坐标换算。
 */
export function horizontalToScenePosition(
  azimuthDeg: number,
  altitudeDeg: number,
  radius: number,
): [number, number, number] {
  const az = (azimuthDeg * Math.PI) / 180
  const alt = (altitudeDeg * Math.PI) / 180
  return [
    radius * Math.cos(alt) * Math.sin(az),
    radius * Math.sin(alt),
    radius * Math.cos(alt) * Math.cos(az),
  ]
}

// 历史别名，保持内部调用一致
const azAltToVec = horizontalToScenePosition

export interface BuildOptions {
  isMobile: boolean
  reducedMotion: boolean
}

export function buildSkyScene(skyData: SkyData, opts: BuildOptions): BuiltSky {
  const { objects, input } = skyData
  const timeKey = input.time && input.time.length >= 5 ? input.time : '21:00'
  const seed = `${input.date}|${timeKey}|${input.locationName}`
  const R = CONFIG.sphereRadius

  // ---------- 主星（含行星）：galaxy 走独立缓冲，这里排除 ----------
  const starPlanet = objects.filter((o) => o.type !== 'galaxy')
  const sorted = [...starPlanet].sort((a, b) => a.magnitude - b.magnitude)
  const mainCount = Math.min(
    sorted.length,
    opts.isMobile ? CONFIG.stars.mobileMain : CONFIG.stars.desktopMain,
  )
  const mainTop = sorted.slice(0, mainCount)

  const main = allocBuffers(mainCount)

  const revealEnd = CONFIG.reveal.mainRevealEnd
  // 首星锚点：那夜最亮的星（isHero）第一颗点亮并单独停留片刻，其余星在其后“先快后慢”地浮现。
  let heroIndex = 0
  for (let i = 0; i < mainCount; i++) {
    if (mainTop[i].isHero) {
      heroIndex = i
      break
    }
  }
  const nonHero: number[] = []
  for (let i = 0; i < mainCount; i++) if (i !== heroIndex) nonHero.push(i)
  const heroSolo = 2.4 // 首星单独停留秒数
  const span = Math.max(0.1, revealEnd - heroSolo)
  const nh = nonHero.length

  for (let i = 0; i < mainCount; i++) {
    const o = mainTop[i]
    const [x, y, z] = azAltToVec(o.azimuth, o.altitude, R)
    main.positions[i * 3] = x
    main.positions[i * 3 + 1] = y
    main.positions[i * 3 + 2] = z

    const [r, g, b] = kelvinToRgb(o.colorTemperature ?? 5800)
    // 亮度随星等衰减：亮星更实，暗星更弱
    const t = Math.min(1, Math.max(0, (o.magnitude + 3) / 10))
    const bright = 1 - 0.45 * t
    main.colors[i * 3] = r * bright
    main.colors[i * 3 + 1] = g * bright
    main.colors[i * 3 + 2] = b * bright

    // 尺寸：亮星大、暗星小
    main.sizes[i] =
      CONFIG.stars.sizeMax - t * (CONFIG.stars.sizeMax - CONFIG.stars.sizeMin)

    // 闪烁相位：用黄金比散布，确定且均匀
    main.phases[i] = (i * 0.6180339887) % 1
    main.twinkles[i] = 1
    // 默认非首星；首星在下方统一赋值
    main.reveals[i] = 0
    main.heros[i] = 0
  }
  // 首星：第 0 秒点亮，并单独停留 heroSolo 秒
  main.reveals[heroIndex] = 0
  main.heros[heroIndex] = 1
  // 其余星：自 heroSolo 秒起，按亮度顺序“先快后慢、密度递增”浮现
  for (let k = 0; k < nh; k++) {
    const i = nonHero[k]
    const frac = nh > 1 ? k / (nh - 1) : 0
    main.reveals[i] = heroSolo + span * Math.pow(frac, 1.25)
  }

  // ---------- 银河带（真实银道面定位，来自 skyData.objects 中 type==='galaxy'） ----------
  const gAll = objects.filter((o) => o.type === 'galaxy')
  // 移动端按预算抽稀，保持空间分布（步进取样）
  const gCap = opts.isMobile ? CONFIG.stars.galaxyMobileCap : CONFIG.stars.galaxyCount
  let gUse = gAll
  if (gAll.length > gCap) {
    const step = Math.ceil(gAll.length / gCap)
    gUse = gAll.filter((_, i) => i % step === 0)
  }
  const gCount = gUse.length
  const galaxy = allocBuffers(gCount)
  for (let i = 0; i < gCount; i++) {
    const o = gUse[i]
    const [x, y, z] = azAltToVec(o.azimuth, o.altitude, R)
    galaxy.positions[i * 3] = x
    galaxy.positions[i * 3 + 1] = y
    galaxy.positions[i * 3 + 2] = z

    // 亮度由数据层给出的相对亮度(0–1)决定：银心更亮、外缘更暗
    const bright = 0.42 + 0.58 * Math.min(1, Math.max(0, o.magnitude))
    const [r, g, b] = kelvinToRgb(o.colorTemperature ?? 6200)
    galaxy.colors[i * 3] = r * bright
    galaxy.colors[i * 3 + 1] = g * bright
    galaxy.colors[i * 3 + 2] = b * bright

    galaxy.sizes[i] = CONFIG.stars.galaxySize * (0.7 + 1.3 * bright)
    // 银河带在星空之后、安静停顿前淡入；按数组顺序由一端向另一端展开
    galaxy.reveals[i] =
      CONFIG.reveal.galaxyStart +
      (gCount > 1 ? i / (gCount - 1) : 0) * (CONFIG.reveal.galaxyEnd - CONFIG.reveal.galaxyStart)
    galaxy.phases[i] = (i * 0.6180339887) % 1
    galaxy.twinkles[i] = 0 // 银河带不闪烁，保持柔静
  }

  // ---------- 远景星尘 ----------
  const dCount = CONFIG.stars.dustCount
  const drng = createRng(`${seed}|dust`)
  const dust = allocBuffers(dCount)
  for (let i = 0; i < dCount; i++) {
    // 均匀分布在球内（略偏外圈）
    const u = drng()
    const v = drng()
    const theta = u * Math.PI * 2
    const phi = Math.acos(2 * v - 1)
    const rr = R * (0.82 + 0.18 * drng())
    dust.positions[i * 3] = rr * Math.sin(phi) * Math.cos(theta)
    dust.positions[i * 3 + 1] = rr * Math.cos(phi)
    dust.positions[i * 3 + 2] = rr * Math.sin(phi) * Math.sin(theta)
    const [r, g, b] = kelvinToRgb(6500 + (drng() - 0.5) * 1500)
    dust.colors[i * 3] = r * 0.6
    dust.colors[i * 3 + 1] = g * 0.6
    dust.colors[i * 3 + 2] = b * 0.6
    dust.sizes[i] = CONFIG.stars.dustSize * (0.6 + 0.8 * drng())
    dust.reveals[i] = 10 + drng() * 4
    dust.phases[i] = (i * 0.6180339887) % 1
    dust.twinkles[i] = 1
  }

  // ---------- 地平线剪影（环绕一圈的竖直墙） ----------
  const horizonProfile = generateHorizon(input.locationName, 180)
  const hSamples = horizonProfile.points.length
  const hR = CONFIG.horizonRadius
  const hPos = new Float32Array(hSamples * 2 * 3)
  for (let i = 0; i < hSamples; i++) {
    const p = horizonProfile.points[i]
    const bottom = azAltToVec(p.azimuth, -1.5, hR) // 地平线以下一点
    const top = azAltToVec(p.azimuth, p.altitude, hR)
    hPos[i * 6 + 0] = bottom[0]
    hPos[i * 6 + 1] = bottom[1]
    hPos[i * 6 + 2] = bottom[2]
    hPos[i * 6 + 3] = top[0]
    hPos[i * 6 + 4] = top[1]
    hPos[i * 6 + 5] = top[2]
  }
  const hIdx: number[] = []
  for (let i = 0; i < hSamples - 1; i++) {
    const a = i * 2
    const b = i * 2 + 1
    const c = (i + 1) * 2
    const d = (i + 1) * 2 + 1
    hIdx.push(a, b, c, b, d, c)
  }
  const horizon: HorizonGeometryData = {
    positions: hPos,
    index: new Uint16Array(hIdx),
    profile: horizonProfile,
  }

  // ---------- 始终存在的星尘（Scene 1 背景，缓慢漂移） ----------
  const aCount = CONFIG.ambientDust.count
  const arng = createRng(`${seed}|ambient`)
  const ambient = new Float32Array(aCount * 3)
  for (let i = 0; i < aCount; i++) {
    const u = arng()
    const v = arng()
    const theta = u * Math.PI * 2
    const phi = Math.acos(2 * v - 1)
    const rr = CONFIG.ambientDust.radius * (0.4 + 0.6 * arng())
    ambient[i * 3] = rr * Math.sin(phi) * Math.cos(theta)
    ambient[i * 3 + 1] = rr * Math.cos(phi)
    ambient[i * 3 + 2] = rr * Math.sin(phi) * Math.sin(theta)
  }

  // ---------- 真实星座连线（IAU 星座形状，按观测时刻投影为 LineSegments） ----------
  const cl = skyData.constellationLines ?? []
  const clPts: number[] = []
  for (const c of cl) {
    for (const poly of c.polylines) {
      for (let k = 0; k < poly.length - 1; k++) {
        const a = azAltToVec(poly[k].azimuth, poly[k].altitude, R * 0.99)
        const b = azAltToVec(poly[k + 1].azimuth, poly[k + 1].altitude, R * 0.99)
        clPts.push(a[0], a[1], a[2], b[0], b[1], b[2])
      }
    }
  }
  const constellationLines = new Float32Array(clPts)

  return {
    main,
    galaxy,
    dust,
    horizon,
    ambient,
    constellationLines,
    meta: { seed, terrain: horizonProfile.terrain, mainCount },
  }
}

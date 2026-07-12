// ============================================================
// 动画与渲染参数集中配置
// 调参只改这里，不散落在组件内部。
// ============================================================

export const CONFIG = {
  /** 星空球半径（相机置于球心，向外看） */
  sphereRadius: 600,
  /** 地平线剪影所在半径（略小于星空球，制造前后景深） */
  horizonRadius: 560,

  /** 星星数量（渲染层按设备裁剪；数据层生成更多，这里只是上界） */
  stars: {
    desktopMain: 2400,
    mobileMain: 1100,
    /** 银河带点上限：桌面端为抽稀阈值（数据层约生成数千点），移动端为预算上限 */
    galaxyCount: 6000,
    galaxyMobileCap: 1400,
    dustCount: 1600,
    /** 主星点尺寸范围（像素基准，最终会乘尺寸系数与透视衰减） */
    sizeMin: 1.4,
    sizeMax: 4.6,
    /** 银河带基础点尺寸（最终会按该点相对亮度再放大，形成柔光带） */
    galaxySize: 2.4,
    dustSize: 1.1,
  },

  /** 逐颗点亮（Scene 3）节奏 */
  reveal: {
    /** 单颗星淡入时长（秒） */
    fadeDuration: 1.8,
    /** 主星 reveal 时间分布终点（秒），配合下方曲线形成“先快后慢、密度递增” */
    mainRevealEnd: 12,
    /** 银河 / 星尘 reveal 区间（秒） */
    galaxyStart: 9.5,
    galaxyEnd: 14,
    /** 完整天空形成后保持的安静停顿（秒） */
    holdSeconds: 4,
  },

  /** 时间倒流（Scene 2） */
  rewind: {
    /** 年份倒退时长：根据跨度在 min~max 间插值 */
    minDuration: 5.5,
    maxDuration: 9,
    /** 出生年距今跨度大于此值时取 maxDuration */
    maxSpan: 80,
    /** 隧道残影 ghost 层数 */
    ghosts: 4,
  },

  /** 相机 / 视角（鼠标拖动“看”而非轨道环绕，限制范围避免迷失） */
  camera: {
    fov: 62,
    near: 0.1,
    far: 3000,
    /** 相机是否允许自由拖动/缩放。false = 锁死策展英雄角度；true = 自由交互 */
    interactive: true,
    /** 策展英雄角度（世界初始朝向，弧度）：轻微俯视、正前方偏上 */
    heroAngle: { x: -0.12, y: 0 },
    /** 限制可旋转范围（相对于初始朝向的偏移，弧度） */
    minPolar: -0.34, // 向上看的最大幅度
    maxPolar: 0.16, // 向下看的最大幅度
    azimuthRange: Math.PI * 0.62, // 左右各可转的范围
    dampingFactor: 0.075, // 阻尼：越小越"黏"
    rotateSpeed: 0.0032, // 拖动灵敏度
    /** 轻微缩放范围（缩放 = 整体放大率，非移动相机） */
    zoomMin: 0.7,
    zoomMax: 1.5,
    /** 空闲时天空极缓慢自转（真实星空会转），克制程度 */
    idleDrift: 0.0065,
  },

  /** 收尾拉远（Scene 6） */
  ending: {
    duration: 6.5,
    shrinkTo: 0.55, // 星空整体缩小到 0.55
    fadeTo: 0.0, // 透明度淡出
  },

  /** 始终存在的少量“星尘”（Scene 1 背景用，缓慢漂移） */
  ambientDust: {
    count: 130,
    radius: 220,
    opacity: 0.35,
  },
}

/** 是否移动端（竖屏手机） */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window
}

/** 是否尊重“减少动态效果”系统偏好 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

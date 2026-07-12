// 近似黑体色温 → RGB（0–1）
// 用于把星星的 colorTemperature 映射成渲染颜色，制造少量色温差异。
export function kelvinToRgb(kelvin: number): [number, number, number] {
  const t = kelvin / 100
  let r: number
  let g: number
  let b: number
  if (t <= 66) {
    r = 255
    g = 99.4708025861 * Math.log(t) - 161.1195681661
    if (t <= 19) b = 0
    else b = 138.5177312231 * Math.log(t - 10) - 305.0447927307
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592)
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492)
    b = 255
  }
  const clamp = (x: number) => Math.min(255, Math.max(0, x)) / 255
  return [clamp(r), clamp(g), clamp(b)]
}

/**
 * B-V 色指数 → 有效色温（K）。
 * 采用 Ballesteros (2012) 经验公式：T = 4600 * (1/(0.92·bv+1.7) + 1/(0.92·bv+0.62))。
 * 无有效色指数时回退到类太阳 ~5770K。
 */
export function bvToKelvin(bv: number): number {
  if (!isFinite(bv) || bv <= 0) return 5770
  const t = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62))
  return Math.min(40000, Math.max(2000, t))
}

// 赤经单位换算。
//
// 背景（严重 bug 修复）：astronomy-engine 的 Horizon(date, observer, ra, dec, refraction)
// 要求 ra 为「恒星时小时」(sidereal hours, 0–24)，dec 为「度」。
// 但本项目的星表（starCatalog.json）与星座连线（constellations.lines.json，d3-celestial 格式）
// 里的赤经都是「角度制」(-180°–180°)。若把角度值直接传给 Horizon()，整片天空会被投影到
// 错误的方位/高度——看起来仍像星空，却不是那一刻真实的天空，违反“真实高于浪漫”。
//
// 注意：solarSystem.ts 用的是 astronomy-engine 自己返回的 eq.ra（已是小时制），不要经过本函数。

/** 角度制赤经(度) → 恒星时小时。先归一化到 [0°,360°) 再 /15。 */
export function raDegToHours(raDeg: number): number {
  const normalized = ((raDeg % 360) + 360) % 360
  return normalized / 15
}

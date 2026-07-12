// 月亮：真实圆盘月相渲染。
// 月相形状复用界面层 DataPanel 已验证的几何（外圆弧 + 内椭圆弧围成亮区），
// 用 Canvas 2D 预渲染为纹理，避免手写月相 shader 的符号判定风险；
// 暗面叠加极淡“地球反照”冷光，亮面为月灰并带轻微径向高光（克制）。
// 以 THREE.Sprite 渲染，自动面向相机，并随 worldRef 一起旋转。

import * as THREE from 'three'
import type { MoonBuffers } from '../lib/skyBuilder'
import { CONFIG } from '../config/animationConfig'

function makeMoonTexture(frac: number, waxing: boolean): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2
  const cy = size / 2
  const R = size * 0.46

  // 暗面：地球反照，极淡冷灰（新月时月亮几乎不可见，符合真实）
  const darkGrad = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R)
  darkGrad.addColorStop(0, 'rgba(42,48,62,0.55)')
  darkGrad.addColorStop(1, 'rgba(20,24,34,0.32)')
  ctx.fillStyle = darkGrad
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fill()

  // 亮面（月灰，带轻微径向高光模拟受光）
  if (frac > 0.02) {
    const litCol = '#d7dce6'
    if (frac >= 0.98) {
      const g = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.25, R * 0.1, cx, cy, R)
      g.addColorStop(0, '#eef1f6')
      g.addColorStop(1, litCol)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fill()
    } else {
      const phaseAngle = Math.acos(Math.max(-1, Math.min(1, 2 * frac - 1)))
      const rxAbs = Math.abs(R * Math.cos(phaseAngle))
      const outerSweep = waxing ? 1 : 0
      const termSweep = frac >= 0.5 ? outerSweep : 1 - outerSweep
      const d = `M ${cx} ${cy - R} A ${R} ${R} 0 0 ${outerSweep} ${cx} ${cy + R} A ${rxAbs} ${R} 0 0 ${termSweep} ${cx} ${cy - R} Z`
      const g = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.25, R * 0.1, cx, cy, R)
      g.addColorStop(0, '#eef1f6')
      g.addColorStop(1, litCol)
      ctx.fillStyle = g
      ctx.fill(new Path2D(d))
    }
  }

  // 边缘羽化：整月盘外圈 2px 渐隐，避免硬边（destination-in 径向蒙版）
  const mask = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R)
  mask.addColorStop(0, 'rgba(0,0,0,1)')
  mask.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.globalCompositeOperation = 'destination-in'
  ctx.fillStyle = mask
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'

  const tex = new THREE.CanvasTexture(canvas)
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  return tex
}

export function makeMoonSprite(moon: MoonBuffers): THREE.Sprite {
  const tex = makeMoonTexture(moon.phaseFrac, moon.waxing)
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
  })
  const sp = new THREE.Sprite(mat)
  sp.position.set(moon.position[0], moon.position[1], moon.position[2])
  const s = CONFIG.stars.moonSize
  sp.scale.set(s, s, 1)
  sp.renderOrder = 2
  sp.frustumCulled = false
  return sp
}

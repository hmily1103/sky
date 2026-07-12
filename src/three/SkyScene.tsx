import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { buildSkyScene, StarBuffers, DeepSkyBuffers, GlowBuffers, horizontalToScenePosition } from '../lib/skyBuilder'
import { SkyData } from '../types/sky'
import { CONFIG } from '../config/animationConfig'
import { starVertexShader, starFragmentShader } from './starShader'
import { deepSkyVertexShader, deepSkyFragmentShader } from './deepSkyShader'
import { glowVertexShader, glowFragmentShader } from './glowShader'

export type Phase = 'input' | 'rewind' | 'rising' | 'info' | 'gaze' | 'ending'

interface SkySceneProps {
  skyData: SkyData
  phase: Phase
  /** 真实星座连线（IAU 星座形状）的开关节 */
  showConstellations: boolean
  /** 方向标记 N/E/S/W：默认隐藏，打开“信息”后显示（spec §11） */
  showDirections: boolean
  isMobile: boolean
  reducedMotion: boolean
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** 生成带文字的方向标记精灵（canvas 纹理） */
function makeLabelSprite(text: string): THREE.Sprite {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, size, size)
  ctx.font = 'bold 72px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#c9b78f'
  ctx.shadowColor = 'rgba(0,0,0,0.8)'
  ctx.shadowBlur = 8
  ctx.fillText(text, size / 2, size / 2)
  const tex = new THREE.CanvasTexture(canvas)
  tex.minFilter = THREE.LinearFilter
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(mat)
  const s = CONFIG.sphereRadius * 0.06
  sprite.scale.set(s, s, 1)
  return sprite
}

function makeStarGeometry(b: StarBuffers): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(b.positions, 3))
  g.setAttribute('aColor', new THREE.BufferAttribute(b.colors, 3))
  g.setAttribute('aSize', new THREE.BufferAttribute(b.sizes, 1))
  g.setAttribute('aReveal', new THREE.BufferAttribute(b.reveals, 1))
  g.setAttribute('aPhase', new THREE.BufferAttribute(b.phases, 1))
  g.setAttribute('aTwk', new THREE.BufferAttribute(b.twinkles, 1))
  g.setAttribute('aHero', new THREE.BufferAttribute(b.heros, 1))
  return g
}

export default function SkyScene({
    skyData,
    phase,
    showConstellations,
    showDirections,
  isMobile,
  reducedMotion,
}: SkySceneProps) {
  const { gl } = useThree()

  // ---------- 构建几何与材质（按输入与设备裁剪） ----------
  const built = useMemo(
    () => buildSkyScene(skyData, { isMobile, reducedMotion }),
    [skyData, isMobile, reducedMotion],
  )

  const mainGeo = useMemo(() => makeStarGeometry(built.main), [built])
  const galaxyGeo = useMemo(() => makeStarGeometry(built.galaxy), [built])
  const dustGeo = useMemo(() => makeStarGeometry(built.dust), [built])

  const horizonGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(built.horizon.positions, 3))
    g.setIndex(new THREE.BufferAttribute(built.horizon.index, 1))
    g.computeVertexNormals()
    return g
  }, [built])

  const constGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(built.constellationLines, 3))
    // 仅开发期：暴露真实星座连线段数，供无头冒烟测试断言（不进生产包）
    if (import.meta.env.DEV) {
      const segs = built.constellationLines.length / 6 // 每段 2 顶点 × 3 分量
      ;(window as unknown as { __SKY_DEBUG__?: Record<string, unknown> }).__SKY_DEBUG__ = {
        ...((window as unknown as { __SKY_DEBUG__?: Record<string, unknown> }).__SKY_DEBUG__ || {}),
        constellationSegments: segs,
      }
    }
    return g
  }, [built])

  const ambientGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(built.ambient, 3))
    return g
  }, [built])

  // 出生城市天际线金色描边（连续折线）。无天际线城市（空数组）不渲染。
  const skylineEdgeGeo = useMemo(() => {
    if (!built.skylineEdge || built.skylineEdge.length < 6) return null
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(built.skylineEdge, 3))
    // 仅开发期：暴露天际线描边点数，供无头冒烟测试断言（不进生产包）
    if (import.meta.env.DEV) {
      const pts = built.skylineEdge.length / 3
      const dbg = (window as unknown as { __SKY_DEBUG__?: Record<string, unknown> }).__SKY_DEBUG__ || {}
      ;(window as unknown as { __SKY_DEBUG__?: Record<string, unknown> }).__SKY_DEBUG__ = {
        ...dbg,
        skylineEdgePoints: pts,
      }
    }
    return g
  }, [built])

  const pixelRatio = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)

  // 深空天体（梅西耶）柔和图标几何：位置 + 顶点色 + 尺寸 + 位置角 + 拉伸比
  const deepSkyGeo = useMemo(() => {
    const b = built.deepSky
    if (!b || b.count === 0) return null
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(b.positions, 3))
    g.setAttribute('aColor', new THREE.BufferAttribute(b.colors, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(b.sizes, 1))
    g.setAttribute('aPa', new THREE.BufferAttribute(b.pa, 1))
    g.setAttribute('aStretch', new THREE.BufferAttribute(b.stretch, 1))
    // 仅开发期：暴露深空天体数量，供无头冒烟测试断言
    if (import.meta.env.DEV) {
      const dbg = (window as unknown as { __SKY_DEBUG__?: Record<string, unknown> }).__SKY_DEBUG__ || {}
      ;(window as unknown as { __SKY_DEBUG__?: Record<string, unknown> }).__SKY_DEBUG__ = {
        ...dbg,
        deepSkyCount: b.count,
      }
    }
    return g
  }, [built])

  // 亮星辉光几何：位置 + 顶点色 + 尺寸
  const glowGeo = useMemo(() => {
    const b = built.glow
    if (!b || b.count === 0) return null
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(b.positions, 3))
    g.setAttribute('aColor', new THREE.BufferAttribute(b.colors, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(b.sizes, 1))
    if (import.meta.env.DEV) {
      const dbg = (window as unknown as { __SKY_DEBUG__?: Record<string, unknown> }).__SKY_DEBUG__ || {}
      ;(window as unknown as { __SKY_DEBUG__?: Record<string, unknown> }).__SKY_DEBUG__ = {
        ...dbg,
        glowCount: b.count,
      }
    }
    return g
  }, [built])

  const makeSoftMat = (
    vert: string,
    frag: string,
    opacity: number,
  ) =>
    new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: pixelRatio },
        uSizeScale: { value: 1 },
        uOpacity: { value: opacity },
        uReveal: { value: 0 },
      },
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    })

  const deepSkyMat = useMemo(() => makeSoftMat(deepSkyVertexShader, deepSkyFragmentShader, CONFIG.deepsky.baseOpacity), [pixelRatio])
  const glowMat = useMemo(() => makeSoftMat(glowVertexShader, glowFragmentShader, CONFIG.stars.glowOpacity), [pixelRatio])

  const makeStarMat = (sizeScale: number, opacity: number) =>
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uFadeDur: { value: reducedMotion ? 0.5 : CONFIG.reveal.fadeDuration },
        uPixelRatio: { value: pixelRatio },
        uSizeScale: { value: sizeScale },
        uTwinkle: { value: reducedMotion ? 0 : 1 },
        uOpacity: { value: opacity },
      },
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

  const mainMat = useMemo(() => makeStarMat(isMobile ? 2.2 : 3.2, 1), [isMobile, reducedMotion])
  const galaxyMat = useMemo(() => makeStarMat(isMobile ? 1.6 : 2.4, 0.85), [isMobile, reducedMotion])
  const dustMat = useMemo(() => makeStarMat(isMobile ? 1.0 : 1.4, 0.5), [isMobile, reducedMotion])

  const horizonMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#04060d'),
        transparent: true,
        opacity: 0.96,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  )

  const constMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color('#c9b78f'),
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      }),
    [],
  )

  const ambientMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: new THREE.Color('#8895b3'),
        size: 2.2,
        sizeAttenuation: true,
        transparent: true,
        opacity: CONFIG.ambientDust.opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )

  // 天际线金色描边材质（烫金印章感）：additive 让金线在深色剪影上"发光"
  const skylineEdgeMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(CONFIG.skyline.goldColor),
        transparent: true,
        opacity: CONFIG.skyline.edgeOpacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )

  // 用 THREE.Line 对象渲染连续折线（避免 JSX <line> 与 SVG 元素类型冲突）
  const skylineEdgeLine = useMemo(() => {
    if (!skylineEdgeGeo) return null
    const line = new THREE.Line(skylineEdgeGeo, skylineEdgeMat)
    line.renderOrder = 3
    line.frustumCulled = false
    return line
  }, [skylineEdgeGeo, skylineEdgeMat])

  // ---------- 方向标记 N/E/S/W（默认隐藏，信息层开启时显示） ----------
  const directionsGroup = useMemo(() => {
    const g = new THREE.Group()
    const r = CONFIG.sphereRadius * 0.99
    const marks: Array<[string, number]> = [
      ['N', 0],
      ['E', 90],
      ['S', 180],
      ['W', 270],
    ]
    for (const [label, az] of marks) {
      const [x, y, z] = horizontalToScenePosition(az, 1, r)
      const sp = makeLabelSprite(label)
      sp.position.set(x, y, z)
      g.add(sp)
    }
    g.visible = false
    return g
  }, [])

  const dirMats = useMemo(
    () => directionsGroup.children.map((c) => (c as THREE.Sprite).material as THREE.SpriteMaterial),
    [directionsGroup],
  )

  // 方向标记可见性
  useEffect(() => {
    directionsGroup.visible = showDirections
  }, [directionsGroup, showDirections])

  // 释放旧资源，避免内存泄漏
  useEffect(() => {
    return () => {
      ;[mainGeo, galaxyGeo, dustGeo, horizonGeo, constGeo, ambientGeo].forEach((g) => g.dispose())
      skylineEdgeGeo?.dispose()
      deepSkyGeo?.dispose()
      glowGeo?.dispose()
      ;[mainMat, galaxyMat, dustMat, horizonMat, constMat, ambientMat, skylineEdgeMat, deepSkyMat, glowMat].forEach(
        (m) => m.dispose(),
      )
      dirMats.forEach((m) => {
        m.map?.dispose()
        m.dispose()
      })
    }
  }, [mainGeo, galaxyGeo, dustGeo, horizonGeo, ambientGeo, mainMat, galaxyMat, dustMat, horizonMat, ambientMat, dirMats, skylineEdgeGeo, skylineEdgeMat, deepSkyGeo, glowGeo, deepSkyMat, glowMat])

  // ---------- 交互与动画状态 ----------
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  const worldRef = useRef<THREE.Group>(null)
  const ambientRef = useRef<THREE.Group>(null)

  const targetRot = useRef({ ...CONFIG.camera.heroAngle })
  const currentRot = useRef({ ...CONFIG.camera.heroAngle })
  const targetZoom = useRef(1)
  const zoomScale = useRef(1)
  const revealStart = useRef<number | null>(null)
  const endingState = useRef({ scale: 1, fade: 1 })
  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })
  const lookEnabled = useRef(false)

  // 相位切换：管理点亮时钟与收尾动画
  useEffect(() => {
    lookEnabled.current = phase !== 'input' && phase !== 'rewind'
    if (phase === 'rising') {
      revealStart.current = performance.now() / 1000
    } else if (phase === 'input' || phase === 'rewind') {
      revealStart.current = null
      endingState.current = { scale: 1, fade: 1 }
    }
    if (phase === 'ending') {
      const tw = gsap.to(endingState.current, {
        scale: CONFIG.ending.shrinkTo,
        fade: CONFIG.ending.fadeTo,
        duration: CONFIG.ending.duration,
        ease: 'power2.inOut',
      })
      return () => {
        tw.kill()
      }
    }
  }, [phase])

  // 原生指针 / 滚轮监听（在 canvas 元素上拖动“看”星空）
  useEffect(() => {
    if (!CONFIG.camera.interactive) return // MVP：相机锁死英雄角度，不挂自由交互
    const el = gl.domElement
    const C = CONFIG.camera
    const onDown = (e: PointerEvent) => {
      dragging.current = true
      last.current = { x: e.clientX, y: e.clientY }
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging.current || !lookEnabled.current) return
      const dx = e.clientX - last.current.x
      const dy = e.clientY - last.current.y
      last.current = { x: e.clientX, y: e.clientY }
      targetRot.current.y = clamp(targetRot.current.y - dx * C.rotateSpeed, -C.azimuthRange / 2, C.azimuthRange / 2)
      targetRot.current.x = clamp(targetRot.current.x - dy * C.rotateSpeed, C.minPolar, C.maxPolar)
    }
    const onUp = () => {
      dragging.current = false
    }
    const onWheel = (e: WheelEvent) => {
      if (!lookEnabled.current) return
      e.preventDefault()
      const dir = e.deltaY > 0 ? 1 : -1
      targetZoom.current = clamp(targetZoom.current * (1 + dir * 0.08), C.zoomMin, C.zoomMax)
    }
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      el.removeEventListener('wheel', onWheel)
    }
  }, [gl])

  // 每帧更新
  useFrame((_, dt) => {
    const C = CONFIG.camera
    // 空闲时极缓慢自转（真实星空会转），但限制范围避免迷失；锁死时不做
    if (!dragging.current && lookEnabled.current && !reducedMotion && CONFIG.camera.interactive) {
      targetRot.current.y = clamp(targetRot.current.y + C.idleDrift * dt, -C.azimuthRange / 2, C.azimuthRange / 2)
    }
    currentRot.current.x += (targetRot.current.x - currentRot.current.x) * C.dampingFactor
    currentRot.current.y += (targetRot.current.y - currentRot.current.y) * C.dampingFactor
    if (worldRef.current) {
      worldRef.current.rotation.x = currentRot.current.x
      worldRef.current.rotation.y = currentRot.current.y
      zoomScale.current += (targetZoom.current - zoomScale.current) * C.dampingFactor
      worldRef.current.scale.setScalar(zoomScale.current * endingState.current.scale)
    }

    const now = performance.now() / 1000
    const elapsed = revealStart.current != null ? now - revealStart.current : 0
    mainMat.uniforms.uTime.value = elapsed
    galaxyMat.uniforms.uTime.value = elapsed
    dustMat.uniforms.uTime.value = elapsed

    const f = endingState.current.fade
    mainMat.uniforms.uOpacity.value = 1 * f
    galaxyMat.uniforms.uOpacity.value = 0.85 * f
    dustMat.uniforms.uOpacity.value = 0.5 * f
    horizonMat.opacity = 0.95 * f
    constMat.opacity = 0.32 * f
    skylineEdgeMat.opacity = CONFIG.skyline.edgeOpacity * f
    // 深空天体与亮星辉光：在星空形成后随点亮淡入；输入/倒流界面隐藏（保证黑场再亮）
    const skyVis = phaseRef.current === 'input' || phaseRef.current === 'rewind' ? 0 : 1
    const reveal = clamp(elapsed / 3, 0, 1)
    if (deepSkyMat) {
      deepSkyMat.uniforms.uReveal.value = reveal
      deepSkyMat.uniforms.uOpacity.value = CONFIG.deepsky.baseOpacity * f * skyVis
    }
    if (glowMat) {
      glowMat.uniforms.uReveal.value = reveal
      glowMat.uniforms.uOpacity.value = CONFIG.stars.glowOpacity * f * skyVis
    }
    // 星尘只在输入/倒流界面作为背景；星空形成后隐藏，保证“完全变黑”再点亮
    const ambVis = phaseRef.current === 'input' || phaseRef.current === 'rewind' ? 1 : 0
    ambientMat.opacity = CONFIG.ambientDust.opacity * ambVis * f

    if (ambientRef.current) ambientRef.current.rotation.y += dt * 0.012
  })

  return (
    <>
      <color attach="background" args={['#05070f']} />
      <group ref={worldRef}>
        {deepSkyGeo && <points args={[deepSkyGeo, deepSkyMat]} />}
        {glowGeo && <points args={[glowGeo, glowMat]} />}
        <points args={[mainGeo, mainMat]} />
        <points args={[galaxyGeo, galaxyMat]} />
        <points args={[dustGeo, dustMat]} />
        <mesh args={[horizonGeo, horizonMat]} />
        <lineSegments visible={showConstellations} args={[constGeo, constMat]} />
        {skylineEdgeLine && <primitive object={skylineEdgeLine} />}
        <primitive object={directionsGroup} />
      </group>
      <group ref={ambientRef}>
        <points args={[ambientGeo, ambientMat]} />
      </group>
    </>
  )
}

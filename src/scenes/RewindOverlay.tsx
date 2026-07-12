import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { CONFIG } from '../config/animationConfig'

interface RewindOverlayProps {
  birthYear: number
  onComplete: () => void
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export default function RewindOverlay({ birthYear, onComplete }: RewindOverlayProps) {
  const yearRefs = useRef<(HTMLSpanElement | null)[]>([])
  const hintRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const startYear = new Date().getFullYear()
    const span = Math.max(1, startYear - birthYear)
    const R = CONFIG.rewind
    const duration = lerp(R.minDuration, R.maxDuration, clamp(span / R.maxSpan, 0, 1))

    const state = { p: 0 }
    const ghosts = R.ghosts

    const tl = gsap.to(state, {
      p: 1,
      duration,
      ease: 'power2.out', // 先快后慢：越接近出生年份越慢
      onUpdate: () => {
        const p = state.p
        const speedBlur = (1 - p) * 3.2 // 开头最快 → 残影最强
        const baseFont = 'clamp(64px, 14vw, 150px)'
        for (let g = 0; g < ghosts; g++) {
          const el = yearRefs.current[g]
          if (!el) continue
          const gp = clamp(p - g * 0.05, 0, 1)
          const yr = Math.round(startYear - gp * span)
          el.textContent = String(yr)
          el.style.fontSize = baseFont
          if (g === 0) {
            el.style.transform = `translate(-50%, calc(-50% + ${(1 - p) * 26}px))`
            el.style.opacity = '1'
            el.style.filter = `blur(${speedBlur}px)`
          } else {
            // 后方的“回声”年份，更小更暗、向内收，形成时间隧道景深
            el.style.transform = `translate(-50%, -50%) translateZ(${-g * 90}px) scale(${1 - g * 0.12})`
            el.style.opacity = String(Math.max(0, 0.4 - g * 0.1))
            el.style.filter = `blur(${(1 - gp) * 1.4}px)`
          }
        }
        if (hintRef.current) {
          hintRef.current.style.opacity = String(clamp(0.2 + p * 0.6, 0, 0.85))
        }
      },
      onComplete: () => {
        // 画面短暂完全变黑，保留约 1 秒停顿，再进入星空点亮
        gsap.delayedCall(1.0, onComplete)
      },
    })

    return () => {
      tl.kill()
    }
    // 仅在挂载时运行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="overlay rewind-overlay">
      <div className="rewind-tunnel" />
      <div className="rewind-years">
        {Array.from({ length: CONFIG.rewind.ghosts }).map((_, g) => (
          <span
            key={g}
            ref={(el) => {
              yearRefs.current[g] = el
            }}
            className={`year-ghost ${g === 0 ? 'hero' : ''}`}
          />
        ))}
      </div>
      <div className="rewind-hint" ref={hintRef}>
        时间，正在倒流
      </div>
    </div>
  )
}

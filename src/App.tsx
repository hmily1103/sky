import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import SkyScene, { Phase } from './three/SkyScene'
import InputScene from './scenes/InputScene'
import RewindOverlay from './scenes/RewindOverlay'
import InfoOverlay from './scenes/InfoOverlay'
import Controls from './scenes/Controls'
import EndingOverlay from './scenes/EndingOverlay'
import { AmbientAudio } from './lib/audio'
import { generateSky, getRealAstronomicalSky, inferTerrain, terrainLabel } from './lib/skyGenerator'
import { BirthSkyInput, SkyData } from './types/sky'
import { CONFIG, isMobile, prefersReducedMotion } from './config/animationConfig'
import DataPanel from './scenes/DataPanel'

const EMPTY_INPUT: BirthSkyInput = { date: '', locationName: '' }

export default function App() {
  const device = useMemo(() => ({ mobile: isMobile(), reduced: prefersReducedMotion() }), [])
  const riseDuration = device.reduced
    ? 4
    : CONFIG.reveal.mainRevealEnd + CONFIG.reveal.fadeDuration + CONFIG.reveal.holdSeconds
  const infoDuration = device.reduced ? 3 : 7

  const [phase, setPhase] = useState<Phase>('input')
  const [input, setInput] = useState<BirthSkyInput>(EMPTY_INPUT)
  // 初始用占位数据，让输入界面也有“少量星尘缓慢移动”的背景（主星在 reveal 前隐藏）
  const [skyData, setSkyData] = useState<SkyData>(() =>
    generateSky({ date: new Date().toISOString().slice(0, 10), locationName: '北京' }),
  )
  const [showConstellations, setShowConstellations] = useState(false)
  const [showInfo, setShowInfo] = useState(true)
  const [showData, setShowData] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [fallbackNotice, setFallbackNotice] = useState('')
  const [risingNonce, setRisingNonce] = useState(0)

  const audioRef = useRef<AmbientAudio>()
  if (!audioRef.current) audioRef.current = new AmbientAudio()

  const birthYear = useMemo(() => {
    const m = /^(\d{4})/.exec(input.date)
    return m ? parseInt(m[1], 10) : new Date().getFullYear()
  }, [input.date])

  // 阶段推进的计时器
  useEffect(() => {
    if (phase === 'rising') {
      setRisingNonce((n) => n + 1)
      // 首星锚点：那夜最亮的星在第 0 秒点亮，黑场约 1.1s 褪去、星点约 1.8s 淡入；
      // 把提示音定在 ~1.0s，恰好落在“第一颗星亮起”的瞬间。
      const chimeT = setTimeout(() => audioRef.current?.chime(), 1000)
      const toInfo = setTimeout(() => setPhase('info'), riseDuration * 1000)
      return () => {
        clearTimeout(chimeT)
        clearTimeout(toInfo)
      }
    }
    if (phase === 'info') {
      const toGaze = setTimeout(() => setPhase('gaze'), infoDuration * 1000)
      return () => clearTimeout(toGaze)
    }
  }, [phase, riseDuration, infoDuration])

  // 卸载时停止声音，避免泄漏
  useEffect(() => {
    return () => audioRef.current?.stop()
  }, [])

  const handleSubmit = async (data: BirthSkyInput) => {
    setInput(data)
    // 用户手势内启动音频（遵守自动播放限制）
    audioRef.current?.start()
    audioRef.current?.setMuted(!soundOn)
    setFallbackNotice('')
    // 优先用真实天文数据；地点无法解析或计算异常时，显式回退到视觉模拟并提示，绝不伪装成真实天空
    let sky: SkyData
    try {
      sky = await getRealAstronomicalSky(data)
    } catch (e) {
      sky = generateSky(data)
      const msg = e instanceof Error ? e.message : '未知错误'
      setFallbackNotice(`暂时无法完成真实天文计算（${msg}）。已为你展示视觉演示数据，不代表真实星空。`)
    }
    setSkyData(sky)
    setPhase('rewind')
  }

  const handleToggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    audioRef.current?.setMuted(!next)
  }

  const handleReplay = () => {
    // 相同输入 → 相同星空（确定性），直接重新倒流
    setPhase('rewind')
  }

  const handleModify = () => {
    setPhase('input')
  }

  const showInfoBlock = (phase === 'info' || phase === 'gaze') && showInfo

  return (
    <div className="app">
      <div className="canvas-wrap">
        <Canvas
          camera={{ position: [0, 0, 0.001], fov: CONFIG.camera.fov, near: CONFIG.camera.near, far: CONFIG.camera.far }}
          dpr={[1, device.mobile ? 1.5 : 2]}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          style={{ touchAction: 'none' }}
        >
          <SkyScene
            skyData={skyData}
            phase={phase}
            showConstellations={showConstellations}
            showDirections={showInfo && (phase === 'gaze' || phase === 'info')}
            isMobile={device.mobile}
            reducedMotion={device.reduced}
          />
        </Canvas>
      </div>

      <div className="vignette" />

      {/* 倒计时入场黑场（Scene 2 → Scene 3 之间的短暂停顿） */}
      {phase === 'rising' && <div className="blackout" key={risingNonce} />}

      {/* 调试/声明徽标：明确当前为视觉模拟数据 或 真实天文还原 */}
      {phase !== 'input' && skyData && (
        <div className="debug-badge">
          {skyData.source === 'real' ? '真实天文还原' : '视觉模拟数据'}
          {skyData.source === 'real' && skyData.approxLocation ? '（坐标近似）' : ''} ·{' '}
          {Math.min(
            skyData.objects.length,
            device.mobile ? CONFIG.stars.mobileMain : CONFIG.stars.desktopMain,
          )}{' '}
          星 · 地形{' '}
          {terrainLabel(inferTerrain(skyData.input.locationName))}
        </div>
      )}

      {/* 白天出生提示 / 回退提示（低干扰，不弹窗） */}
      {phase !== 'input' && skyData?.astronomy?.isDaytime && (
        <div className="daytime-notice">
          你出生时当地处于白昼。为让你看见当时位于天空中的星体，已采用天文视图；太阳光与天空亮度属视觉处理。
        </div>
      )}
      {phase !== 'input' && fallbackNotice && (
        <div className="fallback-notice">{fallbackNotice}</div>
      )}

      {phase === 'input' && <InputScene initial={input} onSubmit={handleSubmit} />}

      {phase === 'rewind' && (
        <RewindOverlay birthYear={birthYear} onComplete={() => setPhase('rising')} />
      )}

      {showInfoBlock && (
        <InfoOverlay input={input} show={showInfoBlock} reveal={phase === 'info'} />
      )}

      {phase === 'gaze' && (
        <Controls
          showConstellations={showConstellations}
          onToggleConstellations={() => setShowConstellations((v) => !v)}
          showInfo={showInfo}
          onToggleInfo={() => setShowInfo((v) => !v)}
          soundOn={soundOn}
          onToggleSound={handleToggleSound}
          onEnd={() => setPhase('ending')}
        />
      )}

      {phase === 'gaze' && (
        <DataPanel skyData={skyData} show={showData} onClose={() => setShowData(false)} />
      )}

      {phase === 'gaze' && (
        <button className="data-btn" onClick={() => setShowData((v) => !v)}>
          数据
        </button>
      )}

      {phase === 'ending' && <EndingOverlay onReplay={handleReplay} onModify={handleModify} />}
    </div>
  )
}

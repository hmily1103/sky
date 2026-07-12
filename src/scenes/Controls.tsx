import { useEffect, useState } from 'react'

interface ControlsProps {
  showConstellations: boolean
  onToggleConstellations: () => void
  showInfo: boolean
  onToggleInfo: () => void
  soundOn: boolean
  onToggleSound: () => void
  onEnd: () => void
}

export default function Controls({
  showConstellations,
  onToggleConstellations,
  showInfo,
  onToggleInfo,
  soundOn,
  onToggleSound,
  onEnd,
}: ControlsProps) {
  const [showEnd, setShowEnd] = useState(false)

  // 让用户先自由凝望片刻，再浮现“收下这一夜”
  useEffect(() => {
    const t = setTimeout(() => setShowEnd(true), 5000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="controls">
      <div className="control-buttons">
        <button
          className={`ctrl-btn ${showConstellations ? 'active' : ''}`}
          onClick={onToggleConstellations}
          aria-pressed={showConstellations}
          data-ctrl="constellations"
        >
          星座
        </button>
        <button
          className={`ctrl-btn ${showInfo ? 'active' : ''}`}
          onClick={onToggleInfo}
          aria-pressed={showInfo}
        >
          信息
        </button>
        <button
          className={`ctrl-btn ${soundOn ? 'active' : ''}`}
          onClick={onToggleSound}
          aria-pressed={soundOn}
        >
          声音
        </button>
      </div>

      {showEnd && (
        <button className="end-btn" onClick={onEnd}>
          收下这一夜
        </button>
      )}
    </div>
  )
}

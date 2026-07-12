import { useEffect, useState } from 'react'
import { BirthSkyInput } from '../types/sky'

interface InfoOverlayProps {
  input: BirthSkyInput
  /** 是否显示（Scene 4 之后，且未被用户隐藏） */
  show: boolean
  /** 是否是首次进入（触发淡入动画） */
  reveal: boolean
}

function formatDate(date: string): string {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(date)
  if (!m) return date
  return `${m[1]} 年 ${Number(m[2])} 月 ${Number(m[3])} 日`
}

export default function InfoOverlay({ input, show, reveal }: InfoOverlayProps) {
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (reveal) {
      const t = setTimeout(() => setEntered(true), 250)
      return () => clearTimeout(t)
    }
    setEntered(false)
  }, [reveal])

  if (!show) return null

  return (
    <div className={`info-overlay ${entered ? 'in' : ''}`}>
      <div className="info-facts">
        <div className="fact">{formatDate(input.date)}</div>
        <div className="fact">{input.time ? input.time : '当晚 21:00'}</div>
        <div className="fact">{input.locationName}</div>
      </div>
      <div className="info-copy">
        <p>这是你来到世界时，</p>
        <p>天空真实的模样。</p>
      </div>
      <div className="info-copy2">
        <p>它真实存在过。</p>
      </div>
    </div>
  )
}

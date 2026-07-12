import { useEffect, useState } from 'react'

interface EndingOverlayProps {
  onReplay: () => void
  onModify: () => void
}

export default function EndingOverlay({ onReplay, onModify }: EndingOverlayProps) {
  const [entered, setEntered] = useState(false)
  const [showBtns, setShowBtns] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setEntered(true), 300)
    const t2 = setTimeout(() => setShowBtns(true), 4200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return (
    <div className={`overlay ending-overlay ${entered ? 'in' : ''}`}>
      <div className="ending-text">
        <p>这片天空，</p>
        <p>不是我们为你创造的。</p>
        <p>它只是在你匆忙来到世界时，</p>
        <p>没来得及看的那一眼。</p>
        <p className="ending-em">今天，我们把它还给你。</p>
      </div>
      {showBtns && (
        <div className="ending-buttons">
          <button className="ghost-btn" onClick={onReplay}>
            再看一次
          </button>
          <button className="ghost-btn" onClick={onModify}>
            返回修改信息
          </button>
        </div>
      )}
    </div>
  )
}

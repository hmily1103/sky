import { useState } from 'react'
import { BirthSkyInput, GeoLocationResult } from '../types/sky'
import { SIMULATION_NOTE } from '../lib/skyGenerator'
import { resolveBirthLocation } from '../astronomy/location'

interface InputSceneProps {
  initial: BirthSkyInput
  onSubmit: (input: BirthSkyInput) => void
}

function fmtLat(lat: number): string {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`
}
function fmtLng(lng: number): string {
  return `${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`
}

export default function InputScene({ initial, onSubmit }: InputSceneProps) {
  const [date, setDate] = useState(initial.date ?? '')
  const [time, setTime] = useState(initial.time ?? '')
  const [loc, setLoc] = useState(initial.locationName ?? '')
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState<GeoLocationResult | null>(null)

  const handleSubmit = async () => {
    if (!date) {
      setError('请先填写你的出生日期')
      return
    }
    if (!loc.trim()) {
      setError('请填写你出生的地点')
      return
    }
    setError('')
    // 生成前先解析地点并请用户确认（规范 §4.4：不凭模糊字符串直接生成）
    try {
      const resolved = await resolveBirthLocation(loc.trim())
      setConfirming(resolved)
    } catch (e) {
      setError(e instanceof Error ? e.message : '未找到该地点')
    }
  }

  const handleConfirm = () => {
    onSubmit({ date, time: time || undefined, locationName: loc.trim() })
  }

  // 确认卡：显示解析结果，要求用户确认
  if (confirming) {
    return (
      <div className="overlay input-overlay">
        <div className="input-inner">
          <h1 className="title">确认你的出生地点</h1>
          <p className="subtitle">生成前请确认解析结果是否正确。</p>

          <div className="confirm-card">
            <div className="confirm-name">{confirming.displayName}</div>
            <div className="confirm-coord">
              {fmtLat(confirming.latitude)}, {fmtLng(confirming.longitude)}
            </div>
            <div className="confirm-tz">
              时区 {confirming.timezone ?? 'UTC'} · {confirming.countryCode ?? '—'}
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="confirm-actions">
            <button className="ghost-btn" onClick={() => setConfirming(null)}>
              重新输入
            </button>
            <button className="primary-btn confirm-btn" onClick={handleConfirm}>
              确认重返那一夜
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="overlay input-overlay">
      <div className="input-inner">
        <h1 className="title">
          你来的那一夜，
          <br />
          天空是什么样子？
        </h1>
        <p className="subtitle">输入你的信息，第一次看见自己来到世界时，那片真实存在过的天空。</p>

        <div className="form">
          <label className="field">
            <span className="field-label">出生日期</span>
            <input
              type="date"
              className="field-input"
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">
              出生时间 <em className="optional">（选填）</em>
            </span>
            <input
              type="time"
              className="field-input"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
            <span className="field-hint">不知道也没关系，我们会以当晚 21:00 为你还原。</span>
          </label>

          <label className="field">
            <span className="field-label">出生地点</span>
            <input
              type="text"
              className="field-input"
              placeholder="例如：北京 / 上海 / 辽宁锦州 / Tokyo"
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
            />
          </label>

          {error && <div className="form-error">{error}</div>}

          <button className="primary-btn" onClick={handleSubmit}>
            重返那一夜
          </button>
        </div>

        <p className="sim-note">{SIMULATION_NOTE}</p>
      </div>
    </div>
  )
}

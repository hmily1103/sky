/**
 * 克制的环境音引擎（Web Audio API 生成，无需外部资源）。
 * - 很轻的低频环境声
 * - 微弱风声（带通滤波白噪声 + 慢 LFO）
 * - 星空形成时的空间氛围 pad
 * - 第一颗星出现时极轻提示音
 * 默认不自动播放，遵守浏览器自动播放限制：必须在用户手势（点击“重返那一夜”）后 start()。
 */
export class AmbientAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private nodes: AudioScheduledSourceNode[] = []
  private started = false
  private muted = false
  private readonly baseGain = 0.32

  start() {
    if (this.started) {
      this.resume()
      return
    }
    const Ctx: typeof AudioContext =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    this.ctx = new Ctx()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.muted ? 0 : this.baseGain
    this.master.connect(this.ctx.destination)
    this.buildAmbient()
    this.started = true
  }

  private buildAmbient() {
    const ctx = this.ctx!
    const master = this.master!

    // 低频 drone（两个微失谐正弦）
    const drone = ctx.createOscillator()
    drone.type = 'sine'
    drone.frequency.value = 55
    const droneGain = ctx.createGain()
    droneGain.gain.value = 0.12
    drone.connect(droneGain).connect(master)
    drone.start()

    const drone2 = ctx.createOscillator()
    drone2.type = 'sine'
    drone2.frequency.value = 58.4
    const d2g = ctx.createGain()
    d2g.gain.value = 0.08
    drone2.connect(d2g).connect(master)
    drone2.start()

    // 风：白噪声 -> 带通 + 慢 LFO 调制
    const bufSize = 2 * ctx.sampleRate
    const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuf
    noise.loop = true
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 430
    bp.Q.value = 0.7
    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0.05
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.07
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.03
    lfo.connect(lfoGain).connect(noiseGain.gain)
    lfo.start()
    noise.connect(bp).connect(noiseGain).connect(master)
    noise.start()

    // 空间氛围 pad（两个失谐三角波，极低增益，慢 LFO）
    const pad = ctx.createOscillator()
    pad.type = 'triangle'
    pad.frequency.value = 110
    const pad2 = ctx.createOscillator()
    pad2.type = 'triangle'
    pad2.frequency.value = 110.4
    const padGain = ctx.createGain()
    padGain.gain.value = 0.014
    const padLfo = ctx.createOscillator()
    padLfo.frequency.value = 0.05
    const padLfoG = ctx.createGain()
    padLfoG.gain.value = 0.009
    padLfo.connect(padLfoG).connect(padGain.gain)
    padLfo.start()
    pad.connect(padGain).connect(master)
    pad2.connect(padGain).connect(master)
    pad.start()
    pad2.start()

    this.nodes = [drone, drone2, noise, lfo, pad, pad2, padLfo]
  }

  /** 第一颗星出现时的极轻提示音 */
  chime() {
    if (!this.ctx || this.muted) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = 880
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.1, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2)
    o.connect(g).connect(this.master!)
    o.start(t)
    o.stop(t + 1.3)
  }

  setMuted(m: boolean) {
    this.muted = m
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : this.baseGain, this.ctx.currentTime, 0.1)
    }
  }

  resume() {
    this.ctx?.resume()
  }

  stop() {
    this.nodes.forEach((n) => {
      try {
        n.stop()
      } catch {
        /* 已停止 */
      }
    })
    this.ctx?.close()
    this.ctx = null
    this.master = null
    this.started = false
    this.nodes = []
  }
}

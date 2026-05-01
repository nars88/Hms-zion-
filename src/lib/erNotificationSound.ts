let audioCtx: AudioContext | null = null

/** Short, soft two-tone chime for ER result alerts (user gesture not required on modern browsers for low volume). */
export function playErResultReadyChime(): void {
  if (typeof window === 'undefined') return
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    if (!audioCtx) audioCtx = new Ctx()
    const ctx = audioCtx
    if (ctx.state === 'suspended') void ctx.resume()

    const now = ctx.currentTime
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.0001, now)
    master.gain.exponentialRampToValueAtTime(0.07, now + 0.02)
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.45)
    master.connect(ctx.destination)

    const playTone = (freq: number, t0: number, dur: number) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t0)
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.015)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
      osc.connect(g)
      g.connect(master)
      osc.start(t0)
      osc.stop(t0 + dur + 0.02)
    }

    playTone(523.25, now, 0.12)
    playTone(659.25, now + 0.11, 0.14)
  } catch {
    // ignore
  }
}

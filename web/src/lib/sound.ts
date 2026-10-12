/**
 * Bộ tạo âm thanh phản hồi xúc giác siêu nhẹ bằng Web Audio API thuần (0 byte mp3).
 * Có trạng thái bật/tắt (mute) lưu vào localStorage. Mặc định: tắt (muted) để bảo đảm yên tĩnh.
 */

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

const STORAGE_KEY = 'thinkinglab_sound_enabled'
let soundEnabled = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) === 'true' : false
const listeners = new Set<(enabled: boolean) => void>()

export const sound = {
  isEnabled(): boolean {
    return soundEnabled
  },

  toggle(): boolean {
    soundEnabled = !soundEnabled
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(soundEnabled))
    }
    listeners.forEach((fn) => fn(soundEnabled))
    if (soundEnabled) {
      sound.playPop()
    }
    return soundEnabled
  },

  subscribe(fn: (enabled: boolean) => void): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  /** Âm thanh bấm nút / lật thẻ nhẹ nhàng (soft bubble pop) */
  playPop() {
    if (!soundEnabled) return
    const ctx = getAudioContext()
    if (!ctx) return
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const now = ctx.currentTime

      osc.type = 'sine'
      osc.frequency.setValueAtTime(620, now)
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.07)

      gain.gain.setValueAtTime(0.18, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.07)
    } catch {
      // Bỏ qua lỗi audio context trên trình duyệt chưa tương tác
    }
  },

  /** Âm thanh chuông cảnh báo ngụy biện (retro alert ding) */
  playAlert() {
    if (!soundEnabled) return
    const ctx = getAudioContext()
    if (!ctx) return
    try {
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()
      const now = ctx.currentTime

      osc1.type = 'sine'
      osc2.type = 'triangle'

      osc1.frequency.setValueAtTime(840, now)
      osc1.frequency.setValueAtTime(420, now + 0.08)

      osc2.frequency.setValueAtTime(560, now)
      osc2.frequency.setValueAtTime(280, now + 0.08)

      gain.gain.setValueAtTime(0.16, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(now)
      osc2.start(now)
      osc1.stop(now + 0.22)
      osc2.stop(now + 0.22)
    } catch {}
  },

  /** Âm thanh hợp âm tán thưởng lập luận ARE chuẩn (warm triumph chime) */
  playChime() {
    if (!soundEnabled) return
    const ctx = getAudioContext()
    if (!ctx) return
    try {
      // Hợp âm Đô trưởng (C5 - E5 - G5 - C6) ngân vang
      const freqs = [523.25, 659.25, 783.99, 1046.5]
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        const delay = idx * 0.05
        const now = ctx.currentTime + delay

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now)

        gain.gain.setValueAtTime(0.12, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now)
        osc.stop(now + 0.35)
      })
    } catch {}
  },
}

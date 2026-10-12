/**
 * Bộ tạo âm thanh phản hồi xúc giác siêu nhẹ bằng Web Audio API thuần (0 byte mp3).
 * Mặc định: BẬT âm thanh (enabled = true).
 */

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
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
// Mặc định BẬT âm thanh: chỉ tắt khi người dùng chủ ý lưu 'false'
let soundEnabled = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) !== 'false' : true
const listeners = new Set<(enabled: boolean) => void>()
let typingTimer: number | null = null

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
      sound.playHaptic()
    }
    return soundEnabled
  },

  subscribe(fn: (enabled: boolean) => void): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  /** Âm thanh rung haptic xúc giác nhẹ khi bấm nút (tactile micro-click + vibration) */
  playHaptic() {
    if (!soundEnabled) return
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate?.(10)
      } catch {}
    }
    const ctx = getAudioContext()
    if (!ctx) return
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const now = ctx.currentTime

      // Micro-transient: tần số hạ nhanh từ 380Hz xuống 120Hz trong 28ms
      osc.type = 'sine'
      osc.frequency.setValueAtTime(380, now)
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.028)

      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.028)
    } catch {}
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

      gain.gain.setValueAtTime(0.14, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.07)
    } catch {}
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

  /**
   * Âm thanh đang soạn tin nhắn nhịp nhàng giống Facebook Messenger (bubbly typing blip loop).
   * Kêu nhẹ nhàng theo nhịp bong bóng khi AI đang suy nghĩ / soạn tin.
   */
  startTyping() {
    if (!soundEnabled || typingTimer !== null) return

    const playBlip = () => {
      if (!soundEnabled) return
      const ctx = getAudioContext()
      if (!ctx) return
      try {
        const now = ctx.currentTime
        // Giọt bóng 1
        const osc1 = ctx.createOscillator()
        const gain1 = ctx.createGain()
        osc1.type = 'sine'
        osc1.frequency.setValueAtTime(540, now)
        osc1.frequency.exponentialRampToValueAtTime(420, now + 0.04)
        gain1.gain.setValueAtTime(0.045, now)
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.04)
        osc1.connect(gain1)
        gain1.connect(ctx.destination)
        osc1.start(now)
        osc1.stop(now + 0.04)

        // Giọt bóng 2 (nhịp kế tiếp nhẹ nhàng)
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.type = 'sine'
        osc2.frequency.setValueAtTime(680, now + 0.07)
        osc2.frequency.exponentialRampToValueAtTime(520, now + 0.11)
        gain2.gain.setValueAtTime(0.035, now + 0.07)
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.11)
        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        osc2.start(now + 0.07)
        osc2.stop(now + 0.11)
      } catch {}
    }

    playBlip()
    typingTimer = window.setInterval(playBlip, 720)
  },

  stopTyping() {
    if (typingTimer !== null) {
      clearInterval(typingTimer)
      typingTimer = null
    }
  },
}

/** Tự động phát âm haptic nhẹ khi người dùng bấm bất kỳ nút nào trên website */
export function initInteractionSound() {
  if (typeof window === 'undefined') return
  window.addEventListener(
    'pointerdown',
    (e) => {
      const target = (e.target as HTMLElement | null)?.closest('button, [role="button"]')
      if (target) {
        sound.playHaptic()
      }
    },
    { passive: true }
  )
}

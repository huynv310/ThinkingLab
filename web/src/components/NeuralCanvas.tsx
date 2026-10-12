import { useEffect, useRef } from 'react'

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  baseAlpha: number
  color: string
}

/**
 * 2D Canvas Neural Network & Logic Nodes:
 * Vẽ các điểm nút tư duy chuyển động chậm và phóng tia liên kết phát sáng khi chuột lướt qua.
 * Hiệu năng 60fps cao cấp, không dùng thư viện nặng.
 */
export function NeuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)
    const mouse = { x: -1000, y: -1000, active: false }

    const isMobile = window.innerWidth < 768
    const nodeCount = isMobile ? 26 : 55
    const connectDistance = isMobile ? 85 : 135
    const mouseDistance = isMobile ? 110 : 180

    const colors = ['#38bdf8', '#818cf8', '#22d3ee', '#fb923c']

    const nodes: Node[] = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 1.2,
      baseAlpha: Math.random() * 0.45 + 0.35,
      color: colors[Math.floor(Math.random() * colors.length)],
    }))

    const onResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      mouse.active = true
    }

    const onMouseLeave = () => {
      mouse.active = false
      mouse.x = -1000
      mouse.y = -1000
    }

    window.addEventListener('resize', onResize)
    window.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // 1. Cập nhật và vẽ các nút
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        n.x += n.vx
        n.y += n.vy

        if (n.x < 0 || n.x > width) n.vx *= -1
        if (n.y < 0 || n.y > height) n.vy *= -1

        // Khoảng cách tới chuột
        let extraAlpha = 0
        if (mouse.active) {
          const dx = mouse.x - n.x
          const dy = mouse.y - n.y
          const dist = Math.hypot(dx, dy)
          if (dist < mouseDistance) {
            extraAlpha = (1 - dist / mouseDistance) * 0.6
            // Lực hút nhẹ theo chuột (gentle magnetic pull)
            n.x += dx * 0.008
            n.y += dy * 0.008
          }
        }

        ctx.save()
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.radius + extraAlpha * 2.5, 0, Math.PI * 2)
        ctx.fillStyle = n.color
        ctx.globalAlpha = Math.min(1, n.baseAlpha + extraAlpha)
        ctx.shadowBlur = extraAlpha > 0 ? 15 : 6
        ctx.shadowColor = n.color
        ctx.fill()
        ctx.restore()

        // 2. Nối dây giữa các nút gần nhau
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j]
          const dx = n.x - m.x
          const dy = n.y - m.y
          const dist = Math.hypot(dx, dy)

          if (dist < connectDistance) {
            const alpha = (1 - dist / connectDistance) * 0.28
            ctx.beginPath()
            ctx.moveTo(n.x, n.y)
            ctx.lineTo(m.x, m.y)
            ctx.strokeStyle = `rgba(129, 140, 248, ${alpha})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }

        // 3. Nối dây tới chuột nếu trong tầm
        if (mouse.active) {
          const dx = mouse.x - n.x
          const dy = mouse.y - n.y
          const dist = Math.hypot(dx, dy)
          if (dist < mouseDistance) {
            const alpha = (1 - dist / mouseDistance) * 0.6
            ctx.beginPath()
            ctx.moveTo(n.x, n.y)
            ctx.lineTo(mouse.x, mouse.y)
            ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`
            ctx.lineWidth = 1.4
            ctx.stroke()
          }
        }
      }

      animId = requestAnimationFrame(render)
    }

    animId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-60"
      aria-hidden="true"
    />
  )
}

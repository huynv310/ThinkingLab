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
 * - Giảm mật độ 20% cho máy yếu / mạng yếu.
 * - Cơ chế lực đẩy phân tán (Anti-Clumping) đảm bảo các node không bao giờ dồn cụm vào nhau.
 * - Loại bỏ shadowBlur phần mềm nặng, tối ưu hóa tối đa CPU/GPU cho thiết bị cấu hình thấp.
 */
export function NeuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let animId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)
    const mouse = { x: -1000, y: -1000, active: false }

    const isMobile = window.innerWidth < 768
    // Giảm mật độ node đi 20% (desktop: 44 node, mobile: 20 node)
    const nodeCount = isMobile ? 20 : 42
    const connectDistance = isMobile ? 75 : 115
    const mouseDistance = isMobile ? 95 : 150
    const minNodeDist = isMobile ? 45 : 60 // Khoảng cách tối thiểu chống co cụm

    const colors = ['#38bdf8', '#818cf8', '#22d3ee', '#fb923c']

    // Khởi tạo các node phân bố đều khắp màn hình (Grid-Jitter), không spawn chồng lên nhau
    const cols = Math.ceil(Math.sqrt(nodeCount * (width / (height || 1))))
    const rows = Math.ceil(nodeCount / cols)
    const cellW = width / cols
    const cellH = height / rows

    const nodes: Node[] = []
    let spawned = 0
    for (let r = 0; r < rows && spawned < nodeCount; r++) {
      for (let c = 0; c < cols && spawned < nodeCount; c++) {
        const jitterX = (Math.random() * 0.7 + 0.15) * cellW
        const jitterY = (Math.random() * 0.7 + 0.15) * cellH
        const angle = Math.random() * Math.PI * 2
        const speed = Math.random() * 0.25 + 0.15

        nodes.push({
          x: c * cellW + jitterX,
          y: r * cellH + jitterY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: Math.random() * 1.6 + 1.2,
          baseAlpha: Math.random() * 0.35 + 0.3,
          color: colors[spawned % colors.length],
        })
        spawned++
      }
    }

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
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    document.addEventListener('mouseleave', onMouseLeave)

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // 1. Kiểm tra va chạm / lực đẩy chống co cụm giữa các cặp node
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j]
          const dx = n.x - m.x
          const dy = n.y - m.y
          const dist = Math.hypot(dx, dy)

          // Lực đẩy phân tán nếu 2 node tiến lại gần nhau (chống co cụm)
          if (dist < minNodeDist && dist > 0.1) {
            const repulse = ((minNodeDist - dist) / minNodeDist) * 0.015
            const rx = (dx / dist) * repulse
            const ry = (dy / dist) * repulse
            n.vx += rx
            n.vy += ry
            m.vx -= rx
            m.vy -= ry
          }

          // Nối dây giữa các nút gần nhau (vẽ đường nét thanh mảnh, mờ nhẹ)
          if (dist < connectDistance) {
            const alpha = (1 - dist / connectDistance) * 0.22
            ctx.beginPath()
            ctx.moveTo(n.x, n.y)
            ctx.lineTo(m.x, m.y)
            ctx.strokeStyle = `rgba(129, 140, 248, ${alpha})`
            ctx.lineWidth = 0.75
            ctx.stroke()
          }
        }
      }

      // 2. Cập nhật vị trí, kiểm tra biên và vẽ từng node
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]

        // Giới hạn vận tốc để chuyển động luôn êm ái, trôi dạt nhẹ nhàng
        const currentSpeed = Math.hypot(n.vx, n.vy)
        const maxSpeed = 0.4
        const minSpeed = 0.12
        if (currentSpeed > maxSpeed) {
          n.vx = (n.vx / currentSpeed) * maxSpeed
          n.vy = (n.vy / currentSpeed) * maxSpeed
        } else if (currentSpeed < minSpeed && currentSpeed > 0) {
          n.vx = (n.vx / currentSpeed) * minSpeed
          n.vy = (n.vy / currentSpeed) * minSpeed
        }

        n.x += n.vx
        n.y += n.vy

        // Bật nảy khi chạm mép màn hình
        if (n.x < 10) {
          n.x = 10
          n.vx = Math.abs(n.vx)
        } else if (n.x > width - 10) {
          n.x = width - 10
          n.vx = -Math.abs(n.vx)
        }
        if (n.y < 10) {
          n.y = 10
          n.vy = Math.abs(n.vy)
        } else if (n.y > height - 10) {
          n.y = height - 10
          n.vy = -Math.abs(n.vy)
        }

        // Tương tác chuột: đẩy nhẹ ra xa nếu chuột quá gần (không hút vào để tránh dồn cục)
        let extraAlpha = 0
        if (mouse.active) {
          const dx = mouse.x - n.x
          const dy = mouse.y - n.y
          const dist = Math.hypot(dx, dy)
          if (dist < mouseDistance) {
            extraAlpha = (1 - dist / mouseDistance) * 0.55

            // Đẩy nhẹ ra xa chuột (chống dồn cục vào vị trí con trỏ)
            if (dist < 60 && dist > 1) {
              const push = (1 - dist / 60) * 0.25
              n.vx -= (dx / dist) * push
              n.vy -= (dy / dist) * push
            }

            // Dây liên kết phóng tới chuột
            ctx.beginPath()
            ctx.moveTo(n.x, n.y)
            ctx.lineTo(mouse.x, mouse.y)
            ctx.strokeStyle = `rgba(56, 189, 248, ${extraAlpha * 0.6})`
            ctx.lineWidth = 1.1
            ctx.stroke()
          }
        }

        // Vẽ node bằng 2 vòng tròn (tâm sáng + quầng mờ nhẹ), KHÔNG dùng shadowBlur nặng nề
        const finalAlpha = Math.min(0.9, n.baseAlpha + extraAlpha)

        // Quầng phát quang mờ
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.radius * 2.2 + extraAlpha * 2, 0, Math.PI * 2)
        ctx.fillStyle = n.color
        ctx.globalAlpha = finalAlpha * 0.25
        ctx.fill()

        // Lõi điểm nút sắc nét
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.radius + extraAlpha * 0.8, 0, Math.PI * 2)
        ctx.fillStyle = n.color
        ctx.globalAlpha = finalAlpha
        ctx.fill()
      }

      ctx.globalAlpha = 1
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

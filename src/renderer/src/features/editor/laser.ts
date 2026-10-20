/** Laser pointer: a red dot or a fading trail on a full-window canvas. Never saved. */
import { useTools } from '../../stores/tools'

interface TrailPt {
  x: number
  y: number
  t: number
}

const FADE_MS = 1000
let canvas: HTMLCanvasElement | null = null
let trail: TrailPt[][] = []
let dot: { x: number; y: number } | null = null
let raf = 0

function frame(): void {
  raf = 0
  const c = canvas
  if (!c) return
  const ctx = c.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  if (c.width !== Math.round(innerWidth * dpr) || c.height !== Math.round(innerHeight * dpr)) {
    c.width = Math.round(innerWidth * dpr)
    c.height = Math.round(innerHeight * dpr)
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, innerWidth, innerHeight)
  const now = performance.now()
  const color = useTools.getState().laser.color
  trail = trail.map((seg) => seg.filter((p) => now - p.t < FADE_MS)).filter((seg) => seg.length)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const seg of trail) {
    for (let i = 1; i < seg.length; i++) {
      const a = 1 - (now - seg[i].t) / FADE_MS
      ctx.strokeStyle = color
      ctx.globalAlpha = Math.max(0, a)
      ctx.shadowColor = color
      ctx.shadowBlur = 12
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(seg[i - 1].x, seg[i - 1].y)
      ctx.lineTo(seg[i].x, seg[i].y)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.strokeStyle = '#fff'
      ctx.globalAlpha = Math.max(0, a) * 0.9
      ctx.lineWidth = 1.6
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1
  if (dot) {
    ctx.fillStyle = color
    ctx.shadowColor = color
    ctx.shadowBlur = 16
    ctx.beginPath()
    ctx.arc(dot.x, dot.y, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(dot.x, dot.y, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }
  if (trail.length || dot) raf = requestAnimationFrame(frame)
}

const kick = (): void => {
  if (!raf) raf = requestAnimationFrame(frame)
}

export const laser = {
  attach(c: HTMLCanvasElement | null): void {
    canvas = c
  },
  gesture(e: PointerEvent) {
    const trailMode = useTools.getState().laser.mode === 'trail'
    const seg: TrailPt[] = []
    if (trailMode) trail.push(seg)
    const at = (ev: PointerEvent): void => {
      if (trailMode) seg.push({ x: ev.clientX, y: ev.clientY, t: performance.now() })
      dot = { x: ev.clientX, y: ev.clientY }
      kick()
    }
    at(e)
    return {
      move: at,
      up: () => {
        dot = null
        kick()
      },
      cancel: () => {
        dot = null
        kick()
      }
    }
  }
}

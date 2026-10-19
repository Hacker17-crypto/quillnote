/**
 * Ink geometry: turns stored stroke points into SVG paths. Pens use perfect-freehand outlines
 * (filled polygons); highlighter and tape are flat-tipped polylines.
 */
import { getStroke } from 'perfect-freehand'
import type { StrokeObject, StrokeOpts } from '@shared/types'

export type PenType = 'fountain' | 'ball' | 'brush'

/** Map the pen settings sliders (0–100) to perfect-freehand parameters. */
export function penOpts(type: PenType, sharpness: number, pressure: number, stabilization: number, simulate: boolean): StrokeOpts {
  const sharp = sharpness / 100
  const pres = pressure / 100
  const streamline = 0.32 + (stabilization / 100) * 0.6
  switch (type) {
    case 'ball':
      return { thinning: 0.08 * pres, smoothing: 0.55, streamline, taperStart: 0, taperEnd: 0, simulate }
    case 'brush':
      return { thinning: 0.45 + 0.45 * pres, smoothing: 0.6, streamline, taperStart: 4 + 10 * sharp, taperEnd: 8 + 22 * sharp, simulate }
    default:
      return { thinning: 0.2 + 0.5 * pres, smoothing: 0.5, streamline, taperStart: 0, taperEnd: 2 + 10 * sharp, simulate, nib: -Math.PI / 4 }
  }
}

type Pt = [number, number, number]

function toPts(points: number[], opts: StrokeOpts | undefined): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i + 1 < points.length; i += 3) out.push([points[i], points[i + 1], points[i + 2] ?? 0.5])
  if (opts?.nib !== undefined && out.length > 2) {
    // Fountain nib: strokes across the nib are wide, strokes along it are thin.
    const nib = opts.nib
    let prev = 1
    for (let i = 1; i < out.length; i++) {
      const dx = out[i][0] - out[i - 1][0]
      const dy = out[i][1] - out[i - 1][1]
      if (dx * dx + dy * dy < 0.25) continue
      const k = 0.62 + 0.38 * Math.abs(Math.sin(Math.atan2(dy, dx) - nib))
      prev = prev * 0.6 + k * 0.4
      out[i][2] = out[i][2] * prev
    }
  }
  return out
}

/** SVG path data for a filled outline polygon. */
function polygonPath(outline: number[][]): string {
  const n = outline.length
  if (n < 2) return ''
  let d = `M${f(outline[0][0])} ${f(outline[0][1])}Q`
  for (let i = 0; i < n; i++) {
    const [x0, y0] = outline[i]
    const [x1, y1] = outline[(i + 1) % n]
    d += `${f(x0)} ${f(y0)} ${f((x0 + x1) / 2)} ${f((y0 + y1) / 2)} `
  }
  return d + 'Z'
}

const f = (n: number): string => (Math.round(n * 100) / 100).toString()

export function pressureOutline(points: number[], width: number, opts: StrokeOpts | undefined, last: boolean): string {
  const o = opts ?? { thinning: 0.5, smoothing: 0.5, streamline: 0.5, taperStart: 0, taperEnd: 0, simulate: true }
  const outline = getStroke(toPts(points, o), {
    size: width,
    thinning: o.thinning,
    smoothing: o.smoothing,
    streamline: o.streamline,
    simulatePressure: o.simulate,
    last,
    start: { taper: o.taperStart * (width / 2), cap: true },
    end: { taper: o.taperEnd * (width / 2), cap: true }
  })
  return polygonPath(outline)
}

/** Centre-line path (for flat-tipped tools). */
export function polylinePath(points: number[]): string {
  if (points.length < 3) return ''
  let d = `M${f(points[0])} ${f(points[1])}`
  if (points.length === 3) return d + `L${f(points[0] + 0.01)} ${f(points[1])}`
  for (let i = 3; i + 1 < points.length; i += 3) d += `L${f(points[i])} ${f(points[i + 1])}`
  return d
}

const cache = new WeakMap<StrokeObject, string>()

/** Path for a committed stroke (memoised per object). */
export function strokePath(s: StrokeObject): string {
  let d = cache.get(s)
  if (d === undefined) {
    d = isFlat(s) ? polylinePath(s.points) : pressureOutline(s.points, s.width, s.opts, true)
    cache.set(s, d)
  }
  return d
}

export const isFlat = (s: { tool: StrokeObject['tool'] }): boolean => s.tool === 'highlighter' || s.tool === 'tape'

/** Highlighter colours are drawn at this alpha so writing stays readable underneath. */
export const HIGHLIGHT_ALPHA = 0.42

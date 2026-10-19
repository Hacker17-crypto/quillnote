/** Pure geometry for page objects: bounds, hit-testing, transforms, erasing, shape recognition. */
import { uid } from '@shared/docs'
import type { PageObject, ShapeObject, StrokeObject } from '@shared/types'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const bboxCache = new WeakMap<object, Rect>()

export function pointsBounds(points: number[], pad = 0): Rect {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (let i = 0; i + 1 < points.length; i += 3) {
    const x = points[i]
    const y = points[i + 1]
    if (x < x0) x0 = x
    if (y < y0) y0 = y
    if (x > x1) x1 = x
    if (y > y1) y1 = y
  }
  if (x0 === Infinity) return { x: 0, y: 0, w: 0, h: 0 }
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 }
}

/** Flat [x,y,x,y…] → bounds. */
export function xyBounds(xy: number[]): Rect {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (let i = 0; i + 1 < xy.length; i += 2) {
    x0 = Math.min(x0, xy[i])
    y0 = Math.min(y0, xy[i + 1])
    x1 = Math.max(x1, xy[i])
    y1 = Math.max(y1, xy[i + 1])
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

export function bounds(o: PageObject): Rect {
  let r = bboxCache.get(o)
  if (r) return r
  if (o.type === 'stroke') r = pointsBounds(o.points, o.width / 2)
  else if (o.type === 'shape' && o.points?.length) {
    const b = xyBounds(o.points)
    r = { x: b.x - o.width / 2, y: b.y - o.width / 2, w: b.w + o.width, h: b.h + o.width }
  } else if (o.type === 'image' && o.rotation % 180 !== 0) {
    const cx = o.x + o.w / 2
    const cy = o.y + o.h / 2
    r = { x: cx - o.h / 2, y: cy - o.w / 2, w: o.h, h: o.w }
  } else if (o.type === 'sticky' && o.collapsed) r = { x: o.x, y: o.y, w: 36, h: 36 }
  else r = { x: o.x, y: o.y, w: o.w, h: o.h }
  bboxCache.set(o, r)
  return r
}

export function unionBounds(objs: PageObject[]): Rect | null {
  if (!objs.length) return null
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const o of objs) {
    const b = bounds(o)
    x0 = Math.min(x0, b.x)
    y0 = Math.min(y0, b.y)
    x1 = Math.max(x1, b.x + b.w)
    y1 = Math.max(y1, b.y + b.h)
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

export const inRect = (r: Rect, x: number, y: number, pad = 0): boolean =>
  x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad

export const rectsOverlap = (a: Rect, b: Rect): boolean => a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h

function segDist2(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const len = dx * dx + dy * dy
  let t = len ? ((px - ax) * dx + (py - ay) * dy) / len : 0
  t = Math.max(0, Math.min(1, t))
  const x = ax + t * dx - px
  const y = ay + t * dy - py
  return x * x + y * y
}

/** Distance from a point to a [x,y,p] polyline. */
export function polylineDist(points: number[], x: number, y: number, stride = 3): number {
  if (points.length < stride) return Infinity
  if (points.length < stride * 2) return Math.hypot(points[0] - x, points[1] - y)
  let best = Infinity
  for (let i = stride; i + 1 < points.length; i += stride) best = Math.min(best, segDist2(x, y, points[i - stride], points[i - stride + 1], points[i], points[i + 1]))
  return Math.sqrt(best)
}

export function pointInPolygon(xy: number[], x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = xy.length - 2; i < xy.length; j = i, i += 2) {
    const xi = xy[i]
    const yi = xy[i + 1]
    const xj = xy[j]
    const yj = xy[j + 1]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Outline vertices of a shape, closed shapes listed once (no repeat of the first point). */
export function shapeVertices(s: ShapeObject): { xy: number[]; closed: boolean } {
  switch (s.shape) {
    case 'line':
    case 'arrow':
      return { xy: s.points ?? [s.x, s.y, s.x + s.w, s.y + s.h], closed: false }
    case 'rect':
      return { xy: [s.x, s.y, s.x + s.w, s.y, s.x + s.w, s.y + s.h, s.x, s.y + s.h], closed: true }
    case 'ellipse': {
      const xy: number[] = []
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2
        xy.push(s.x + s.w / 2 + (Math.cos(a) * s.w) / 2, s.y + s.h / 2 + (Math.sin(a) * s.h) / 2)
      }
      return { xy, closed: true }
    }
    case 'star': {
      const xy: number[] = []
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        const r = i % 2 ? 0.4 : 1
        xy.push(s.x + s.w / 2 + (Math.cos(a) * r * s.w) / 2, s.y + s.h / 2 + (Math.sin(a) * r * s.h) / 2)
      }
      return { xy, closed: true }
    }
    default:
      return { xy: s.points ?? [], closed: true }
  }
}

/** Does `o` sit under the point (x, y)? `tol` widens thin targets. */
export function hitTest(o: PageObject, x: number, y: number, tol: number): boolean {
  const b = bounds(o)
  if (!inRect(b, x, y, tol)) return false
  switch (o.type) {
    case 'stroke':
      return polylineDist(o.points, x, y) <= o.width / 2 + tol
    case 'shape': {
      const { xy, closed } = shapeVertices(o)
      const ring = closed ? [...xy, xy[0], xy[1]] : xy
      if (polylineDist(ring, x, y, 2) <= o.width / 2 + tol) return true
      return closed && !!o.fill && pointInPolygon(xy, x, y)
    }
    default:
      return true
  }
}

// ───────────────────────── transforms ─────────────────────────
function mapPoints(points: number[], stride: number, fn: (x: number, y: number) => [number, number]): number[] {
  const out = points.slice()
  for (let i = 0; i + 1 < out.length; i += stride) {
    const [x, y] = fn(out[i], out[i + 1])
    out[i] = x
    out[i + 1] = y
  }
  return out
}

export function translate<T extends PageObject>(o: T, dx: number, dy: number): T {
  if (o.type === 'stroke') return { ...o, points: mapPoints(o.points, 3, (x, y) => [x + dx, y + dy]) }
  if (o.type === 'shape') return { ...o, x: o.x + dx, y: o.y + dy, points: o.points && mapPoints(o.points, 2, (x, y) => [x + dx, y + dy]) }
  return { ...o, x: (o as { x: number }).x + dx, y: (o as { y: number }).y + dy }
}

/** Scale about an origin. Stroke widths scale with the geometric mean so ink keeps its look. */
export function scale<T extends PageObject>(o: T, sx: number, sy: number, ox: number, oy: number): T {
  const m = (x: number, y: number): [number, number] => [ox + (x - ox) * sx, oy + (y - oy) * sy]
  const k = Math.sqrt(Math.abs(sx * sy))
  if (o.type === 'stroke') return { ...o, points: mapPoints(o.points, 3, m), width: Math.max(0.3, o.width * k) }
  const [x, y] = m((o as { x: number }).x, (o as { y: number }).y)
  const w = (o as { w: number }).w * sx
  const h = (o as { h: number }).h * sy
  const base = { ...o, x, y, w, h }
  if (o.type === 'shape') return { ...base, points: o.points && mapPoints(o.points, 2, m), width: Math.max(0.3, o.width * k) } as T
  if (o.type === 'text') return { ...base, size: Math.max(6, (o.size ?? 16) * k) } as T
  return base as T
}

export function withNewId<T extends PageObject>(o: T): T {
  return { ...o, id: uid() }
}

// ───────────────────────── erasing ─────────────────────────
/**
 * Remove the parts of a stroke inside a circle. Returns null when untouched, otherwise the
 * remaining pieces (possibly none).
 */
export function eraseStroke(s: StrokeObject, cx: number, cy: number, r: number): StrokeObject[] | null {
  const b = bounds(s)
  if (!inRect(b, cx, cy, r)) return null
  const reach = r + s.width / 2
  if (polylineDist(s.points, cx, cy) > reach) return null
  // Densify so cuts are clean even on fast, sparse strokes.
  const pts: number[] = []
  const step = Math.max(0.6, r / 3)
  for (let i = 0; i + 2 < s.points.length; i += 3) {
    if (i > 0) {
      const ax = s.points[i - 3]
      const ay = s.points[i - 2]
      const bx = s.points[i]
      const by = s.points[i + 1]
      const n = Math.floor(Math.hypot(bx - ax, by - ay) / step)
      for (let k = 1; k < n; k++) {
        const t = k / n
        pts.push(ax + (bx - ax) * t, ay + (by - ay) * t, s.points[i - 1] + (s.points[i + 2] - s.points[i - 1]) * t)
      }
    }
    pts.push(s.points[i], s.points[i + 1], s.points[i + 2])
  }
  const pieces: StrokeObject[] = []
  let cur: number[] = []
  const flush = (): void => {
    if (cur.length >= 6) pieces.push({ ...s, id: uid(), points: cur })
    cur = []
  }
  for (let i = 0; i + 2 < pts.length; i += 3) {
    if (Math.hypot(pts[i] - cx, pts[i + 1] - cy) <= reach) flush()
    else cur.push(pts[i], pts[i + 1], pts[i + 2])
  }
  flush()
  if (pieces.length === 1 && pieces[0].points.length === s.points.length) return null
  return pieces
}

// ───────────────────────── shape recognition ─────────────────────────
/** Ramer–Douglas–Peucker on flat [x,y] pairs. */
export function simplify(xy: number[], eps: number): number[] {
  if (xy.length <= 4) return xy.slice()
  const keep = new Uint8Array(xy.length / 2)
  keep[0] = 1
  keep[keep.length - 1] = 1
  const stack: [number, number][] = [[0, keep.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop() as [number, number]
    let best = -1
    let idx = -1
    for (let i = a + 1; i < b; i++) {
      const d = segDist2(xy[i * 2], xy[i * 2 + 1], xy[a * 2], xy[a * 2 + 1], xy[b * 2], xy[b * 2 + 1])
      if (d > best) {
        best = d
        idx = i
      }
    }
    if (idx >= 0 && best > eps * eps) {
      keep[idx] = 1
      stack.push([a, idx], [idx, b])
    }
  }
  const out: number[] = []
  for (let i = 0; i < keep.length; i++) if (keep[i]) out.push(xy[i * 2], xy[i * 2 + 1])
  return out
}

export interface ShapeStyle {
  stroke: string
  width: number
  fill: string | null
  dash: boolean
}

/**
 * Turn a hand-drawn stroke into a clean shape: line, arrow, triangle, rectangle, polygon or
 * ellipse. Returns null when the stroke doesn't look like any of them.
 */
export function recognizeShape(points: number[], style: ShapeStyle): ShapeObject | null {
  const xy: number[] = []
  for (let i = 0; i + 1 < points.length; i += 3) xy.push(points[i], points[i + 1])
  if (xy.length < 8) return null
  const b = xyBounds(xy)
  const diag = Math.hypot(b.w, b.h)
  if (diag < 12) return null
  let length = 0
  for (let i = 2; i < xy.length; i += 2) length += Math.hypot(xy[i] - xy[i - 2], xy[i + 1] - xy[i - 1])
  const n = xy.length
  const gap = Math.hypot(xy[0] - xy[n - 2], xy[1] - xy[n - 1])
  const base = { id: uid(), type: 'shape' as const, ...style }

  // Open strokes: straight line, or a line with an arrow head.
  if (gap > diag * 0.22) {
    const chord = gap
    if (chord / length > 0.9) return { ...base, shape: 'line', x: b.x, y: b.y, w: b.w, h: b.h, points: [xy[0], xy[1], xy[n - 2], xy[n - 1]] }
    const simp = simplify(xy, diag * 0.08)
    // Arrow: long shaft, then the pen doubles back to draw one or both barbs at the tip.
    if (simp.length >= 8 && simp.length <= 12) {
      const sx = simp[0]
      const sy = simp[1]
      const tx = simp[2]
      const ty = simp[3]
      const shaft = Math.hypot(tx - sx, ty - sy)
      const rest = simp.slice(2)
      const near = rest.every((_, i) => i % 2 || Math.hypot(rest[i] - tx, rest[i + 1] - ty) < shaft * 0.45)
      if (shaft > diag * 0.6 && near) {
        return { ...base, shape: 'arrow', x: Math.min(sx, tx), y: Math.min(sy, ty), w: Math.abs(tx - sx), h: Math.abs(ty - sy), points: [sx, sy, tx, ty] }
      }
    }
    return null
  }

  // Closed strokes: ellipse if the radius is steady, otherwise a polygon from the corners.
  const cx = b.x + b.w / 2
  const cy = b.y + b.h / 2
  let err = 0
  for (let i = 0; i < n; i += 2) {
    const dx = (xy[i] - cx) / (b.w / 2 || 1)
    const dy = (xy[i + 1] - cy) / (b.h / 2 || 1)
    err += Math.abs(Math.hypot(dx, dy) - 1)
  }
  err /= n / 2
  const ring = xy.slice(0, n - 2)
  let simp = simplify([...ring, xy[0], xy[1]], diag * 0.075)
  simp = simp.slice(0, simp.length - 2) // drop repeated start point
  // merge corners that ended up very close to each other
  const corners: number[] = []
  for (let i = 0; i < simp.length; i += 2) {
    const px = corners.length ? corners[corners.length - 2] : NaN
    const py = corners.length ? corners[corners.length - 1] : NaN
    if (!corners.length || Math.hypot(simp[i] - px, simp[i + 1] - py) > diag * 0.12) corners.push(simp[i], simp[i + 1])
  }
  if (corners.length >= 6 && Math.hypot(corners[0] - corners[corners.length - 2], corners[1] - corners[corners.length - 1]) < diag * 0.12) corners.splice(-2)
  const k = corners.length / 2

  if (err < 0.13 && (k > 5 || k < 3)) {
    // snap near-circles to circles
    const ratio = b.w / b.h
    if (ratio > 0.85 && ratio < 1.18) {
      const d = (b.w + b.h) / 2
      return { ...base, shape: 'ellipse', x: cx - d / 2, y: cy - d / 2, w: d, h: d }
    }
    return { ...base, shape: 'ellipse', x: b.x, y: b.y, w: b.w, h: b.h }
  }
  if (k === 3) return { ...base, shape: 'triangle', x: b.x, y: b.y, w: b.w, h: b.h, points: corners }
  if (k === 4) {
    // axis-aligned rectangle when every edge is close to horizontal/vertical
    let aligned = true
    for (let i = 0; i < 4; i++) {
      const ax = corners[i * 2]
      const ay = corners[i * 2 + 1]
      const bx = corners[((i + 1) % 4) * 2]
      const by = corners[((i + 1) % 4) * 2 + 1]
      const ang = Math.abs(Math.atan2(by - ay, bx - ax)) % (Math.PI / 2)
      if (Math.min(ang, Math.PI / 2 - ang) > 0.22) aligned = false
    }
    if (aligned) return { ...base, shape: 'rect', x: b.x, y: b.y, w: b.w, h: b.h }
    return { ...base, shape: 'polygon', x: b.x, y: b.y, w: b.w, h: b.h, points: corners }
  }
  if (k >= 5 && k <= 8 && err >= 0.13) return { ...base, shape: 'polygon', x: b.x, y: b.y, w: b.w, h: b.h, points: corners }
  if (err < 0.2) return { ...base, shape: 'ellipse', x: b.x, y: b.y, w: b.w, h: b.h }
  return null
}

/** A straight 2-point version of a stroke (highlighter straight-line mode, ruler). */
export function straighten(points: number[]): number[] {
  const n = points.length
  if (n < 6) return points
  return [points[0], points[1], points[2], points[n - 3], points[n - 2], points[n - 1]]
}

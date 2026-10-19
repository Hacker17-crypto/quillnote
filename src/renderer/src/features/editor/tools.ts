/**
 * Pointer gestures for every page tool. A page surface calls `startGesture` on pointerdown and
 * forwards move/up to the returned gesture. Live previews are drawn straight into the page's
 * live <g> (no React renders while drawing).
 */
import { uid } from '@shared/docs'
import type { PageObject, ShapeObject, StickyObject, StrokeObject, TextObject } from '@shared/types'
import { session, useEditor } from '../../stores/editor'
import { ERASER_SIZES, useTools, type EraseFilter, type LassoFilter } from '../../stores/tools'
import { useUi } from '../../stores/ui'
import { bounds, eraseStroke, hitTest, inRect, pointInPolygon, recognizeShape, scale, straighten, translate, unionBounds, type Rect } from './geometry'
import { HIGHLIGHT_ALPHA, isFlat, penOpts, polylinePath, pressureOutline } from './ink'
import { shapeSvg } from './render'
import { laser } from './laser'
import { ruler } from './ruler'
import { STICKY_COLORS } from './render'

const SVG_NS = 'http://www.w3.org/2000/svg'

export interface ToolCtx {
  docId: string
  pageId: string
  svg: SVGSVGElement
  live: SVGGElement
  /** Screen pixels per page unit. */
  scale: number
}

export interface Gesture {
  move(e: PointerEvent): void
  up(e: PointerEvent): void
  cancel(): void
}

type Pt = [number, number, number]

function mapper(svg: SVGSVGElement): (e: { clientX: number; clientY: number; pressure?: number; pointerType?: string }) => Pt {
  const m = svg.getScreenCTM()?.inverse()
  return (e) => {
    const p = m ? new DOMPoint(e.clientX, e.clientY).matrixTransform(m) : new DOMPoint(e.clientX, e.clientY)
    const pr = e.pointerType === 'pen' ? (e.pressure && e.pressure > 0 ? e.pressure : 0.5) : 0.5
    return [p.x, p.y, pr]
  }
}

function events(e: PointerEvent): PointerEvent[] {
  const list = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : []
  return list.length ? list : [e]
}

const objectsOf = (ctx: ToolCtx): PageObject[] => session(ctx.docId)?.doc.pages.find((p) => p.id === ctx.pageId)?.objects ?? []
const edit = (ctx: ToolCtx, fn: (o: PageObject[]) => PageObject[], history = true): void =>
  useEditor.getState().editObjects(ctx.docId, ctx.pageId, fn, { history })

function recTag(docId: string): { rec?: string; t?: number } {
  const r = session(docId)?.recording
  if (!r) return {}
  const now = r.pausedAt ?? Date.now()
  return { rec: r.id, t: Math.max(0, now - r.startedAt - r.pausedMs) }
}

// ───────────────────────── entry ─────────────────────────
export function startGesture(ctx: ToolCtx, e: PointerEvent): Gesture | null {
  const s = session(ctx.docId)
  if (!s) return null
  const tools = useTools.getState()
  // Pen eraser end / barrel button erases.
  if (e.pointerType === 'pen' && (e.buttons & 32) === 32) return eraserGesture(ctx, e)
  if (s.readOnly) return tapeToggleGesture(ctx, e, true)
  switch (tools.tool) {
    case 'pen':
      if (tools.penKind === 'tape') return tapeGesture(ctx, e)
      return inkGesture(ctx, e)
    case 'eraser':
      return eraserGesture(ctx, e)
    case 'lasso':
      return lassoGesture(ctx, e)
    case 'text':
      return textGesture(ctx, e)
    case 'sticky':
      return stickyGesture(ctx, e)
    case 'laser':
      return laser.gesture(e)
    default:
      return null
  }
}

// ───────────────────────── pen / highlighter / shape ─────────────────────────
function inkGesture(ctx: ToolCtx, e: PointerEvent): Gesture {
  const tools = useTools.getState()
  const kind = tools.penKind
  const sw = tools[kind]
  const width = sw.widths[sw.width] ?? sw.widths[0]
  const color = sw.color
  const toPage = mapper(ctx.svg)
  const simulate = e.pointerType !== 'pen'
  const tool: StrokeObject['tool'] = kind === 'highlighter' ? 'highlighter' : kind === 'shape' ? 'ball' : tools.penType
  const opts = kind === 'pen' ? penOpts(tools.penType, tools.pen.sharpness, tools.pen.pressure, tools.pen.stabilization, simulate) : kind === 'shape' ? penOpts('ball', 50, 0, 50, true) : undefined
  const points: number[] = []
  const rulerLine = tools.ruler ? ruler.lineNear(e.clientX, e.clientY, ctx.svg) : null

  const g = document.createElementNS(SVG_NS, 'g')
  if (kind === 'highlighter') g.setAttribute('opacity', String(HIGHLIGHT_ALPHA))
  const path = document.createElementNS(SVG_NS, 'path')
  if (isFlat({ tool })) {
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', color)
    path.setAttribute('stroke-width', String(width))
    path.setAttribute('stroke-linejoin', 'round')
  } else path.setAttribute('fill', color)
  g.appendChild(path)
  ctx.live.appendChild(g)

  let snapped: ShapeObject | null = null
  let holdTimer = 0
  let lastMove = { x: e.clientX, y: e.clientY }

  const add = (ev: { clientX: number; clientY: number; pressure?: number; pointerType?: string }): void => {
    let [x, y, p] = toPage(ev)
    if (rulerLine) [x, y] = rulerLine.project(x, y)
    const n = points.length
    if (n && Math.hypot(points[n - 3] - x, points[n - 2] - y) < 0.35 / Math.max(ctx.scale, 0.2)) return
    points.push(x, y, p)
  }
  const draw = (): void => {
    if (snapped) return
    const pts = kind === 'highlighter' && tools.highlighter.straight ? straighten(points) : points
    path.setAttribute('d', isFlat({ tool }) ? polylinePath(pts) : pressureOutline(pts, width, opts, false))
  }
  const armHold = (): void => {
    window.clearTimeout(holdTimer)
    if (!tools.drawHold || kind === 'highlighter' || rulerLine) return
    holdTimer = window.setTimeout(() => {
      const shape = recognizeShape(points, { stroke: color, width: kind === 'shape' ? width : Math.max(width, 1), fill: null, dash: false })
      if (!shape) return
      snapped = shape
      path.remove()
      g.innerHTML = shapeSvg(shape)
    }, 550)
  }

  add(e)
  draw()
  armHold()
  return {
    move(ev) {
      if (snapped) {
        if (Math.hypot(ev.clientX - lastMove.x, ev.clientY - lastMove.y) > 6) {
          // moving after the snap stretches the recognised shape towards the pointer
          const [x, y] = toPage(ev)
          snapped = stretch(snapped, x, y)
          g.innerHTML = shapeSvg(snapped)
        }
        return
      }
      for (const c of events(ev)) add(c)
      draw()
      if (Math.hypot(ev.clientX - lastMove.x, ev.clientY - lastMove.y) > 3) {
        lastMove = { x: ev.clientX, y: ev.clientY }
        armHold()
      }
    },
    up() {
      window.clearTimeout(holdTimer)
      g.remove()
      if (!points.length) return
      const tag = recTag(ctx.docId)
      if (snapped) {
        const shape = snapped
        edit(ctx, (objs) => [...objs, shape])
        return
      }
      if (kind === 'shape') {
        const shape = recognizeShape(points, { stroke: color, width, fill: tools.shape.fill ? withAlpha(color, 0.18) : null, dash: tools.shape.dash })
        if (shape) {
          edit(ctx, (objs) => [...objs, shape])
          return
        }
      }
      const pts = kind === 'highlighter' && tools.highlighter.straight ? straighten(points) : points
      const stroke: StrokeObject = { id: uid(), type: 'stroke', tool, color, width, points: pts, ...(opts ? { opts } : {}), ...tag }
      if (kind === 'pen' && useUi.getState().settings?.gestures?.scribbleErase !== false && scribbleErase(ctx, pts)) return
      edit(ctx, (objs) => [...objs, stroke])
    },
    cancel() {
      window.clearTimeout(holdTimer)
      g.remove()
    }
  }
}

/** Resize a freshly snapped shape so its far corner follows the pointer. */
function stretch(s: ShapeObject, x: number, y: number): ShapeObject {
  if ((s.shape === 'line' || s.shape === 'arrow') && s.points) {
    const [x1, y1] = s.points
    return { ...s, points: [x1, y1, x, y], x: Math.min(x1, x), y: Math.min(y1, y), w: Math.abs(x - x1), h: Math.abs(y - y1) }
  }
  const w = Math.max(4, x - s.x)
  const h = Math.max(4, y - s.y)
  return scale(s, w / (s.w || 1), h / (s.h || 1), s.x, s.y)
}

export function withAlpha(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  return `#${m[1]}${Math.round(a * 255).toString(16).padStart(2, '0')}`
}

/** Zig-zag over existing ink erases it (Pen Gestures → scribble to erase). */
function scribbleErase(ctx: ToolCtx, pts: number[]): boolean {
  if (pts.length < 30) return false
  let turns = 0
  let prevDx = 0
  for (let i = 6; i < pts.length; i += 3) {
    const dx = pts[i] - pts[i - 6]
    if (Math.abs(dx) < 1.5) continue
    if (prevDx && Math.sign(dx) !== Math.sign(prevDx)) turns++
    prevDx = dx
  }
  if (turns < 6) return false
  const b: Rect = { x: Infinity, y: Infinity, w: 0, h: 0 }
  let x1 = -Infinity
  let y1 = -Infinity
  for (let i = 0; i < pts.length; i += 3) {
    b.x = Math.min(b.x, pts[i])
    b.y = Math.min(b.y, pts[i + 1])
    x1 = Math.max(x1, pts[i])
    y1 = Math.max(y1, pts[i + 1])
  }
  b.w = x1 - b.x
  b.h = y1 - b.y
  // dense back-and-forth: path length much longer than the box it covers
  let len = 0
  for (let i = 3; i < pts.length; i += 3) len += Math.hypot(pts[i] - pts[i - 3], pts[i + 1] - pts[i - 2])
  if (len < (b.w + b.h) * 3) return false
  const hit = objectsOf(ctx).filter((o) => o.type === 'stroke' && o.tool !== 'highlighter' && o.tool !== 'tape' && overlapRatio(bounds(o), b) > 0.5)
  if (!hit.length) return false
  const ids = new Set(hit.map((o) => o.id))
  edit(ctx, (objs) => objs.filter((o) => !ids.has(o.id)))
  return true
}

function overlapRatio(a: Rect, b: Rect): number {
  const w = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
  const h = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
  return (w * h) / Math.max(1, a.w * a.h)
}

// ───────────────────────── tape ─────────────────────────
function tapeToggleGesture(ctx: ToolCtx, e: PointerEvent, passive: boolean): Gesture | null {
  const [x, y] = mapper(ctx.svg)(e)
  const hit = [...objectsOf(ctx)].reverse().find((o) => o.type === 'stroke' && o.tool === 'tape' && hitTest(o, x, y, 3 / ctx.scale))
  if (!hit) return null
  const start = { x: e.clientX, y: e.clientY }
  return {
    move() {},
    up(ev) {
      if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 4) return
      // revealing tape is a viewing action, not an edit worth an undo step
      edit(ctx, (objs) => objs.map((o) => (o.id === hit.id && o.type === 'stroke' ? { ...o, revealed: !o.revealed } : o)), !passive)
    },
    cancel() {}
  }
}

function tapeGesture(ctx: ToolCtx, e: PointerEvent): Gesture {
  const toggle = tapeToggleGesture(ctx, e, false)
  const tools = useTools.getState()
  const sw = tools.tape
  const width = sw.widths[sw.width]
  const toPage = mapper(ctx.svg)
  const [sx, sy] = toPage(e)
  const g = document.createElementNS(SVG_NS, 'path')
  g.setAttribute('stroke', sw.color)
  g.setAttribute('stroke-width', String(width))
  g.setAttribute('fill', 'none')
  ctx.live.appendChild(g)
  let end: Pt = [sx, sy, 0.5]
  let moved = false
  return {
    move(ev) {
      end = toPage(ev)
      if (Math.hypot(end[0] - sx, end[1] - sy) * ctx.scale > 4) moved = true
      // tape is always laid straight
      g.setAttribute('d', `M${sx} ${sy}L${end[0]} ${end[1]}`)
    },
    up(ev) {
      g.remove()
      if (!moved) {
        toggle?.up(ev)
        return
      }
      const stroke: StrokeObject = { id: uid(), type: 'stroke', tool: 'tape', color: sw.color, width, points: [sx, sy, 0.5, end[0], end[1], 0.5] }
      edit(ctx, (objs) => [...objs, stroke])
    },
    cancel() {
      g.remove()
    }
  }
}

// ───────────────────────── eraser ─────────────────────────
function eraseClass(o: PageObject): EraseFilter {
  switch (o.type) {
    case 'stroke':
      return o.tool === 'highlighter' ? 'highlighter' : o.tool === 'tape' ? 'tape' : 'pen'
    case 'shape':
      return 'shapes'
    case 'image':
      return 'images'
    case 'sticker':
      return 'stickers'
    default:
      return 'text'
  }
}

function eraserGesture(ctx: ToolCtx, e: PointerEvent): Gesture {
  const tools = useTools.getState()
  const { mode, filters } = tools.eraser
  const px = ERASER_SIZES[tools.eraser.size] * (mode === 'precise' ? 0.6 : 1)
  const r = px / ctx.scale
  const toPage = mapper(ctx.svg)
  const cursor = document.createElementNS(SVG_NS, 'circle')
  cursor.setAttribute('r', String(r))
  cursor.setAttribute('fill', 'rgba(255,255,255,.35)')
  cursor.setAttribute('stroke', 'rgba(60,60,60,.7)')
  cursor.setAttribute('stroke-width', String(1 / ctx.scale))
  ctx.live.appendChild(cursor)
  useEditor.getState().beginGesture(ctx.docId)
  let last: [number, number] | null = null

  const eraseAt = (x: number, y: number): void => {
    edit(
      ctx,
      (objs) => {
        let changed = false
        const out: PageObject[] = []
        for (const o of objs) {
          if (!filters[eraseClass(o)]) {
            out.push(o)
            continue
          }
          if (o.type === 'stroke' && mode !== 'stroke') {
            const pieces = eraseStroke(o, x, y, r)
            if (pieces) {
              changed = true
              out.push(...pieces)
            } else out.push(o)
            continue
          }
          if (hitTest(o, x, y, r)) changed = true
          else out.push(o)
        }
        return changed ? out : objs
      },
      false
    )
  }
  const step = (ev: PointerEvent): void => {
    for (const c of events(ev)) {
      const [x, y] = toPage(c)
      if (last) {
        const d = Math.hypot(x - last[0], y - last[1])
        const n = Math.ceil(d / Math.max(r * 0.5, 0.5))
        for (let i = 1; i <= n; i++) eraseAt(last[0] + ((x - last[0]) * i) / n, last[1] + ((y - last[1]) * i) / n)
      } else eraseAt(x, y)
      last = [x, y]
      cursor.setAttribute('cx', String(x))
      cursor.setAttribute('cy', String(y))
    }
  }
  step(e)
  const finish = (): void => {
    cursor.remove()
    useEditor.getState().endGesture(ctx.docId)
  }
  return {
    move: step,
    up() {
      finish()
      const t = useTools.getState()
      if (t.eraser.autoDeselect && t.tool === 'eraser') t.setTool(t.prevTool)
    },
    cancel: finish
  }
}

// ───────────────────────── lasso & selection ─────────────────────────
function lassoClass(o: PageObject): LassoFilter {
  switch (o.type) {
    case 'stroke':
      return 'handwriting'
    case 'shape':
      return 'shapes'
    case 'image':
      return 'images'
    case 'sticker':
      return 'stickers'
    default:
      return 'text'
  }
}

export function selectionBounds(docId: string): Rect | null {
  const s = session(docId)
  if (!s?.selection) return null
  const page = s.doc.pages.find((p) => p.id === s.selection?.pageId)
  if (!page) return null
  const ids = new Set(s.selection.ids)
  return unionBounds(page.objects.filter((o) => ids.has(o.id)))
}

function lassoGesture(ctx: ToolCtx, e: PointerEvent): Gesture | null {
  const s = session(ctx.docId)
  const toPage = mapper(ctx.svg)
  const [x0, y0] = toPage(e)
  const handle = (e.target as Element | null)?.closest?.('[data-handle]')?.getAttribute('data-handle')
  const sel = s?.selection?.pageId === ctx.pageId ? s.selection : null
  const sb = sel ? selectionBounds(ctx.docId) : null
  const tol = 6 / ctx.scale

  if (sel && sb && handle) return scaleGesture(ctx, sel.ids, sb, handle, toPage)
  if (sel && sb && inRect(sb, x0, y0, tol)) return moveGesture(ctx, sel.ids, toPage, [x0, y0])

  // Tap on an object selects it directly.
  const objs = objectsOf(ctx)
  const filters = useTools.getState().lasso.filters
  const direct = [...objs].reverse().find((o) => o.type !== 'stroke' && filters[lassoClass(o)] && hitTest(o, x0, y0, tol))
  if (direct) {
    useEditor.getState().view(ctx.docId, { selection: { pageId: ctx.pageId, ids: [direct.id] }, editing: null })
    return moveGesture(ctx, [direct.id], toPage, [x0, y0])
  }

  useEditor.getState().view(ctx.docId, { selection: null, editing: null })
  const rectMode = useTools.getState().lasso.mode === 'rect'
  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute('fill', 'rgba(12,140,243,.06)')
  path.setAttribute('stroke', '#0C8CF3')
  path.setAttribute('stroke-width', String(1.4 / ctx.scale))
  path.setAttribute('stroke-dasharray', `${5 / ctx.scale} ${4 / ctx.scale}`)
  ctx.live.appendChild(path)
  const poly: number[] = [x0, y0]
  let cur: [number, number] = [x0, y0]
  const ring = (): number[] => (rectMode ? [x0, y0, cur[0], y0, cur[0], cur[1], x0, cur[1]] : poly)
  return {
    move(ev) {
      for (const c of events(ev)) {
        const [x, y] = toPage(c)
        cur = [x, y]
        if (!rectMode) poly.push(x, y)
      }
      const r = ring()
      let d = `M${r[0]} ${r[1]}`
      for (let i = 2; i < r.length; i += 2) d += `L${r[i]} ${r[i + 1]}`
      path.setAttribute('d', d + 'Z')
    },
    up() {
      path.remove()
      const r = ring()
      if (r.length < 6) return
      const inside = (x: number, y: number): boolean => pointInPolygon(r, x, y)
      const ids: string[] = []
      for (const o of objectsOf(ctx)) {
        if (!filters[lassoClass(o)]) continue
        if (o.type === 'stroke') {
          let n = 0
          let total = 0
          for (let i = 0; i < o.points.length; i += 3) {
            total++
            if (inside(o.points[i], o.points[i + 1])) n++
          }
          if (total && n / total >= 0.6) ids.push(o.id)
        } else {
          const b = bounds(o)
          if (inside(b.x + b.w / 2, b.y + b.h / 2)) ids.push(o.id)
        }
      }
      if (ids.length) useEditor.getState().view(ctx.docId, { selection: { pageId: ctx.pageId, ids } })
    },
    cancel() {
      path.remove()
    }
  }
}

function moveGesture(ctx: ToolCtx, ids: string[], toPage: (e: PointerEvent) => Pt, start: [number, number]): Gesture {
  const set = new Set(ids)
  const before = objectsOf(ctx)
  let moved = false
  useEditor.getState().beginGesture(ctx.docId)
  return {
    move(ev) {
      const [x, y] = toPage(ev)
      const dx = x - start[0]
      const dy = y - start[1]
      if (!moved && Math.hypot(dx, dy) * ctx.scale < 3) return
      moved = true
      edit(ctx, () => before.map((o) => (set.has(o.id) ? translate(o, dx, dy) : o)), false)
    },
    up() {
      useEditor.getState().endGesture(ctx.docId)
    },
    cancel() {
      edit(ctx, () => before, false)
      useEditor.getState().endGesture(ctx.docId)
    }
  }
}

function scaleGesture(ctx: ToolCtx, ids: string[], b: Rect, handle: string, toPage: (e: PointerEvent) => Pt): Gesture {
  const set = new Set(ids)
  const before = objectsOf(ctx)
  // anchor = opposite corner
  const ax = handle.includes('w') ? b.x + b.w : b.x
  const ay = handle.includes('n') ? b.y + b.h : b.y
  const keepRatio = before.some((o) => set.has(o.id) && (o.type === 'image' || o.type === 'sticker' || o.type === 'stroke'))
  useEditor.getState().beginGesture(ctx.docId)
  return {
    move(ev) {
      const [x, y] = toPage(ev)
      let sx = handle.includes('e') || handle.includes('w') ? Math.abs(x - ax) / (b.w || 1) : 1
      let sy = handle.includes('n') || handle.includes('s') ? Math.abs(y - ay) / (b.h || 1) : 1
      if (keepRatio && handle.length === 2) sx = sy = Math.max(sx, sy)
      sx = Math.max(0.05, sx)
      sy = Math.max(0.05, sy)
      edit(ctx, () => before.map((o) => (set.has(o.id) ? scale(o, sx, sy, ax, ay) : o)), false)
    },
    up() {
      useEditor.getState().endGesture(ctx.docId)
    },
    cancel() {
      edit(ctx, () => before, false)
      useEditor.getState().endGesture(ctx.docId)
    }
  }
}

// ───────────────────────── text & sticky ─────────────────────────
function textGesture(ctx: ToolCtx, e: PointerEvent): Gesture | null {
  const [x, y] = mapper(ctx.svg)(e)
  const hit = [...objectsOf(ctx)].reverse().find((o) => (o.type === 'text' || o.type === 'sticky') && hitTest(o, x, y, 2 / ctx.scale))
  if (hit) {
    useEditor.getState().view(ctx.docId, { editing: hit.id, selection: null })
    return null
  }
  const t = useTools.getState().text
  const box: TextObject = { id: uid(), type: 'text', x, y: y - t.size * 0.7, w: 260, h: t.size * 1.4 + 8, html: '', font: t.font, size: t.size, color: t.color, align: 'left', bg: null }
  edit(ctx, (objs) => [...objs, box])
  useEditor.getState().view(ctx.docId, { editing: box.id, selection: null })
  return null
}

function stickyGesture(ctx: ToolCtx, e: PointerEvent): Gesture | null {
  const [x, y] = mapper(ctx.svg)(e)
  const hit = [...objectsOf(ctx)].reverse().find((o) => o.type === 'sticky' && hitTest(o, x, y, 2 / ctx.scale))
  if (hit) {
    useEditor.getState().view(ctx.docId, { editing: hit.id, selection: null })
    return null
  }
  const note: StickyObject = {
    id: uid(), type: 'sticky', x: x - 90, y: y - 20, w: 180, h: 180,
    color: STICKY_COLORS[useTools.getState().sticky.color] ?? STICKY_COLORS[0], text: '', collapsed: false
  }
  edit(ctx, (objs) => [...objs, note])
  useEditor.getState().view(ctx.docId, { editing: note.id, selection: null })
  return null
}

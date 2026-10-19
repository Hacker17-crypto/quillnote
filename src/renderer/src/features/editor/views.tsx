/**
 * Scrolling page view (notebooks, PDFs, images) and the infinite whiteboard canvas.
 * Both handle zoom (Ctrl+wheel / pinch / zoom pill), panning (space-drag, middle-drag, two fingers)
 * and render only the pages near the viewport.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useEditor, useSession, session } from '../../stores/editor'
import { useUi } from '../../stores/ui'
import { PageSurface } from './PageSurface'
import { unionBounds } from './geometry'

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 4
const GAP = 14
const clampZoom = (z: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

/** Zoom anchor (viewport-relative point that should stay put) for the next zoom change. */
const anchors = new Map<string, { x: number; y: number }>()

export function zoomBy(docId: string, factor: number, anchor?: { x: number; y: number }): void {
  const s = session(docId)
  if (!s) return
  if (anchor) anchors.set(docId, anchor)
  useEditor.getState().view(docId, { zoom: clampZoom(Math.round(s.zoom * factor * 100) / 100) })
}

export function setZoom(docId: string, zoom: number): void {
  useEditor.getState().view(docId, { zoom: clampZoom(zoom) })
}

/** Shared pan/pinch handling for a scroll container or canvas. */
function usePanZoom(
  el: React.RefObject<HTMLElement>,
  docId: string,
  pan: (dx: number, dy: number) => void
): void {
  useEffect(() => {
    const node = el.current
    if (!node) return
    let space = false
    const touches = new Map<number, { x: number; y: number }>()
    let pinch: { dist: number; cx: number; cy: number } | null = null
    let drag: { id: number; x: number; y: number } | null = null

    const onKey = (e: KeyboardEvent): void => {
      if (e.code !== 'Space' || (e.target as HTMLElement)?.isContentEditable || /INPUT|TEXTAREA/.test((e.target as HTMLElement)?.tagName ?? '')) return
      space = e.type === 'keydown'
      node.classList.toggle('grab', space)
      if (space) e.preventDefault()
    }
    const onWheel = (e: WheelEvent): void => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const r = node.getBoundingClientRect()
        zoomBy(docId, Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0022)), { x: e.clientX - r.left, y: e.clientY - r.top })
      }
    }
    const cancelDrawing = (): void => node.querySelectorAll('svg.pg-svg').forEach((s) => s.dispatchEvent(new Event('qn-cancel-gesture')))
    const onDown = (e: PointerEvent): void => {
      if (e.pointerType === 'touch') {
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
        const stylusOnly = useUi.getState().settings?.onlyDrawWithStylus
        if (touches.size === 2) {
          cancelDrawing()
          const [a, b] = [...touches.values()]
          pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }
          drag = null
        } else if (stylusOnly && touches.size === 1) drag = { id: e.pointerId, x: e.clientX, y: e.clientY }
        return
      }
      if (e.button === 1 || (space && e.button === 0)) {
        e.preventDefault()
        e.stopPropagation()
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY }
        node.setPointerCapture(e.pointerId)
        node.classList.add('grabbing')
      }
    }
    const onMove = (e: PointerEvent): void => {
      if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (pinch && touches.size >= 2) {
          const [a, b] = [...touches.values()]
          const dist = Math.hypot(a.x - b.x, a.y - b.y)
          const cx = (a.x + b.x) / 2
          const cy = (a.y + b.y) / 2
          pan(pinch.cx - cx, pinch.cy - cy)
          const r = node.getBoundingClientRect()
          if (Math.abs(dist / pinch.dist - 1) > 0.02) {
            zoomBy(docId, dist / pinch.dist, { x: cx - r.left, y: cy - r.top })
            pinch.dist = dist
          }
          pinch.cx = cx
          pinch.cy = cy
          return
        }
      }
      if (drag?.id === e.pointerId) {
        pan(drag.x - e.clientX, drag.y - e.clientY)
        drag.x = e.clientX
        drag.y = e.clientY
      }
    }
    const onUp = (e: PointerEvent): void => {
      touches.delete(e.pointerId)
      if (touches.size < 2) pinch = null
      if (drag?.id === e.pointerId) {
        drag = null
        node.classList.remove('grabbing')
      }
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    node.addEventListener('pointerdown', onDown, true)
    node.addEventListener('pointermove', onMove, true)
    node.addEventListener('pointerup', onUp, true)
    node.addEventListener('pointercancel', onUp, true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      node.removeEventListener('wheel', onWheel)
      node.removeEventListener('pointerdown', onDown, true)
      node.removeEventListener('pointermove', onMove, true)
      node.removeEventListener('pointerup', onUp, true)
      node.removeEventListener('pointercancel', onUp, true)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [el, docId, pan])
}

// ───────────────────────── paged documents ─────────────────────────
export function NotebookView({ docId, active }: { docId: string; active: boolean }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const pages = useSession(docId, (s) => s.doc.pages)
  const zoom = useSession(docId, (s) => s.zoom)
  const jump = useSession(docId, (s) => s.jump)
  const panel = useSession(docId, (s) => s.panel)
  const horizontal = useUi((s) => s.settings?.scrollDirection === 'horizontal')
  const [visible, setVisible] = useState<Set<number>>(() => new Set([0, 1]))
  const prevZoom = useRef(zoom)

  // Fit the widest page to the viewport the first time.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || zoom > 0 || !pages.length || !el.clientWidth) return
    const maxW = Math.max(...pages.map((p) => p.width))
    const maxH = Math.max(...pages.map((p) => p.height))
    const byW = (el.clientWidth - 120) / maxW
    const byH = (el.clientHeight - 48) / maxH
    const fit = horizontal ? byH : maxW > maxH ? byW : Math.min(byW, Math.max(byH * 1.35, 0.9))
    prevZoom.current = clampZoom(fit)
    useEditor.getState().view(docId, { zoom: clampZoom(fit) })
  }, [zoom, pages, docId, horizontal, active])

  // Keep the anchor point fixed while zooming.
  useLayoutEffect(() => {
    const el = ref.current
    const before = prevZoom.current
    prevZoom.current = zoom
    if (!el || !before || before === zoom) return
    const a = anchors.get(docId) ?? { x: el.clientWidth / 2, y: el.clientHeight / 2 }
    anchors.delete(docId)
    const k = zoom / before
    el.scrollLeft = (el.scrollLeft + a.x) * k - a.x
    el.scrollTop = (el.scrollTop + a.y) * k - a.y
  }, [zoom, docId])

  // Which pages are near the viewport.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        setVisible((prev) => {
          const next = new Set(prev)
          for (const en of entries) {
            const i = Number((en.target as HTMLElement).dataset.slot)
            if (en.isIntersecting) next.add(i)
            else next.delete(i)
          }
          return next
        })
      },
      { root: el, rootMargin: '120% 120%' }
    )
    el.querySelectorAll('[data-slot]').forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [pages.length, zoom, horizontal])

  // Track the current page while scrolling.
  const onScroll = useCallback(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const mid = horizontal ? r.left + r.width / 2 : r.top + r.height / 2
    let best = 0
    let bestD = Infinity
    el.querySelectorAll<HTMLElement>('[data-slot]').forEach((n) => {
      const b = n.getBoundingClientRect()
      const c = horizontal ? b.left + b.width / 2 : b.top + b.height / 2
      const d = Math.abs(c - mid)
      if (d < bestD) {
        bestD = d
        best = Number(n.dataset.slot)
      }
    })
    if (session(docId)?.page !== best) useEditor.getState().view(docId, { page: best })
  }, [docId, horizontal])

  // Jump requests (page counter, sidebar, search results).
  useEffect(() => {
    const el = ref.current
    if (!el || !jump) return
    const slot = el.querySelector<HTMLElement>(`[data-slot="${jump.page}"]`)
    if (!slot) return
    if (horizontal) el.scrollTo({ left: slot.offsetLeft - (el.clientWidth - slot.offsetWidth) / 2, behavior: 'auto' })
    else el.scrollTo({ top: slot.offsetTop - 16 + (jump.y !== undefined ? Math.max(0, jump.y * zoom - el.clientHeight / 3) : 0), behavior: 'auto' })
    useEditor.getState().view(docId, { page: jump.page, jump: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump])

  const pan = useCallback((dx: number, dy: number) => {
    const el = ref.current
    if (!el) return
    el.scrollLeft += dx
    el.scrollTop += dy
  }, [])
  usePanZoom(ref, docId, pan)

  // Plain wheel scrolls sideways in horizontal mode.
  useEffect(() => {
    const el = ref.current
    if (!el || !horizontal) return
    const onWheel = (e: WheelEvent): void => {
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [horizontal])

  const z = zoom || 1
  return (
    <div ref={ref} className={`nb-scroll${horizontal ? ' horizontal' : ''}${panel ? ' with-panel' : ''}`} onScroll={onScroll}>
      <div className="nb-column" style={{ gap: GAP }}>
        {pages.map((p, i) => (
          <div key={p.id} className="pg-slot" data-slot={i} style={{ width: p.width * z, height: p.height * z }}>
            {zoom > 0 && visible.has(i) ? (
              <PageSurface docId={docId} page={p} index={i} width={p.width * z} height={p.height * z} />
            ) : (
              <div className="pg-placeholder" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ───────────────────────── infinite whiteboard ─────────────────────────
const boardViews = new Map<string, { x: number; y: number }>()

export function WhiteboardView({ docId }: { docId: string }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const page = useSession(docId, (s) => s.doc.pages[0])
  const zoom = useSession(docId, (s) => s.zoom)
  const jump = useSession(docId, (s) => s.jump)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [origin, setOrigin] = useState(() => boardViews.get(docId) ?? { x: 0, y: 0 })
  const prevZoom = useRef(zoom)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // First open: zoom 100%, content (or the origin) in view.
  useLayoutEffect(() => {
    if (zoom > 0 || !size.w || !page) return
    const b = unionBounds(page.objects)
    if (b && !boardViews.has(docId)) setOrigin({ x: b.x - 60, y: b.y - 60 })
    prevZoom.current = 1
    useEditor.getState().view(docId, { zoom: 1 })
  }, [zoom, size.w, page, docId])

  useLayoutEffect(() => {
    const before = prevZoom.current
    prevZoom.current = zoom
    if (!before || before === zoom || !size.w) return
    const a = anchors.get(docId) ?? { x: size.w / 2, y: size.h / 2 }
    anchors.delete(docId)
    setOrigin((o) => ({ x: o.x + a.x / before - a.x / zoom, y: o.y + a.y / before - a.y / zoom }))
  }, [zoom, docId, size])

  useEffect(() => {
    boardViews.set(docId, origin)
  }, [docId, origin])

  useEffect(() => {
    if (!jump) return
    if (jump.y !== undefined) setOrigin((o) => ({ x: o.x, y: (jump.y ?? 0) - size.h / (2 * (zoom || 1)) }))
    useEditor.getState().view(docId, { jump: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump])

  const pan = useCallback(
    (dx: number, dy: number) => {
      const z = session(docId)?.zoom || 1
      setOrigin((o) => ({ x: o.x + dx / z, y: o.y + dy / z }))
    },
    [docId]
  )
  usePanZoom(ref, docId, pan)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (e: WheelEvent): void => {
      if (e.ctrlKey || e.metaKey) return
      e.preventDefault()
      const k = e.deltaMode === 1 ? 20 : 1
      pan(e.shiftKey ? e.deltaY * k : e.deltaX * k, e.shiftKey ? 0 : e.deltaY * k)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [pan])

  const z = zoom || 1
  return (
    <div ref={ref} className="wb-view">
      {page && size.w > 0 && zoom > 0 && (
        <PageSurface docId={docId} page={page} index={0} width={size.w} height={size.h} view={{ x: origin.x, y: origin.y, w: size.w / z, h: size.h / z }} />
      )}
    </div>
  )
}

/** Viewport centre of the active view in page units (for placing pasted / inserted things). */
export function viewCenter(docId: string): { page: number; x: number; y: number } {
  const s = session(docId)
  if (!s) return { page: 0, x: 100, y: 100 }
  const page = s.doc.pages[s.page] ?? s.doc.pages[0]
  if (page?.infinite) {
    const o = boardViews.get(docId) ?? { x: 0, y: 0 }
    const el = document.querySelector<HTMLElement>(`.editor[data-doc="${docId}"] .wb-view`)
    const z = s.zoom || 1
    return { page: 0, x: o.x + (el?.clientWidth ?? 800) / (2 * z), y: o.y + (el?.clientHeight ?? 600) / (2 * z) }
  }
  // centre of the visible part of the current page
  const slot = document.querySelector<HTMLElement>(`.editor[data-doc="${docId}"] [data-slot="${s.page}"]`)
  const scroller = slot?.closest<HTMLElement>('.nb-scroll')
  if (slot && scroller && page) {
    const sr = slot.getBoundingClientRect()
    const vr = scroller.getBoundingClientRect()
    const cy = (Math.max(sr.top, vr.top) + Math.min(sr.bottom, vr.bottom)) / 2
    const z = s.zoom || 1
    return { page: s.page, x: page.width / 2, y: Math.min(page.height - 40, Math.max(40, (cy - sr.top) / z)) }
  }
  return { page: s.page, x: (page?.width ?? 600) / 2, y: (page?.height ?? 800) / 3 }
}

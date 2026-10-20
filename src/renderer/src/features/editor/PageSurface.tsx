/**
 * One page: background (paper template, PDF page or image), objects, live-drawing layer,
 * selection chrome and in-place text / sticky-note editing. Infinite whiteboards pass `view`.
 */
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { paperBackground, paperSvg } from '@shared/paper'
import type { PageData, PageObject, StickyObject, TextObject } from '@shared/types'
import { session, useEditor, useSession } from '../../stores/editor'
import { ERASER_SIZES, useTools } from '../../stores/tools'
import { useUi } from '../../stores/ui'
import { bounds, type Rect } from './geometry'
import { HIGHLIGHT_ALPHA } from './ink'
import { pdfLinks, renderPdfPage, type PdfLink } from './pdf'
import { assetUrl, layerOf, objectSvg, setRootAttrs, textStyle } from './render'
import { selectionBounds, startGesture, type Gesture } from './tools'

const paperCache = new Map<string, string>()
function paperMarkup(page: PageData): string {
  const key = JSON.stringify(page.paper)
  let svg = paperCache.get(key)
  if (!svg) {
    svg = setRootAttrs(paperSvg(page.paper), { preserveAspectRatio: 'none', width: '100%', height: '100%', style: 'display:block' })
    paperCache.set(key, svg)
  }
  return svg
}

// ───────────────────────── backgrounds ─────────────────────────
function PdfBackground({ docId, page, width }: { docId: string; page: PageData; width: number }): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  // re-render the bitmap once zoom settles; CSS scales the old one meanwhile
  const [w, setW] = useState(width)
  useEffect(() => {
    const t = window.setTimeout(() => setW(width), 160)
    return () => window.clearTimeout(t)
  }, [width])
  useEffect(() => {
    const c = ref.current
    if (!c || page.background?.type !== 'pdf') return
    return renderPdfPage(docId, page.background.asset, page.background.pdfPage ?? 0, c, w, () => setReady(true))
  }, [docId, page.background, w])
  return (
    <div className="pg-bg" style={{ background: '#fff' }}>
      <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block', opacity: ready ? 1 : 0, transition: 'opacity .15s' }} />
    </div>
  )
}

export const PageBackground = memo(function PageBackground({ docId, page, width }: { docId: string; page: PageData; width: number }): JSX.Element {
  if (page.background?.type === 'pdf') return <PdfBackground docId={docId} page={page} width={width} />
  if (page.background?.type === 'image' && page.background.asset)
    return (
      <div className="pg-bg" style={{ background: '#fff' }}>
        <img src={assetUrl(docId, page.background.asset)} alt="" draggable={false} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
    )
  return <div className="pg-bg" style={{ background: paperBackground(page.paper.color) }} dangerouslySetInnerHTML={{ __html: paperMarkup(page) }} />
})

// ───────────────────────── objects ─────────────────────────
const ObjG = memo(function ObjG({ o, docId, dim }: { o: PageObject; docId: string; dim: boolean }): JSX.Element {
  return <g data-id={o.id} opacity={dim ? 0.22 : undefined} dangerouslySetInnerHTML={{ __html: objectSvg(o, docId) }} />
})

function TextBox({ docId, pageId, o, editing, scale }: { docId: string; pageId: string; o: TextObject; editing: boolean; scale: number }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef(0)

  useLayoutEffect(() => {
    if (!editing) return
    const el = ref.current
    if (!el) return
    el.innerHTML = o.html
    el.focus({ preventScroll: true })
    // caret at the end
    const r = document.createRange()
    r.selectNodeContents(el)
    r.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(r)
    useEditor.getState().beginGesture(docId)
    return () => {
      window.clearTimeout(timer.current)
      commit(true)
      useEditor.getState().endGesture(docId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  const commit = (final: boolean): void => {
    const el = ref.current
    if (!el) return
    const html = el.innerHTML.replace(/^<br>$/, '')
    const h = Math.max((o.size ?? 16) * 1.4 + 8, el.scrollHeight)
    const empty = !el.textContent?.trim() && !/<img/i.test(html)
    useEditor.getState().editObjects(docId, pageId, (objs) => {
      if (final && empty) return objs.filter((x) => x.id !== o.id)
      return objs.map((x) => (x.id === o.id && x.type === 'text' && (x.html !== html || Math.abs(x.h - h) > 0.5) ? { ...x, html, h } : x))
    })
  }

  if (!editing)
    return (
      <g data-id={o.id}>
        <foreignObject x={o.x} y={o.y} width={o.w} height={o.h} style={{ overflow: 'visible' }}>
          <div className="qn-text" style={cssOf(textStyle(o))} dangerouslySetInnerHTML={{ __html: o.html }} />
        </foreignObject>
      </g>
    )
  return (
    <g data-id={o.id} data-editing="">
      <foreignObject x={o.x} y={o.y} width={o.w} height={Math.max(o.h, 2000)} style={{ overflow: 'visible' }}>
        <div
          ref={ref}
          className="qn-text editing"
          contentEditable
          suppressContentEditableWarning
          spellCheck
          data-textbox={o.id}
          style={{ ...cssOf(textStyle(o)), minHeight: o.h, outline: 'none', userSelect: 'text', cursor: 'text' }}
          onInput={() => {
            window.clearTimeout(timer.current)
            timer.current = window.setTimeout(() => commit(false), 350)
          }}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Escape') useEditor.getState().view(docId, { editing: null })
          }}
          onPaste={(e) => {
            // keep pasted text plain so foreign styles don't leak in
            const text = e.clipboardData.getData('text/plain')
            if (!text) return
            e.preventDefault()
            document.execCommand('insertText', false, text)
          }}
        />
      </foreignObject>
      <rect x={o.x - 2 / scale} y={o.y - 2 / scale} width={o.w + 4 / scale} height={o.h + 4 / scale} fill="none" stroke="#0C8CF3" strokeWidth={1.2 / scale} strokeDasharray={`${4 / scale} ${3 / scale}`} pointerEvents="none" />
      <g data-tb="move" style={{ cursor: 'move' }}>
        <rect x={o.x - 14 / scale} y={o.y - 14 / scale} width={14 / scale} height={14 / scale} rx={3 / scale} fill="#0C8CF3" />
        <path d={`M${o.x - 10 / scale} ${o.y - 9 / scale}h${6 / scale}M${o.x - 10 / scale} ${o.y - 6 / scale}h${6 / scale}`} stroke="#fff" strokeWidth={1.2 / scale} />
      </g>
      <circle data-tb="resize" cx={o.x + o.w + 2 / scale} cy={o.y + o.h / 2} r={5 / scale} fill="#fff" stroke="#0C8CF3" strokeWidth={1.5 / scale} style={{ cursor: 'ew-resize' }} />
    </g>
  )
}

function StickyEdit({ docId, pageId, o }: { docId: string; pageId: string; o: StickyObject }): JSX.Element {
  const [text, setText] = useState(o.text)
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
    useEditor.getState().beginGesture(docId)
    return () => useEditor.getState().endGesture(docId)
  }, [docId])
  useEffect(() => {
    const t = window.setTimeout(() => {
      useEditor.getState().editObjects(docId, pageId, (objs) => objs.map((x) => (x.id === o.id && x.type === 'sticky' && x.text !== text ? { ...x, text } : x)))
    }, 300)
    return () => window.clearTimeout(t)
  }, [text, docId, pageId, o.id])
  useEffect(
    () => () => {
      // flush on unmount
      const t = ref.current?.value
      if (t !== undefined) useEditor.getState().editObjects(docId, pageId, (objs) => objs.map((x) => (x.id === o.id && x.type === 'sticky' && x.text !== t ? { ...x, text: t } : x)))
    },
    [docId, pageId, o.id]
  )
  return (
    <g data-id={o.id} data-editing="">
      <rect x={o.x + 2} y={o.y + 3} width={o.w} height={o.h} rx={4} fill="rgba(0,0,0,.12)" />
      <rect x={o.x} y={o.y} width={o.w} height={o.h} rx={4} fill={o.color} stroke="#0C8CF3" strokeWidth={1.2} />
      <foreignObject x={o.x} y={o.y} width={o.w} height={o.h}>
        <textarea
          ref={ref}
          className="sticky-input"
          value={text}
          placeholder="Write a note…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Escape') useEditor.getState().view(docId, { editing: null })
          }}
        />
      </foreignObject>
    </g>
  )
}

function cssOf(style: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of style.split(';')) {
    const i = part.indexOf(':')
    if (i < 0) continue
    const k = part.slice(0, i).trim().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
    out[k] = part.slice(i + 1).trim()
  }
  return out
}

// ───────────────────────── selection chrome ─────────────────────────
function SelectionChrome({ b, scale }: { b: Rect; scale: number }): JSX.Element {
  const pad = 6 / scale
  const r = { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 }
  const hs = 9 / scale
  const handles: [string, number, number][] = [
    ['nw', r.x, r.y], ['n', r.x + r.w / 2, r.y], ['ne', r.x + r.w, r.y], ['e', r.x + r.w, r.y + r.h / 2],
    ['se', r.x + r.w, r.y + r.h], ['s', r.x + r.w / 2, r.y + r.h], ['sw', r.x, r.y + r.h], ['w', r.x, r.y + r.h / 2]
  ]
  const cursors: Record<string, string> = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' }
  return (
    <g className="sel-chrome">
      <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="rgba(12,140,243,.05)" stroke="#0C8CF3" strokeWidth={1.3 / scale} strokeDasharray={`${5 / scale} ${4 / scale}`} style={{ cursor: 'move' }} />
      {handles.map(([id, x, y]) => (
        <circle key={id} data-handle={id} cx={x} cy={y} r={hs / 2} fill="#fff" stroke="#0C8CF3" strokeWidth={1.5 / scale} style={{ cursor: cursors[id] }} />
      ))}
    </g>
  )
}

// ───────────────────────── surface ─────────────────────────
interface PageSurfaceProps {
  docId: string
  page: PageData
  index: number
  /** CSS size of the page box. */
  width: number
  height: number
  /** Infinite canvas: visible region in page units. */
  view?: Rect
  interactive?: boolean
}

export const PageSurface = memo(function PageSurface({ docId, page, index, width, height, view, interactive = true }: PageSurfaceProps): JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null)
  const liveRef = useRef<SVGGElement>(null)
  const gesture = useRef<{ g: Gesture; id: number } | null>(null)
  const tool = useTools((s) => s.tool)
  const eraserSize = useTools((s) => s.eraser.size)
  const selection = useSession(docId, (s) => (s.selection?.pageId === page.id ? s.selection : null))
  const editing = useSession(docId, (s) => s.editing)
  const readOnly = useSession(docId, (s) => s.readOnly)
  const hits = useSession(docId, (s) => s.hits)
  const playback = useSession(docId, (s) => s.playback)
  const stylusOnly = useUi((s) => s.settings?.onlyDrawWithStylus ?? false)
  const vb = view ?? { x: 0, y: 0, w: page.width, h: page.height }
  const scale = width / vb.w
  const [links, setLinks] = useState<PdfLink[]>([])

  useEffect(() => {
    if (!readOnly || page.background?.type !== 'pdf') return setLinks([])
    let live = true
    void pdfLinks(docId, page.background.asset, page.background.pdfPage ?? 0).then((l) => live && setLinks(l)).catch(() => undefined)
    return () => {
      live = false
    }
  }, [readOnly, docId, page.background])

  const layers = useMemo(() => {
    const media: PageObject[] = []
    const hl: PageObject[] = []
    const top: PageObject[] = []
    for (const o of page.objects) {
      const l = layerOf(o)
      ;(l === 'media' ? media : l === 'highlight' ? hl : top).push(o)
    }
    return { media, hl, top }
  }, [page.objects])

  const selBounds = useMemo(() => (selection ? selectionBounds(docId) : null), [selection, page.objects, docId])

  const dimmed = (o: PageObject): boolean => !!playback && o.type === 'stroke' && o.rec === playback.rec && (o.t ?? 0) > playback.t

  const onPointerDown = (e: RPointerEvent<SVGSVGElement>): void => {
    if (!interactive) return
    const native = e.nativeEvent
    if (e.button === 1 || e.button === 2) return
    if (e.pointerType === 'touch' && stylusOnly) return
    if (gesture.current) return
    const target = e.target as Element
    if (target.closest('[data-editing] foreignObject')) return
    const svg = svgRef.current
    const live = liveRef.current
    if (!svg || !live) return
    // Keep focus where tools put it (new text boxes, sticky notes) and stop text selection.
    e.preventDefault()

    const tb = target.closest('[data-tb]')
    const s = session(docId)
    if (tb && s?.editing) {
      const g = textBoxGesture(docId, page.id, s.editing, tb.getAttribute('data-tb') as 'move' | 'resize', svg, native)
      if (g) {
        svg.setPointerCapture(e.pointerId)
        gesture.current = { g, id: e.pointerId }
        e.preventDefault()
      }
      return
    }
    // drawing elsewhere ends text editing
    if (s?.editing) useEditor.getState().view(docId, { editing: null })
    if (s && s.page !== index) useEditor.getState().view(docId, { page: index })
    const g = startGesture({ docId, pageId: page.id, svg, live, scale }, native)
    if (!g) return
    e.preventDefault()
    svg.setPointerCapture(e.pointerId)
    gesture.current = { g, id: e.pointerId }
  }
  const onPointerMove = (e: RPointerEvent<SVGSVGElement>): void => {
    if (gesture.current?.id === e.pointerId) gesture.current.g.move(e.nativeEvent)
  }
  const onPointerUp = (e: RPointerEvent<SVGSVGElement>): void => {
    const cur = gesture.current
    if (cur?.id !== e.pointerId) return
    gesture.current = null
    cur.g.up(e.nativeEvent)
  }
  const onPointerCancel = (e: RPointerEvent<SVGSVGElement>): void => {
    const cur = gesture.current
    if (cur?.id !== e.pointerId) return
    gesture.current = null
    cur.g.cancel()
  }
  // a second finger (pinch) cancels drawing
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onCancel = (): void => {
      gesture.current?.g.cancel()
      gesture.current = null
    }
    svg.addEventListener('qn-cancel-gesture', onCancel)
    return () => svg.removeEventListener('qn-cancel-gesture', onCancel)
  }, [])

  const cursor = interactive ? cursorFor(readOnly ? 'read' : tool, eraserSize) : 'default'

  return (
    <div className="pg" data-page-id={page.id} data-page-index={index} style={{ width, height }}>
      {!view && <PageBackground docId={docId} page={page} width={width} />}
      <svg
        ref={svgRef}
        className="pg-svg"
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        width={width}
        height={height}
        style={{ cursor, touchAction: stylusOnly ? 'auto' : 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onPointerCancel}
      >
        {view && <InfiniteGrid view={vb} id={page.id} />}
        <g>{layers.media.map((o) => <ObjG key={o.id} o={o} docId={docId} dim={false} />)}</g>
        <g opacity={HIGHLIGHT_ALPHA}>{layers.hl.map((o) => <ObjG key={o.id} o={o} docId={docId} dim={false} />)}</g>
        <g>
          {layers.top.map((o) =>
            o.type === 'text' ? (
              <TextBox key={o.id} docId={docId} pageId={page.id} o={o} editing={editing === o.id && !readOnly} scale={scale} />
            ) : o.type === 'sticky' && editing === o.id && !readOnly && !o.collapsed ? (
              <StickyEdit key={o.id} docId={docId} pageId={page.id} o={o} />
            ) : (
              <ObjG key={o.id} o={o} docId={docId} dim={dimmed(o)} />
            )
          )}
        </g>
        {hits
          .filter((h) => h.page === index)
          .flatMap((h) => h.rects)
          .map((r, i) => (
            <rect key={i} x={r.x - 1} y={r.y - 1} width={r.w + 2} height={r.h + 2} rx={2} fill="rgba(255, 214, 10, .45)" pointerEvents="none" />
          ))}
        {selBounds && !readOnly && <SelectionChrome b={selBounds} scale={scale} />}
        <g ref={liveRef} pointerEvents="none" />
      </svg>
      {readOnly &&
        links.map((l, i) => (
          <a
            key={i}
            className="pg-link"
            href={l.url ?? '#'}
            title={l.url ?? `Go to page ${(l.page ?? 0) + 1}`}
            style={{ left: l.rect.x * scale, top: l.rect.y * scale, width: l.rect.w * scale, height: l.rect.h * scale }}
            onClick={(e) => {
              e.preventDefault()
              if (l.url) window.quill.app.openExternal(l.url)
              else if (l.page !== undefined) {
                const s = session(docId)
                const target = s?.doc.pages.findIndex((p) => p.background?.type === 'pdf' && p.background.asset === page.background?.asset && p.background.pdfPage === l.page)
                if (target !== undefined && target >= 0) useEditor.getState().view(docId, { jump: { page: target, nonce: Date.now() } })
              }
            }}
          />
        ))}
    </div>
  )
})

function InfiniteGrid({ view, id }: { view: Rect; id: string }): JSX.Element {
  return (
    <>
      <defs>
        <pattern id={`dots-${id}`} width={24} height={24} patternUnits="userSpaceOnUse">
          <circle cx={12} cy={12} r={1.15} fill="#C3C8D2" />
        </pattern>
      </defs>
      <rect x={view.x} y={view.y} width={view.w} height={view.h} fill="#fff" />
      <rect x={view.x} y={view.y} width={view.w} height={view.h} fill={`url(#dots-${id})`} />
    </>
  )
}

function cursorFor(tool: string, eraserSize: number): string {
  switch (tool) {
    case 'pen':
      return `url("data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><circle cx="6" cy="6" r="2.2" fill="#000" stroke="#fff" stroke-width="1.2"/></svg>')}") 6 6, crosshair`
    case 'eraser': {
      const r = ERASER_SIZES[eraserSize] ?? 11
      const d = r * 2 + 4
      return `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${d}" height="${d}"><circle cx="${d / 2}" cy="${d / 2}" r="${r}" fill="rgba(255,255,255,.4)" stroke="#555" stroke-width="1"/></svg>`)}") ${d / 2} ${d / 2}, crosshair`
    }
    case 'text':
      return 'text'
    case 'lasso':
      return 'crosshair'
    case 'sticky':
      return 'copy'
    case 'laser':
      return 'none'
    default:
      return 'default'
  }
}

/** Drag a text box by its grip, or drag its right edge to change the width. */
function textBoxGesture(docId: string, pageId: string, id: string, kind: 'move' | 'resize', svg: SVGSVGElement, e: PointerEvent): Gesture | null {
  const s = session(docId)
  const o = s?.doc.pages.find((p) => p.id === pageId)?.objects.find((x) => x.id === id)
  if (!o || o.type !== 'text') return null
  const m = svg.getScreenCTM()?.inverse()
  const at = (ev: PointerEvent): DOMPoint => new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m)
  const start = at(e)
  const b = bounds(o)
  const set = (fn: (t: TextObject) => TextObject): void =>
    useEditor.getState().editObjects(docId, pageId, (objs) => objs.map((x) => (x.id === id && x.type === 'text' ? fn(x) : x)), { history: false })
  return {
    move(ev) {
      const p = at(ev)
      if (kind === 'move') set((t) => ({ ...t, x: b.x + p.x - start.x, y: b.y + p.y - start.y }))
      else set((t) => ({ ...t, w: Math.max(40, b.w + p.x - start.x) }))
    },
    up() {},
    cancel() {}
  }
}

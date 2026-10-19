/** One open document: toolbar, sub-toolbar, canvas, side panels and floating controls. */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  ArrowDownToLine, ArrowUpToLine, BookmarkPlus, Calculator, ChevronDown, Copy, Crop, Files, Image as ImageIcon, Loader2, Minus, Pause, Play,
  Plus, RotateCw, Scissors, ScanText, Shrink, SpellCheck, Square, Trash2, Expand, MessageCircleQuestion, Camera
} from 'lucide-react'
import type { ImageObject } from '@shared/types'
import { Button, Dialog, DialogFooter, Menu, MenuItem, MenuSeparator, Slider } from '../../components/kit'
import { session, useEditor, useSession } from '../../stores/editor'
import { useTools } from '../../stores/tools'
import { useUi } from '../../stores/ui'
import { arrangeSelection, copySelection, cutSelection, deleteSelection, dropFiles, duplicateSelection, insertSticker, patchSelected, recolorSelection, rotateSelectedImage, selectedObjects } from './actions'
import { selectionAction, AiPanel } from './AiPanel'
import { formatDuration, stopRecording, togglePause } from './audio'
import { ColorPicker } from './ColorPicker'
import { RedoIcon, UndoIcon } from './icons'
import { addToElements } from './InsertPopovers'
import { PagesPanel, RecordingsPanel, SearchPanel } from './panels'
import { ruler } from './ruler'
import { SubBar } from './SubBar'
import { TextDocEditor } from './TextDocEditor'
import { Toolbar } from './Toolbar'
import { selectionBounds } from './tools'
import { NotebookView, WhiteboardView, setZoom, zoomBy, MIN_ZOOM, MAX_ZOOM } from './views'
import { rasterPage } from './exporting'
import { assetUrl } from './render'
import { useEditorShortcuts } from './shortcuts'

export function Editor({ docId, active }: { docId: string; active: boolean }): JSX.Element {
  const loaded = useSession(docId, (s) => !!s.doc.id)
  const kind = useSession(docId, (s) => s.doc.kind)
  const infinite = useSession(docId, (s) => !!s.doc.pages[0]?.infinite)
  const panel = useSession(docId, (s) => s.panel)
  const [error, setError] = useState<string | null>(null)
  const [floatAi, setFloatAi] = useState(false)

  useEffect(() => {
    useEditor
      .getState()
      .open(docId)
      .catch((e: Error) => setError(e.message))
  }, [docId])
  useEditorShortcuts(docId, active)

  if (error) return <div className="editor-loading">Couldn't open this document: {error.replace(/^Error invoking remote method '[^']+': /, '')}</div>
  if (!loaded) return <div className="editor-loading"><Loader2 className="spin" size={26} /></div>

  return (
    <div
      className="editor"
      data-doc={docId}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('application/x-qn-sticker')) e.preventDefault()
      }}
      onDrop={(e) => {
        const st = e.dataTransfer.getData('application/x-qn-sticker')
        if (st) {
          e.preventDefault()
          const s = JSON.parse(st) as { svg: string; w: number; h: number }
          insertSticker(docId, s.svg, s.w, s.h)
          return
        }
        if (e.dataTransfer.files.length) {
          e.preventDefault()
          void dropFiles(docId, Array.from(e.dataTransfer.files))
        }
      }}
    >
      <Toolbar docId={docId} />
      <div className="ed-body">
        {panel === 'pages' && <PagesPanel docId={docId} />}
        {panel === 'search' && <SearchPanel docId={docId} />}
        {panel === 'recordings' && <RecordingsPanel docId={docId} />}
        {panel === 'ai' && !floatAi && <AiPanel docId={docId} floating={false} onToggleFloat={() => setFloatAi(true)} />}
        <div className="ed-canvas">
          {kind === 'text' ? <TextDocEditor docId={docId} /> : infinite ? <WhiteboardView docId={docId} /> : <NotebookView docId={docId} active={active} />}
          {kind !== 'text' && (
            <>
              <SubBar docId={docId} />
              <UndoPill docId={docId} />
              {!infinite && <PageCounter docId={docId} />}
              <ZoomPill docId={docId} />
              <SelectionMenu docId={docId} />
              <RulerOverlay />
              <RecordingBar docId={docId} />
            </>
          )}
          {panel === 'ai' && floatAi && <AiPanel docId={docId} floating onToggleFloat={() => setFloatAi(false)} />}
        </div>
      </div>
    </div>
  )
}

function UndoPill({ docId }: { docId: string }): JSX.Element {
  const canUndo = useSession(docId, (s) => s.past.length > 0)
  const canRedo = useSession(docId, (s) => s.future.length > 0)
  return (
    <div className="undo-pill">
      <button type="button" aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={() => useEditor.getState().undo(docId)}>
        <UndoIcon size={21} />
      </button>
      <button type="button" aria-label="Redo (Ctrl+Shift+Z)" title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={() => useEditor.getState().redo(docId)}>
        <RedoIcon size={21} />
      </button>
    </div>
  )
}

function PageCounter({ docId }: { docId: string }): JSX.Element {
  const page = useSession(docId, (s) => s.page)
  const count = useSession(docId, (s) => s.doc.pages.length)
  const [edit, setEdit] = useState(false)
  if (edit)
    return (
      <div className="page-counter">
        <input
          autoFocus
          type="number"
          min={1}
          max={count}
          defaultValue={page + 1}
          onBlur={() => setEdit(false)}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Escape') setEdit(false)
            if (e.key === 'Enter') {
              const n = Math.max(1, Math.min(count, Number((e.target as HTMLInputElement).value) || 1))
              useEditor.getState().view(docId, { jump: { page: n - 1, nonce: Date.now() } })
              setEdit(false)
            }
          }}
        />
        <span>of {count}</span>
      </div>
    )
  return (
    <button type="button" className="page-counter" title="Go to page" onClick={() => setEdit(true)}>
      {page + 1} of {count}
    </button>
  )
}

function ZoomPill({ docId }: { docId: string }): JSX.Element {
  const zoom = useSession(docId, (s) => s.zoom)
  const [menu, setMenu] = useState<HTMLElement | null>(null)
  return (
    <div className="zoom-pill">
      <button type="button" aria-label="Zoom out" disabled={zoom <= MIN_ZOOM} onClick={() => zoomBy(docId, 1 / 1.2)}>
        <Minus size={16} />
      </button>
      <button type="button" className="zoom-val" onClick={(e) => setMenu(e.currentTarget)}>
        {Math.round((zoom || 1) * 100)}%
      </button>
      <button type="button" aria-label="Zoom in" disabled={zoom >= MAX_ZOOM} onClick={() => zoomBy(docId, 1.2)}>
        <Plus size={16} />
      </button>
      {menu && (
        <Menu anchor={menu} onClose={() => setMenu(null)} side="top" width={170} align="center">
          <MenuItem label="Fit to width" onSelect={() => { useEditor.getState().view(docId, { zoom: 0 }); setMenu(null) }} />
          <MenuSeparator />
          {[0.5, 0.75, 1, 1.25, 1.5, 2, 3].map((z) => (
            <MenuItem key={z} label={`${z * 100}%`} checked={Math.abs((zoom || 1) - z) < 0.01} onSelect={() => { setZoom(docId, z); setMenu(null) }} />
          ))}
        </Menu>
      )}
    </div>
  )
}

/** Floating actions for the lasso selection. */
function SelectionMenu({ docId }: { docId: string }): JSX.Element | null {
  const selection = useSession(docId, (s) => s.selection)
  const objects = useSession(docId, (s) => s.doc.pages.find((p) => p.id === s.selection?.pageId)?.objects)
  const readOnly = useSession(docId, (s) => s.readOnly)
  const zoom = useSession(docId, (s) => s.zoom)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [more, setMore] = useState<HTMLElement | null>(null)
  const [color, setColor] = useState<HTMLElement | null>(null)
  const [opacity, setOpacity] = useState<HTMLElement | null>(null)
  const [crop, setCrop] = useState<ImageObject | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selection) return setPos(null)
    let raf = 0
    const place = (): void => {
      const b = selectionBounds(docId)
      const svg = document.querySelector<SVGSVGElement>(`.editor[data-doc="${docId}"] [data-page-id="${selection.pageId}"] svg.pg-svg`)
      const host = svg?.closest('.ed-canvas')
      const m = svg?.getScreenCTM()
      if (!b || !m || !host) return setPos(null)
      const p = new DOMPoint(b.x + b.w / 2, b.y).matrixTransform(m)
      const q = new DOMPoint(b.x, b.y + b.h).matrixTransform(m)
      const hr = host.getBoundingClientRect()
      const above = p.y - hr.top > 120
      setPos({ x: p.x - hr.left, y: above ? p.y - hr.top - 18 : q.y - hr.top + 18 })
    }
    const loop = (): void => {
      place()
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [selection, objects, docId, zoom])

  if (!selection || !pos || readOnly) return null
  const sel = selectedObjects(docId)
  if (!sel?.objs.length) return null
  const single = sel.objs.length === 1 ? sel.objs[0] : null
  const hasInk = sel.objs.some((o) => o.type === 'stroke')
  const recolorable = sel.objs.some((o) => o.type === 'stroke' || o.type === 'shape' || o.type === 'text' || o.type === 'sticky')
  const img = single?.type === 'image' ? single : null
  const media = sel.objs.every((o) => o.type === 'image' || o.type === 'sticker')
  const sticky = single?.type === 'sticky' ? single : null

  const screenshot = async (): Promise<void> => {
    const s = session(docId)
    const b = selectionBounds(docId)
    if (!s || !b) return
    const c = await rasterPage(s.doc, sel.page, Math.min(2400, Math.max(400, b.w * 3)), { x: b.x - 8, y: b.y - 8, w: b.w + 16, h: b.h + 16 })
    c.toBlob((blob) => {
      if (blob)
        void navigator.clipboard
          .write([new ClipboardItem({ 'image/png': blob })])
          .then(() => useUi.getState().toast('Screenshot copied to the clipboard'))
          .catch(() => useUi.getState().toast("Couldn't copy the screenshot"))
    }, 'image/png')
  }

  return (
    <div ref={ref} className="sel-menu" style={{ left: pos.x, top: pos.y }} onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => cutSelection(docId)} title="Cut (Ctrl+X)"><Scissors size={16} /><span>Cut</span></button>
      <button type="button" onClick={() => copySelection(docId)} title="Copy (Ctrl+C)"><Copy size={16} /><span>Copy</span></button>
      <button type="button" onClick={() => duplicateSelection(docId)} title="Duplicate (Ctrl+D)"><Files size={16} /><span>Duplicate</span></button>
      <button type="button" onClick={() => deleteSelection(docId)} title="Delete"><Trash2 size={16} /><span>Delete</span></button>
      {recolorable && (
        <button type="button" onClick={(e) => setColor(e.currentTarget)} title="Colour">
          <span className="sel-swatch" style={{ background: firstColor(sel.objs) }} />
          <span>Colour</span>
        </button>
      )}
      {img && (
        <>
          <button type="button" onClick={() => rotateSelectedImage(docId, 90)} title="Rotate"><RotateCw size={16} /><span>Rotate</span></button>
          <button type="button" onClick={() => setCrop(img)} title="Crop"><Crop size={16} /><span>Crop</span></button>
          <button type="button" onClick={(e) => setOpacity(e.currentTarget)} title="Opacity"><ImageIcon size={16} /><span>Opacity</span></button>
        </>
      )}
      {sticky && (
        <button type="button" onClick={() => patchSelected(docId, (o) => (o.type === 'sticky' ? { ...o, collapsed: !o.collapsed } : o))}>
          {sticky.collapsed ? <Expand size={16} /> : <Shrink size={16} />}
          <span>{sticky.collapsed ? 'Expand' : 'Collapse'}</span>
        </button>
      )}
      {hasInk && (
        <button type="button" onClick={() => void selectionAction(docId, 'ocr')} title="Convert handwriting to text"><ScanText size={16} /><span>Convert</span></button>
      )}
      <button type="button" onClick={(e) => setMore(e.currentTarget)} aria-label="More"><ChevronDown size={16} /></button>
      {more && (
        <Menu anchor={more} onClose={() => setMore(null)} width={240} align="end">
          <MenuItem icon={<MessageCircleQuestion size={17} />} label="Ask AI about selection" onSelect={() => { setMore(null); void selectionAction(docId, 'ask') }} />
          {hasInk && <MenuItem icon={<Calculator size={17} />} label="Solve maths" onSelect={() => { setMore(null); void selectionAction(docId, 'math') }} />}
          {hasInk && <MenuItem icon={<SpellCheck size={17} />} label="Check spelling" onSelect={() => { setMore(null); void selectionAction(docId, 'spell') }} />}
          <MenuSeparator />
          <MenuItem icon={<Camera size={17} />} label="Take screenshot" onSelect={() => { setMore(null); void screenshot() }} />
          <MenuItem
            icon={<BookmarkPlus size={17} />}
            label="Add to Elements"
            onSelect={() => {
              setMore(null)
              const objs = sel.objs.filter((o) => o.type !== 'image')
              if (objs.length < sel.objs.length) useUi.getState().toast('Images are left out of Elements')
              if (objs.length) void addToElements(objs, single ? single.type : `${objs.length} items`)
            }}
          />
          <MenuSeparator />
          <MenuItem icon={<ArrowUpToLine size={17} />} label="Bring to front" onSelect={() => { arrangeSelection(docId, 'front'); setMore(null) }} />
          <MenuItem icon={<ArrowDownToLine size={17} />} label="Send to back" onSelect={() => { arrangeSelection(docId, 'back'); setMore(null) }} />
          {media && <MenuItem icon={<RotateCw size={17} />} label="Rotate 90°" onSelect={() => { rotateSelectedImage(docId, 90); setMore(null) }} />}
        </Menu>
      )}
      {color && <ColorPicker anchor={color} value={firstColor(sel.objs)} onChange={(c) => recolorSelection(docId, c)} onClose={() => setColor(null)} />}
      {opacity && img && (
        <OpacityPop anchor={opacity} value={img.opacity ?? 1} onChange={(v) => patchSelected(docId, (o) => (o.type === 'image' ? { ...o, opacity: v } : o))} onClose={() => setOpacity(null)} />
      )}
      {crop && <CropDialog docId={docId} img={crop} onClose={() => setCrop(null)} />}
    </div>
  )
}

function firstColor(objs: ReturnType<typeof selectedObjects> extends infer R ? (R extends { objs: infer O } ? O : never) : never): string {
  for (const o of objs) {
    if (o.type === 'stroke') return o.color
    if (o.type === 'shape') return o.stroke
    if (o.type === 'text') return o.color ?? '#1F2430'
    if (o.type === 'sticky') return o.color
  }
  return '#000000'
}

function OpacityPop({ anchor, value, onChange, onClose }: { anchor: HTMLElement; value: number; onChange: (v: number) => void; onClose: () => void }): JSX.Element {
  const [v, setV] = useState(Math.round(value * 100))
  return (
    <Menu anchor={anchor} onClose={onClose} width={240}>
      <div className="width-pop">
        <div className="slider-row-head">
          <span>OPACITY</span>
          <span>{v}%</span>
        </div>
        <Slider value={v} min={10} max={100} onChange={(n) => { setV(n); onChange(n / 100) }} label="Opacity" />
      </div>
    </Menu>
  )
}

function CropDialog({ docId, img, onClose }: { docId: string; img: ImageObject; onClose: () => void }): JSX.Element {
  const c0 = img.crop ?? { x: 0, y: 0, w: 1, h: 1 }
  const [c, setC] = useState(c0)
  const box = useRef<HTMLDivElement>(null)
  const drag = (handle: string) => (e: React.PointerEvent) => {
    e.preventDefault()
    const r = box.current?.getBoundingClientRect()
    if (!r) return
    const start = { ...c }
    const sx = e.clientX
    const sy = e.clientY
    const move = (ev: PointerEvent): void => {
      const dx = (ev.clientX - sx) / r.width
      const dy = (ev.clientY - sy) / r.height
      let { x, y, w, h } = start
      if (handle === 'move') {
        x = Math.min(1 - w, Math.max(0, x + dx))
        y = Math.min(1 - h, Math.max(0, y + dy))
      }
      if (handle.includes('w')) {
        const nx = Math.min(x + w - 0.05, Math.max(0, x + dx))
        w += x - nx
        x = nx
      }
      if (handle.includes('e')) w = Math.min(1 - x, Math.max(0.05, w + dx))
      if (handle.includes('n')) {
        const ny = Math.min(y + h - 0.05, Math.max(0, y + dy))
        h += y - ny
        y = ny
      }
      if (handle.includes('s')) h = Math.min(1 - y, Math.max(0.05, h + dy))
      setC({ x, y, w, h })
    }
    const up = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const apply = (): void => {
    // keep the visible pixels the same size: the object box follows the crop
    const fullW = img.w / c0.w
    const fullH = img.h / c0.h
    const ox = img.x - c0.x * fullW
    const oy = img.y - c0.y * fullH
    patchSelected(docId, (o) => (o.id === img.id && o.type === 'image' ? { ...o, crop: c, x: ox + c.x * fullW, y: oy + c.y * fullH, w: c.w * fullW, h: c.h * fullH } : o))
    onClose()
  }
  return (
    <Dialog open onClose={onClose} width={560} label="Crop image">
      <div className="small-dialog">
        <h3>Crop</h3>
        <div className="crop-stage" ref={box}>
          <img src={assetUrl(docId, img.asset)} alt="" draggable={false} />
          <div className="crop-rect" style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%`, width: `${c.w * 100}%`, height: `${c.h * 100}%` }} onPointerDown={drag('move')}>
            {['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map((h) => (
              <span key={h} className={`crop-h ${h}`} onPointerDown={(e) => { e.stopPropagation(); drag(h)(e) }} />
            ))}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={() => setC({ x: 0, y: 0, w: 1, h: 1 })}>Reset</Button>
        <span style={{ flex: 1 }} />
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={apply}>Apply</Button>
      </DialogFooter>
    </Dialog>
  )
}

function RulerOverlay(): JSX.Element | null {
  const on = useTools((s) => s.ruler)
  const st = useSyncExternalStore(ruler.subscribe, () => ruler.state)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!on || ruler.placed) return
    const host = ref.current?.parentElement?.getBoundingClientRect()
    if (host) ruler.set({ cx: host.left + host.width / 2, cy: host.top + host.height / 2, angle: 0 })
  }, [on])
  useEffect(() => {
    if (!on) return
    const onWheel = (e: WheelEvent): void => {
      if (!e.altKey) return
      e.preventDefault()
      ruler.set({ angle: ruler.state.angle + (e.deltaY > 0 ? 1 : -1) * (Math.PI / 180) * (e.shiftKey ? 15 : 1) })
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [on])
  if (!on) return null
  const host = ref.current?.parentElement?.getBoundingClientRect() ?? { left: 0, top: 0 }
  const deg = Math.round(((((st.angle * 180) / Math.PI) % 360) + 360) % 360)
  const shown = deg > 180 ? 360 - deg : deg
  const dragMove = (e: React.PointerEvent): void => {
    if ((e.target as HTMLElement).closest('.ruler-rot')) return
    e.preventDefault()
    const sx = e.clientX - ruler.state.cx
    const sy = e.clientY - ruler.state.cy
    const move = (ev: PointerEvent): void => ruler.set({ cx: ev.clientX - sx, cy: ev.clientY - sy })
    const up = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const dragRotate = (e: React.PointerEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    const move = (ev: PointerEvent): void => {
      let a = Math.atan2(ev.clientY - ruler.state.cy, ev.clientX - ruler.state.cx)
      // snap to 15° steps when close
      const step = Math.PI / 12
      if (Math.abs(a - Math.round(a / step) * step) < 0.035) a = Math.round(a / step) * step
      ruler.set({ angle: a })
    }
    const up = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const ticks = []
  for (let x = 0; x <= st.length; x += 10) ticks.push(<span key={x} className={`ruler-tick${x % 50 === 0 ? ' big' : ''}`} style={{ left: x }} />)
  return (
    <div ref={ref} className="ruler-layer">
      <div
        className="ruler"
        style={{ left: st.cx - host.left - st.length / 2, top: st.cy - host.top - st.thickness / 2, width: st.length, height: st.thickness, transform: `rotate(${st.angle}rad)` }}
        onPointerDown={dragMove}
      >
        {ticks}
        <span className="ruler-angle">{shown}°</span>
        <span className="ruler-rot right" onPointerDown={dragRotate} title="Drag to rotate (or Alt + scroll)" />
        <span className="ruler-rot left" onPointerDown={dragRotate} />
      </div>
    </div>
  )
}

function RecordingBar({ docId }: { docId: string }): JSX.Element | null {
  const rec = useSession(docId, (s) => s.recording)
  const [, tick] = useState(0)
  useEffect(() => {
    if (!rec) return
    const t = window.setInterval(() => tick((n) => n + 1), 500)
    return () => window.clearInterval(t)
  }, [rec])
  if (!rec) return null
  const elapsed = (rec.pausedAt ?? Date.now()) - rec.startedAt - rec.pausedMs
  return (
    <div className="rec-bar">
      <span className={`rec-dot${rec.pausedAt ? ' paused' : ''}`} />
      <span className="rec-bar-time">{formatDuration(elapsed)}</span>
      <button type="button" aria-label={rec.pausedAt ? 'Resume' : 'Pause'} onClick={() => togglePause(docId)}>
        {rec.pausedAt ? <Play size={16} /> : <Pause size={16} />}
      </button>
      <button type="button" aria-label="Stop" className="stop" onClick={() => void stopRecording(docId)}>
        <Square size={13} fill="currentColor" />
      </button>
    </div>
  )
}

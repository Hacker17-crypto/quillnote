/** Floating sub-toolbar under the main toolbar: options for the active tool. */
import { useEffect, useState } from 'react'
import { AlignCenter, AlignLeft, AlignRight, Bold, ChevronDown, Italic, List, ListChecks, ListOrdered, Minus, Plus, Strikethrough, Underline } from 'lucide-react'
import { Menu, MenuItem, Popover, Slider, Toggle } from '../../components/kit'
import { session, useEditor, useSession } from '../../stores/editor'
import { ERASER_SIZES, useTools, type EraseFilter, type LassoFilter, type PenKind } from '../../stores/tools'
import { ColorPicker } from './ColorPicker'
import {
  AddColorIcon, BallPenIcon, BrushPenIcon, DotIcon, FilterIcon, FountainPenIcon, FreeLassoIcon, HighlighterIcon,
  RectLassoIcon, RulerIcon, ShapesIcon, TapeIcon, TrailIcon
} from './icons'
import { PenSettings } from './PenSettings'
import { FONT_STACK, STICKY_COLORS } from './render'

type Anchor = HTMLElement | null

function Btn({ on, label, onClick, children, className = '', onContextMenu, chip = 'teal' }: { on?: boolean; label: string; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; children: React.ReactNode; className?: string; onContextMenu?: (e: React.MouseEvent) => void; chip?: 'teal' | 'dark' }): JSX.Element {
  return (
    <button type="button" title={label} aria-label={label} aria-pressed={on} className={`sb-btn${on ? ` on ${chip}` : ''} ${className}`} onClick={onClick} onContextMenu={onContextMenu}>
      {children}
    </button>
  )
}

const Sep = (): JSX.Element => <span className="sb-sep" />

/** Width chips + colour swatches shared by pen, highlighter, tape and shapes. */
function Swatches({ kind }: { kind: PenKind }): JSX.Element {
  const sw = useTools((s) => s[kind])
  const patch = useTools((s) => s.patchSwatch)
  const [picker, setPicker] = useState<{ anchor: Anchor; index: number | 'new' } | null>(null)
  const [widthPop, setWidthPop] = useState<Anchor>(null)
  const maxW = kind === 'highlighter' || kind === 'tape' ? 40 : 12
  return (
    <>
      {sw.widths.map((w, i) => (
        <Btn
          key={i}
          chip="dark"
          on={sw.width === i}
          label={`Width ${w.toFixed(1)}`}
          onClick={(e) => (sw.width === i ? setWidthPop(e.currentTarget) : patch(kind, { width: i }))}
        >
          <span className="sb-width" style={{ height: Math.max(1.5, Math.min(9, (i + 1) * 2.2 * (kind === 'highlighter' || kind === 'tape' ? 1.3 : 1))) }} />
        </Btn>
      ))}
      <Sep />
      {sw.colors.map((c, i) => (
        <button
          key={i}
          type="button"
          className={`sb-color${sw.color === c ? ' on' : ''}`}
          aria-label={`Colour ${c}`}
          title="Click to use · click again to edit · right-click to remove"
          onClick={(e) => (sw.color === c ? setPicker({ anchor: e.currentTarget, index: i }) : patch(kind, { color: c }))}
          onContextMenu={(e) => {
            e.preventDefault()
            if (sw.colors.length <= 1) return
            const colors = sw.colors.filter((_, j) => j !== i)
            patch(kind, { colors, color: sw.color === c ? colors[0] : sw.color })
          }}
        >
          <span style={{ background: c }} />
          {sw.color === c && <ChevronDown size={12} strokeWidth={2.4} className="sb-color-chev" />}
        </button>
      ))}
      {sw.colors.length < 10 && (
        <Btn label="Add colour" onClick={(e) => setPicker({ anchor: e.currentTarget, index: 'new' })}>
          <AddColorIcon size={24} />
        </Btn>
      )}
      {picker && (
        <ColorPicker
          anchor={picker.anchor}
          value={picker.index === 'new' ? sw.color : sw.colors[picker.index]}
          alpha={kind !== 'pen'}
          title={picker.index === 'new' ? 'Add colour' : undefined}
          onChange={(hex) => {
            const s = useTools.getState()[kind]
            if (picker.index === 'new') {
              patch(kind, { colors: [...s.colors, hex], color: hex })
              setPicker({ ...picker, index: s.colors.length })
            } else {
              const colors = s.colors.slice()
              colors[picker.index] = hex
              patch(kind, { colors, color: hex })
            }
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {widthPop && (
        <Popover anchor={widthPop} onClose={() => setWidthPop(null)} side="bottom" align="center" caret className="width-pop">
          <div className="slider-row-head">
            <span>WIDTH</span>
            <span>{sw.widths[sw.width].toFixed(1)}</span>
          </div>
          <Slider
            value={sw.widths[sw.width]}
            min={0.3}
            max={maxW}
            step={0.1}
            label="Width"
            onChange={(v) => {
              const widths = useTools.getState()[kind].widths.slice()
              widths[useTools.getState()[kind].width] = v
              patch(kind, { widths })
            }}
          />
        </Popover>
      )}
    </>
  )
}

function PenBar(): JSX.Element {
  const t = useTools()
  const [pop, setPop] = useState<{ kind: 'pen' | 'highlighter' | 'shape' | 'tape'; anchor: Anchor } | null>(null)
  const PenGlyph = t.penType === 'ball' ? BallPenIcon : t.penType === 'brush' ? BrushPenIcon : FountainPenIcon
  const select = (k: PenKind, e: React.MouseEvent<HTMLButtonElement>): void => {
    if (t.penKind === k && (k === 'pen' || k === 'highlighter' || k === 'shape' || k === 'tape')) setPop({ kind: k, anchor: e.currentTarget })
    else t.setPenKind(k)
  }
  return (
    <>
      <Btn on={t.penKind === 'pen'} label="Pen (P) — click again for settings" onClick={(e) => select('pen', e)} className="with-chev">
        <PenGlyph size={22} />
        <ChevronDown size={11} strokeWidth={2.4} />
      </Btn>
      <Btn on={t.penKind === 'highlighter'} label="Highlighter (H)" onClick={(e) => select('highlighter', e)}>
        <HighlighterIcon size={22} />
      </Btn>
      <Btn on={t.penKind === 'tape'} label="Tape — tap tape to reveal what's underneath" onClick={(e) => select('tape', e)}>
        <TapeIcon size={22} />
      </Btn>
      <Btn on={t.ruler} label="Ruler" onClick={() => t.patch({ ruler: !t.ruler })} chip="dark">
        <RulerIcon size={22} />
      </Btn>
      <Btn on={t.penKind === 'shape'} label="Shape (S)" onClick={(e) => select('shape', e)}>
        <ShapesIcon size={22} />
      </Btn>
      <Sep />
      <Swatches kind={t.penKind} />
      {pop?.kind === 'pen' && <PenSettings anchor={pop.anchor} onClose={() => setPop(null)} />}
      {pop?.kind === 'highlighter' && (
        <Popover anchor={pop.anchor} onClose={() => setPop(null)} side="bottom" align="center" caret className="mini-pop">
          <div className="pen-pop-title">Highlighter</div>
          <div className="pop-row">
            <span>
              Straight line
              <small>Highlight along a perfectly straight line</small>
            </span>
            <Toggle checked={t.highlighter.straight} onChange={(v) => t.patchSwatch('highlighter', { straight: v })} label="Straight line" />
          </div>
        </Popover>
      )}
      {pop?.kind === 'shape' && (
        <Popover anchor={pop.anchor} onClose={() => setPop(null)} side="bottom" align="center" caret className="mini-pop">
          <div className="pen-pop-title">Shape</div>
          <p className="pop-hint">Draw a rough line, arrow, circle, triangle, rectangle or polygon — it turns into a clean shape.</p>
          <div className="pop-row">
            <span>Fill shapes</span>
            <Toggle checked={t.shape.fill} onChange={(v) => t.patchSwatch('shape', { fill: v })} label="Fill" />
          </div>
          <div className="pop-row">
            <span>Dashed outline</span>
            <Toggle checked={t.shape.dash} onChange={(v) => t.patchSwatch('shape', { dash: v })} label="Dashed" />
          </div>
        </Popover>
      )}
      {pop?.kind === 'tape' && (
        <Popover anchor={pop.anchor} onClose={() => setPop(null)} side="bottom" align="center" caret className="mini-pop">
          <div className="pen-pop-title">Tape</div>
          <p className="pop-hint">Drag across anything to cover it with tape, then tap the tape to peel it back. Great for flashcard-style revision.</p>
        </Popover>
      )}
    </>
  )
}

const ERASE_LABELS: Record<EraseFilter, string> = { pen: 'Pen', highlighter: 'Highlighter', tape: 'Tape', shapes: 'Shapes', text: 'Text', images: 'Images', stickers: 'Stickers' }

function EraserBar(): JSX.Element {
  const e = useTools((s) => s.eraser)
  const patch = useTools((s) => s.patch)
  const [menu, setMenu] = useState<Anchor>(null)
  const [filters, setFilters] = useState<Anchor>(null)
  const set = (p: Partial<typeof e>): void => patch({ eraser: { ...useTools.getState().eraser, ...p } })
  const MODE = { standard: 'Standard', precise: 'Precise', stroke: 'Stroke eraser' }
  return (
    <>
      <button type="button" className="sb-drop" onClick={(ev) => setMenu(ev.currentTarget)}>
        <span className="sb-drop-ico">⌫</span>
        {MODE[e.mode]}
        <ChevronDown size={14} strokeWidth={2.2} />
      </button>
      <Btn on={Object.values(e.filters).some((v) => !v)} chip="dark" label="Erase only…" onClick={(ev) => setFilters(ev.currentTarget)}>
        <FilterIcon size={21} />
      </Btn>
      <Sep />
      {ERASER_SIZES.map((px, i) => (
        <Btn key={i} chip="dark" on={e.size === i} label={`Eraser size ${i + 1}`} onClick={() => set({ size: i })}>
          <span className="sb-dot" style={{ width: 6 + i * 6, height: 6 + i * 6 }} data-px={px} />
        </Btn>
      ))}
      <Sep />
      <label className="sb-toggle" title="Switch back to the previous tool after erasing">
        <span>Auto-deselect</span>
        <Toggle checked={e.autoDeselect} onChange={(v) => set({ autoDeselect: v })} label="Auto-deselect" />
      </label>
      {menu && (
        <Menu anchor={menu} onClose={() => setMenu(null)} width={250} caret align="center">
          <MenuItem label="Standard" hint="Erase parts of strokes" checked={e.mode === 'standard'} onSelect={() => { set({ mode: 'standard' }); setMenu(null) }} />
          <MenuItem label="Precise" hint="Smaller, exact" checked={e.mode === 'precise'} onSelect={() => { set({ mode: 'precise' }); setMenu(null) }} />
          <MenuItem label="Stroke eraser" hint="Whole strokes" checked={e.mode === 'stroke'} onSelect={() => { set({ mode: 'stroke' }); setMenu(null) }} />
        </Menu>
      )}
      {filters && (
        <Popover anchor={filters} onClose={() => setFilters(null)} side="bottom" align="center" caret className="mini-pop">
          <div className="pen-pop-title">Erase only</div>
          {(Object.keys(ERASE_LABELS) as EraseFilter[]).map((k) => (
            <div className="pop-row" key={k}>
              <span>{ERASE_LABELS[k]}</span>
              <Toggle checked={e.filters[k]} onChange={(v) => set({ filters: { ...useTools.getState().eraser.filters, [k]: v } })} label={ERASE_LABELS[k]} />
            </div>
          ))}
        </Popover>
      )}
      {!e.tipSeen && <EraserTip onDone={() => set({ tipSeen: true })} />}
    </>
  )
}

function EraserTip({ onDone }: { onDone: () => void }): JSX.Element | null {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const t = window.setTimeout(() => setAnchor(document.querySelector<HTMLElement>('.editor-host:not([hidden]) .subbar')), 50)
    return () => window.clearTimeout(t)
  }, [])
  if (!anchor) return null
  return (
    <Popover anchor={anchor} onClose={onDone} side="bottom" align="center" caret className="tip-pop">
      <div className="tip-title">Erase only what you intend to</div>
      <p>Erase a specific content type without affecting the rest of your page.</p>
      <button type="button" className="q-btn primary" onClick={onDone}>
        <span>Got it</span>
      </button>
    </Popover>
  )
}

const LASSO_LABELS: Record<LassoFilter, string> = { handwriting: 'Handwriting', shapes: 'Shapes', text: 'Text & notes', images: 'Images', stickers: 'Stickers' }

function LassoBar(): JSX.Element {
  const l = useTools((s) => s.lasso)
  const patch = useTools((s) => s.patch)
  const [filters, setFilters] = useState<Anchor>(null)
  const set = (p: Partial<typeof l>): void => patch({ lasso: { ...useTools.getState().lasso, ...p } })
  return (
    <>
      <Btn on={l.mode === 'free'} label="Freeform lasso" onClick={() => set({ mode: 'free' })}>
        <FreeLassoIcon size={22} />
      </Btn>
      <Btn on={l.mode === 'rect'} label="Rectangle selection" onClick={() => set({ mode: 'rect' })}>
        <RectLassoIcon size={22} />
      </Btn>
      <Sep />
      <Btn on={Object.values(l.filters).some((v) => !v)} chip="dark" label="Select only…" onClick={(ev) => setFilters(ev.currentTarget)}>
        <FilterIcon size={21} />
      </Btn>
      {filters && (
        <Popover anchor={filters} onClose={() => setFilters(null)} side="bottom" align="center" caret className="mini-pop">
          <div className="pen-pop-title">Select only</div>
          {(Object.keys(LASSO_LABELS) as LassoFilter[]).map((k) => (
            <div className="pop-row" key={k}>
              <span>{LASSO_LABELS[k]}</span>
              <Toggle checked={l.filters[k]} onChange={(v) => set({ filters: { ...useTools.getState().lasso.filters, [k]: v } })} label={LASSO_LABELS[k]} />
            </div>
          ))}
        </Popover>
      )}
    </>
  )
}

const FONTS: { id: keyof typeof FONT_STACK; name: string }[] = [
  { id: 'sans', name: 'Figtree' },
  { id: 'serif', name: 'Serif' },
  { id: 'mono', name: 'Mono' },
  { id: 'hand', name: 'Caveat' }
]

function TextBar({ docId }: { docId: string }): JSX.Element {
  const t = useTools((s) => s.text)
  const patch = useTools((s) => s.patch)
  const editing = useSession(docId, (s) => s.editing)
  const boxObj = useSession(docId, (s) => {
    if (!s.editing) return null
    for (const p of s.doc.pages) for (const o of p.objects) if (o.id === s.editing && o.type === 'text') return o
    return null
  })
  const boxPage = useSession(docId, (s) => (s.editing ? s.doc.pages.find((p) => p.objects.some((o) => o.id === s.editing))?.id ?? null : null))
  const box = boxObj && boxPage ? { o: boxObj, pageId: boxPage } : null
  const [fontMenu, setFontMenu] = useState<Anchor>(null)
  const [colorPop, setColorPop] = useState<{ anchor: Anchor; target: 'text' | 'bg' } | null>(null)
  const font = box?.o.font ?? t.font
  const size = box?.o.size ?? t.size
  const color = box?.o.color ?? t.color

  /** Apply to the box being edited (and remember for new boxes). */
  const apply = (p: { font?: typeof t.font; size?: number; color?: string; align?: 'left' | 'center' | 'right'; bg?: string | null }): void => {
    const { align: _a, bg: _b, ...defaults } = p
    void _a
    void _b
    if (Object.keys(defaults).length) patch({ text: { ...useTools.getState().text, ...defaults } })
    if (box) useEditor.getState().editObjects(docId, box.pageId, (objs) => objs.map((o) => (o.id === box.o.id && o.type === 'text' ? { ...o, ...p } : o)))
  }
  const exec = (cmd: string, arg?: string): void => {
    const el = editing ? document.querySelector<HTMLElement>(`[data-textbox="${editing}"]`) : null
    if (!el) return
    el.focus()
    document.execCommand(cmd, false, arg)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
  const keep = (e: React.MouseEvent): void => e.preventDefault() // don't steal focus from the text box

  return (
    <div className="sb-inline" onMouseDown={keep}>
      <button type="button" className="sb-drop" onClick={(e) => setFontMenu(e.currentTarget)} style={{ fontFamily: FONT_STACK[font] }}>
        {FONTS.find((f) => f.id === font)?.name}
        <ChevronDown size={14} strokeWidth={2.2} />
      </button>
      <Btn label="Smaller" onClick={() => apply({ size: Math.max(8, size - 2) })}>
        <Minus size={16} />
      </Btn>
      <span className="sb-num">{Math.round(size)}</span>
      <Btn label="Larger" onClick={() => apply({ size: Math.min(96, size + 2) })}>
        <Plus size={16} />
      </Btn>
      <Sep />
      <Btn label="Bold" onClick={() => exec('bold')}><Bold size={18} /></Btn>
      <Btn label="Italic" onClick={() => exec('italic')}><Italic size={18} /></Btn>
      <Btn label="Underline" onClick={() => exec('underline')}><Underline size={18} /></Btn>
      <Btn label="Strikethrough" onClick={() => exec('strikeThrough')}><Strikethrough size={18} /></Btn>
      <Sep />
      <button type="button" className="sb-color on" aria-label="Text colour" onClick={(e) => setColorPop({ anchor: e.currentTarget, target: 'text' })}>
        <span style={{ background: color }} />
      </button>
      <button type="button" className="sb-bgcolor" aria-label="Box background" title="Box background" onClick={(e) => setColorPop({ anchor: e.currentTarget, target: 'bg' })}>
        <span style={{ background: box?.o.bg ?? 'transparent' }} />
      </button>
      <Sep />
      <Btn on={box?.o.align === 'left' || !box?.o.align} chip="dark" label="Align left" onClick={() => apply({ align: 'left' })}><AlignLeft size={18} /></Btn>
      <Btn on={box?.o.align === 'center'} chip="dark" label="Centre" onClick={() => apply({ align: 'center' })}><AlignCenter size={18} /></Btn>
      <Btn on={box?.o.align === 'right'} chip="dark" label="Align right" onClick={() => apply({ align: 'right' })}><AlignRight size={18} /></Btn>
      <Sep />
      <Btn label="Bulleted list" onClick={() => exec('insertUnorderedList')}><List size={18} /></Btn>
      <Btn label="Numbered list" onClick={() => exec('insertOrderedList')}><ListOrdered size={18} /></Btn>
      <Btn label="Checklist" onClick={() => exec('insertHTML', '<ul class="qn-check"><li data-checked="false">&#8203;</li></ul>')}><ListChecks size={18} /></Btn>
      {!editing && <span className="sb-hint">Click anywhere on the page to add text</span>}
      {fontMenu && (
        <Menu anchor={fontMenu} onClose={() => setFontMenu(null)} width={200} caret>
          {FONTS.map((f) => (
            <MenuItem key={f.id} label={<span style={{ fontFamily: FONT_STACK[f.id], fontSize: f.id === 'hand' ? 19 : undefined }}>{f.name}</span>} checked={font === f.id} onSelect={() => { apply({ font: f.id }); setFontMenu(null) }} />
          ))}
        </Menu>
      )}
      {colorPop && (
        <ColorPicker
          anchor={colorPop.anchor}
          value={colorPop.target === 'text' ? color : box?.o.bg ?? '#FFF3A6'}
          alpha={colorPop.target === 'bg'}
          onChange={(hex) => {
            if (colorPop.target === 'bg') apply({ bg: hex })
            else {
              const sel = window.getSelection()
              if (editing && sel && !sel.isCollapsed) exec('foreColor', hex)
              else apply({ color: hex })
            }
          }}
          onClose={() => setColorPop(null)}
        />
      )}
    </div>
  )
}

function StickyBar({ docId }: { docId: string }): JSX.Element {
  const color = useTools((s) => s.sticky.color)
  const patch = useTools((s) => s.patch)
  const editing = useSession(docId, (s) => s.editing)
  const set = (i: number): void => {
    patch({ sticky: { color: i } })
    const s = session(docId)
    if (!s || !editing) return
    const page = s.doc.pages.find((p) => p.objects.some((o) => o.id === editing))
    if (page) useEditor.getState().editObjects(docId, page.id, (objs) => objs.map((o) => (o.id === editing && o.type === 'sticky' ? { ...o, color: STICKY_COLORS[i] } : o)))
  }
  return (
    <>
      {STICKY_COLORS.map((c, i) => (
        <button key={c} type="button" aria-label={`Sticky colour ${i + 1}`} className={`sb-sticky${color === i ? ' on' : ''}`} style={{ background: c }} onClick={() => set(i)} />
      ))}
      <span className="sb-hint">Click on the page to place a note</span>
    </>
  )
}

function LaserBar(): JSX.Element {
  const l = useTools((s) => s.laser)
  const patch = useTools((s) => s.patch)
  const colors = ['#FF3B30', '#30D158', '#0A84FF']
  return (
    <>
      <Btn on={l.mode === 'dot'} label="Dot" onClick={() => patch({ laser: { ...l, mode: 'dot' } })}>
        <DotIcon size={22} />
      </Btn>
      <Btn on={l.mode === 'trail'} label="Trail" onClick={() => patch({ laser: { ...l, mode: 'trail' } })}>
        <TrailIcon size={22} />
      </Btn>
      <Sep />
      {colors.map((c) => (
        <button key={c} type="button" className={`sb-color${l.color === c ? ' on' : ''}`} aria-label={`Laser ${c}`} onClick={() => patch({ laser: { ...l, color: c } })}>
          <span style={{ background: c }} />
        </button>
      ))}
    </>
  )
}

export function SubBar({ docId }: { docId: string }): JSX.Element | null {
  const tool = useTools((s) => s.tool)
  const readOnly = useSession(docId, (s) => s.readOnly)
  if (readOnly) return null
  let body: JSX.Element | null = null
  if (tool === 'pen') body = <PenBar />
  else if (tool === 'eraser') body = <EraserBar />
  else if (tool === 'lasso') body = <LassoBar />
  else if (tool === 'text') body = <TextBar docId={docId} />
  else if (tool === 'sticky') body = <StickyBar docId={docId} />
  else if (tool === 'laser') body = <LaserBar />
  if (!body) return null
  return <div className="subbar">{body}</div>
}

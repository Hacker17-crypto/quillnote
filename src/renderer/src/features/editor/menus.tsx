/** Toolbar popovers and menus: Add Page, Share & Export, More (page menu), Audio, templates, go-to-page. */
import { useMemo, useState } from 'react'
import {
  Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Copy, CopyPlus, Eraser, FileDown, FileImage, FileText, FileUp, Hash, Image as ImageIcon,
  LayoutTemplate, ListTree, Mic, MoveVertical, Printer, RotateCcw, RotateCw, ScanText, Send, SlidersHorizontal, Trash2, Wand2, AudioLines, Ruler as RulerLucide, Hand
} from 'lucide-react'
import { PAPER_COLORS, PAPER_GROUPS, PAPER_TEMPLATES, templateName } from '@shared/paper'
import type { PageObject, PaperSpec } from '@shared/types'
import { Button, Dialog, DialogFooter, Menu, MenuItem, MenuLabel, MenuSeparator, Popover, SegmentedControl, Toggle, type PopoverAnchor } from '../../components/kit'
import { PaperPreview, PaperTile } from '../library/PaperTile'
import { session, useEditor, useSession } from '../../stores/editor'
import { useTools } from '../../stores/tools'
import { useUi } from '../../stores/ui'
import { addImagePage, addPage, addPdfPages, changeTemplate, clearPage, deletePage, duplicatePage, goToPage, patchPage, rotatePage, toggleBookmark, type AddWhere } from './actions'
import { exportImages, exportMarkdown, exportPdf, exportQuill, printDoc, rasterPage, type ExportOptions } from './exporting'
import { recognizeDocument } from './ai'

// ───────────────────────── Add Page ─────────────────────────
const RECENT_TEMPLATES = ['blank', 'ruled-narrow', 'squared', 'dotted', 'cornell']

export function AddPagePopover({ docId, anchor, onClose }: { docId: string; anchor: PopoverAnchor; onClose: () => void }): JSX.Element {
  const [where, setWhere] = useState<AddWhere>('after')
  const [more, setMore] = useState(false)
  const current = useSession(docId, (s) => {
    const p = s.doc.pages[s.page]
    return p && !p.background ? p.paper : s.doc.paper
  })
  const tiles = useMemo(() => {
    const ids = [current.template, ...RECENT_TEMPLATES.filter((t) => t !== current.template)].slice(0, 6)
    return ids.map((t, i) => ({ spec: { ...current, template: t }, name: i === 0 ? 'Current template' : templateName(t) }))
  }, [current])
  const go = (fn: () => void | Promise<void>): void => {
    onClose()
    void fn()
  }
  if (more) return <TemplateDialog docId={docId} mode={{ kind: 'add', where }} onClose={() => { setMore(false); onClose() }} />
  return (
    <Popover anchor={anchor} onClose={onClose} side="bottom" align="end" caret className="addpage-pop">
      <div className="pen-pop-title center">Add Page</div>
      <SegmentedControl
        value={where}
        onChange={setWhere}
        options={[{ value: 'before', label: 'Before' }, { value: 'after', label: 'After' }, { value: 'last', label: 'Last page' }]}
      />
      <div className="pop-section">RECENT TEMPLATES</div>
      <p className="pop-caption">Templates shown here inherit current page attributes whenever possible</p>
      <div className="addpage-tiles">
        {tiles.map((t) => (
          <button key={t.name} type="button" className="addpage-tile" onClick={() => go(() => addPage(docId, where, t.spec))}>
            <span className="addpage-thumb">
              <PaperPreview spec={t.spec} w={64} h={84} />
            </span>
            <span>{t.name}</span>
          </button>
        ))}
      </div>
      <div className="pop-rows">
        <button type="button" className="pop-row link" onClick={() => setMore(true)}>
          <span className="pop-row-ico"><LayoutTemplate size={18} /></span>
          <span>More from templates…</span>
          <ChevronRight size={16} />
        </button>
        <button type="button" className="pop-row link" onClick={() => go(() => addImagePage(docId, where))}>
          <span className="pop-row-ico"><ImageIcon size={18} /></span>
          <span>Image</span>
        </button>
        <button type="button" className="pop-row link" onClick={() => go(() => addPdfPages(docId, where))}>
          <span className="pop-row-ico"><FileUp size={18} /></span>
          <span>Import</span>
          <small className="pop-row-hint">PDF pages</small>
        </button>
      </div>
    </Popover>
  )
}

// ───────────────────────── Template dialog ─────────────────────────
export function TemplateDialog({ docId, mode, onClose }: { docId: string; mode: { kind: 'add'; where: AddWhere } | { kind: 'change' }; onClose: () => void }): JSX.Element {
  const s = session(docId)
  const base: PaperSpec = (s && s.doc.pages[s.page] && !s.doc.pages[s.page].background ? s.doc.pages[s.page].paper : s?.doc.paper) ?? { template: 'blank', color: 'white', size: 'a4', orientation: 'portrait', style: 'standard', lang: 'en-US' }
  const [spec, setSpec] = useState<PaperSpec>(base)
  const [scope, setScope] = useState<'page' | 'all'>('page')
  return (
    <Dialog open onClose={onClose} width={720} height={600} label="Templates" className="tpl-dialog">
      <div className="tpl-head">
        <h3>{mode.kind === 'add' ? 'Add page from template' : 'Change template'}</h3>
        <div className="tpl-opts">
          <SegmentedControl value={spec.color} onChange={(color) => setSpec({ ...spec, color })} options={PAPER_COLORS.map((c) => ({ value: c.id, label: c.name.replace(' Paper', '') }))} />
          <SegmentedControl value={spec.orientation} onChange={(orientation) => setSpec({ ...spec, orientation })} options={[{ value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }]} />
        </div>
      </div>
      <div className="tpl-body">
        {PAPER_GROUPS.map((g) => (
          <section key={g.id}>
            <h4>{g.name}</h4>
            <div className="tpl-grid">
              {PAPER_TEMPLATES.filter((t) => t.group === g.id).map((t) => (
                <PaperTile key={t.id} spec={{ ...spec, template: t.id }} name={t.name} selected={spec.template === t.id} onSelect={() => setSpec({ ...spec, template: t.id })} />
              ))}
            </div>
          </section>
        ))}
      </div>
      <DialogFooter>
        {mode.kind === 'change' && (
          <SegmentedControl value={scope} onChange={setScope} options={[{ value: 'page', label: 'This page' }, { value: 'all', label: 'All pages' }]} />
        )}
        <span style={{ flex: 1 }} />
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          onClick={() => {
            if (mode.kind === 'add') addPage(docId, mode.where, spec)
            else changeTemplate(docId, session(docId)?.page ?? 0, spec, scope === 'all')
            onClose()
          }}
        >
          {mode.kind === 'add' ? 'Add Page' : 'Apply'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

// ───────────────────────── Share & Export ─────────────────────────
type ExportKind = 'pdf' | 'image'

export function SharePopover({ docId, anchor, onClose }: { docId: string; anchor: PopoverAnchor; onClose: () => void }): JSX.Element {
  const [opts, setOpts] = useState<ExportKind | null>(null)
  const pageCount = useSession(docId, (s) => s.doc.pages.length)
  const current = useSession(docId, (s) => s.page)
  const isText = useSession(docId, (s) => s.doc.kind === 'text')
  const [range, setRange] = useState<'all' | 'current' | 'range'>('all')
  const [from, setFrom] = useState(1)
  const [to, setTo] = useState(pageCount)
  const [bg, setBg] = useState(true)
  const run = (fn: () => Promise<void>): void => {
    onClose()
    void fn().catch((e) => useUi.getState().toast(`Export failed: ${e instanceof Error ? e.message : 'unknown error'}`))
  }
  const pick = (): ExportOptions => {
    const pages =
      range === 'current'
        ? [current]
        : range === 'range'
          ? Array.from({ length: Math.max(0, Math.min(to, pageCount) - Math.max(1, from) + 1) }, (_, i) => Math.max(1, from) - 1 + i)
          : undefined
    return { pages, backgrounds: bg }
  }
  if (opts)
    return (
      <Popover anchor={anchor} onClose={onClose} side="bottom" align="end" caret className="share-pop">
        <button type="button" className="pop-back" onClick={() => setOpts(null)}>
          <ChevronLeft size={18} /> {opts === 'pdf' ? 'Export as PDF' : 'Export as Image'}
        </button>
        {!isText && (
          <>
            <div className="pop-section">PAGES</div>
            <SegmentedControl value={range} onChange={setRange} options={[{ value: 'all', label: 'All' }, { value: 'current', label: 'Current' }, { value: 'range', label: 'Range' }]} />
            {range === 'range' && (
              <div className="range-row">
                <input type="number" min={1} max={pageCount} value={from} onChange={(e) => setFrom(Number(e.target.value))} />
                <span>to</span>
                <input type="number" min={1} max={pageCount} value={to} onChange={(e) => setTo(Number(e.target.value))} />
                <span>of {pageCount}</span>
              </div>
            )}
            <div className="pop-row">
              <span>
                Include page backgrounds
                <small>Paper templates and lines</small>
              </span>
              <Toggle checked={bg} onChange={setBg} label="Include backgrounds" />
            </div>
          </>
        )}
        <Button variant="primary" className="wide" onClick={() => run(() => (opts === 'pdf' ? exportPdf(docId, pick()) : exportImages(docId, pick())))}>
          Export
        </Button>
      </Popover>
    )
  return (
    <Menu anchor={anchor} onClose={onClose} width={290} caret align="end" className="share-menu">
      <MenuLabel>Share and Export</MenuLabel>
      <MenuItem icon={<Send size={18} />} label={<span className="two-line">Share…<small>Export as .quill file to send</small></span>} onSelect={() => run(() => exportQuill(docId))} />
      <MenuSeparator />
      <MenuItem icon={<FileDown size={18} />} label="Export as PDF" hint={<ChevronRight size={16} />} onSelect={() => setOpts('pdf')} />
      {!isText && <MenuItem icon={<FileImage size={18} />} label="Export as Image" hint={<ChevronRight size={16} />} onSelect={() => setOpts('image')} />}
      <MenuItem icon={<FileText size={18} />} label="Export as Markdown" onSelect={() => run(() => exportMarkdown(docId))} />
      <MenuSeparator />
      <MenuItem icon={<Printer size={18} />} label="Print" hint="Ctrl+P" onSelect={() => run(() => printDoc(docId))} />
    </Menu>
  )
}

// ───────────────────────── More (page) menu ─────────────────────────
export function MoreMenu({ docId, anchor, onClose, onCustomize }: { docId: string; anchor: PopoverAnchor; onClose: () => void; onCustomize: () => void }): JSX.Element {
  const page = useSession(docId, (s) => s.page)
  const count = useSession(docId, (s) => s.doc.pages.length)
  const p = useSession(docId, (s) => s.doc.pages[s.page])
  const infinite = !!p?.infinite
  const settings = useUi((s) => s.settings)
  const align = useTools((s) => s.align)
  const [sub, setSub] = useState<'rotate' | 'clear' | 'scroll' | null>(null)
  const [dialog, setDialog] = useState<'template' | 'goto' | 'outline' | null>(null)
  const [kinds, setKinds] = useState({ ink: true, highlighter: true, shapes: false, text: false, images: false })
  const close = (): void => {
    setSub(null)
    onClose()
  }

  if (dialog === 'template') return <TemplateDialog docId={docId} mode={{ kind: 'change' }} onClose={close} />
  if (dialog === 'goto') return <GoToPageDialog docId={docId} onClose={close} />
  if (dialog === 'outline') return <OutlineDialog docId={docId} onClose={close} />

  if (sub === 'clear')
    return (
      <Popover anchor={anchor} onClose={close} side="bottom" align="end" caret className="share-pop">
        <button type="button" className="pop-back" onClick={() => setSub(null)}>
          <ChevronLeft size={18} /> Delete Specific Items
        </button>
        {(Object.keys(kinds) as (keyof typeof kinds)[]).map((k) => (
          <div className="pop-row" key={k}>
            <span>{{ ink: 'Handwriting', highlighter: 'Highlighter', shapes: 'Shapes', text: 'Text & sticky notes', images: 'Images & stickers' }[k]}</span>
            <Toggle checked={kinds[k]} onChange={(v) => setKinds({ ...kinds, [k]: v })} label={k} />
          </div>
        ))}
        <Button
          variant="danger"
          className="wide"
          onClick={() => {
            const del = (o: PageObject): boolean =>
              (kinds.ink && o.type === 'stroke' && o.tool !== 'highlighter') ||
              (kinds.highlighter && o.type === 'stroke' && o.tool === 'highlighter') ||
              (kinds.shapes && o.type === 'shape') ||
              (kinds.text && (o.type === 'text' || o.type === 'sticky')) ||
              (kinds.images && (o.type === 'image' || o.type === 'sticker'))
            clearPage(docId, page, (o) => !del(o))
            close()
          }}
        >
          Delete
        </Button>
      </Popover>
    )

  return (
    <Menu anchor={anchor} onClose={close} width={300} caret align="end" className="more-menu">
      <MenuLabel>{infinite ? 'Whiteboard' : `Page ${page + 1}`}</MenuLabel>
      {!infinite && (
        <>
          <MenuItem icon={p?.bookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />} label={p?.bookmarked ? 'Remove Bookmark' : 'Bookmark Page'} onSelect={() => { toggleBookmark(docId, page); close() }} />
          <MenuItem icon={<Copy size={18} />} label="Copy Page" hint="as image" onSelect={() => { void copyPageImage(docId, page); close() }} />
          <MenuItem icon={<CopyPlus size={18} />} label="Duplicate Page" onSelect={() => { duplicatePage(docId, page); close() }} />
          {sub === 'rotate' ? (
            <>
              <MenuItem icon={<RotateCcw size={18} />} label="Rotate Left" onSelect={() => { rotatePage(docId, page, -1); close() }} />
              <MenuItem icon={<RotateCw size={18} />} label="Rotate Right" onSelect={() => { rotatePage(docId, page, 1); close() }} />
            </>
          ) : (
            <MenuItem icon={<RotateCw size={18} />} label="Rotate Page" hint={<ChevronRight size={16} />} onSelect={() => setSub('rotate')} />
          )}
          <MenuItem icon={<ListTree size={18} />} label="Add page to Outline" onSelect={() => setDialog('outline')} />
          <MenuItem icon={<LayoutTemplate size={18} />} label="Change Template" disabled={!!p?.background} onSelect={() => setDialog('template')} />
          <MenuItem icon={<Hash size={18} />} label="Go to Page" hint={`${page + 1} of ${count}`} onSelect={() => setDialog('goto')} />
        </>
      )}
      <MenuSeparator />
      <MenuLabel>Clear or Trash Page</MenuLabel>
      <MenuItem icon={<Eraser size={18} />} label="Delete Specific Items" hint={<ChevronRight size={16} />} onSelect={() => setSub('clear')} />
      <MenuItem icon={<Eraser size={18} />} label={infinite ? 'Clear Whiteboard' : 'Clear Page'} danger onSelect={() => { clearPage(docId, page); close() }} />
      {!infinite && <MenuItem icon={<Trash2 size={18} />} label="Move to Trash" danger onSelect={() => { deletePage(docId, page); close() }} />}
      <MenuSeparator />
      <MenuLabel>AI</MenuLabel>
      <MenuItem icon={<ScanText size={18} />} label="Recognise handwriting" hint="whole document" onSelect={() => { close(); void recognizeDocument(docId) }} />
      <MenuSeparator />
      <MenuLabel>Object Alignment</MenuLabel>
      <div className="q-menu-item static">
        <span className="q-menu-icon"><Wand2 size={18} /></span>
        <span className="q-menu-label">Align Objects</span>
        <Toggle checked={align} onChange={(v) => useTools.getState().patch({ align: v })} label="Align objects" />
      </div>
      <MenuSeparator />
      <MenuLabel>Settings</MenuLabel>
      <div className="q-menu-item static">
        <span className="q-menu-icon"><Hand size={18} /></span>
        <span className="q-menu-label">Only draw with stylus</span>
        <Toggle checked={settings?.onlyDrawWithStylus ?? false} onChange={(v) => void useUi.getState().patchSettings({ onlyDrawWithStylus: v })} label="Only draw with stylus" />
      </div>
      {sub === 'scroll' ? (
        <>
          <MenuItem icon={<MoveVertical size={18} />} label="Vertical" checked={settings?.scrollDirection !== 'horizontal'} onSelect={() => { void useUi.getState().patchSettings({ scrollDirection: 'vertical' }); resetZoom(docId); close() }} />
          <MenuItem icon={<MoveVertical size={18} style={{ transform: 'rotate(90deg)' }} />} label="Horizontal" checked={settings?.scrollDirection === 'horizontal'} onSelect={() => { void useUi.getState().patchSettings({ scrollDirection: 'horizontal' }); resetZoom(docId); close() }} />
        </>
      ) : (
        !infinite && <MenuItem icon={<MoveVertical size={18} />} label="Scrolling Direction" hint={<>{settings?.scrollDirection === 'horizontal' ? 'Horizontal' : 'Vertical'} <ChevronRight size={16} /></>} onSelect={() => setSub('scroll')} />
      )}
      <MenuItem icon={<SlidersHorizontal size={18} />} label="Toolbar Customization" onSelect={() => { close(); onCustomize() }} />
    </Menu>
  )
}

function resetZoom(docId: string): void {
  useEditor.getState().view(docId, { zoom: 0 })
}

async function copyPageImage(docId: string, index: number): Promise<void> {
  const s = session(docId)
  const page = s?.doc.pages[index]
  if (!s || !page) return
  const c = await rasterPage(s.doc, page, Math.round(page.width * 2))
  c.toBlob((b) => {
    if (!b) return
    void navigator.clipboard
      .write([new ClipboardItem({ 'image/png': b })])
      .then(() => useUi.getState().toast('Page copied as an image'))
      .catch(() => useUi.getState().toast("Couldn't copy to the clipboard"))
  }, 'image/png')
}

function GoToPageDialog({ docId, onClose }: { docId: string; onClose: () => void }): JSX.Element {
  const count = useSession(docId, (s) => s.doc.pages.length)
  const [v, setV] = useState(String((session(docId)?.page ?? 0) + 1))
  const go = (): void => {
    const n = Math.max(1, Math.min(count, Math.round(Number(v)) || 1))
    goToPage(docId, n - 1)
    onClose()
  }
  return (
    <Dialog open onClose={onClose} width={340} label="Go to page">
      <div className="small-dialog">
        <h3>Go to Page</h3>
        <input autoFocus className="q-input" type="number" min={1} max={count} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} />
        <p className="dim">of {count}</p>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={go}>Go</Button>
      </DialogFooter>
    </Dialog>
  )
}

function OutlineDialog({ docId, onClose }: { docId: string; onClose: () => void }): JSX.Element {
  const index = session(docId)?.page ?? 0
  const [v, setV] = useState(session(docId)?.doc.pages[index]?.outlineTitle ?? `Page ${index + 1}`)
  const save = (): void => {
    patchPage(docId, index, (p) => ({ ...p, outlineTitle: v.trim() || undefined }), false)
    useUi.getState().toast(v.trim() ? 'Added to Outline' : 'Removed from Outline')
    onClose()
  }
  return (
    <Dialog open onClose={onClose} width={380} label="Add to outline">
      <div className="small-dialog">
        <h3>Add page to Outline</h3>
        <input autoFocus className="q-input" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="Outline title" />
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save}>Save</Button>
      </DialogFooter>
    </Dialog>
  )
}

// ───────────────────────── Audio ─────────────────────────
export function AudioMenu({ docId, anchor, onClose, onRecord, onCustomize }: { docId: string; anchor: PopoverAnchor; onClose: () => void; onRecord: () => void; onCustomize: () => void }): JSX.Element {
  const ruler = useTools((s) => s.ruler)
  const recording = useSession(docId, (s) => !!s.recording)
  return (
    <Menu anchor={anchor} onClose={onClose} width={260} caret align="center">
      <MenuItem icon={<Mic size={18} color="#F2504B" />} label={recording ? 'Recording…' : 'Record & Summarize'} disabled={recording} onSelect={() => { onClose(); onRecord() }} />
      <MenuItem icon={<AudioLines size={18} />} label="Show Recordings" onSelect={() => { useEditor.getState().view(docId, { panel: 'recordings' }); onClose() }} />
      <MenuSeparator />
      <MenuItem icon={<RulerLucide size={18} />} label={ruler ? 'Hide Ruler' : 'Show Ruler'} onSelect={() => { useTools.getState().patch({ ruler: !ruler }); onClose() }} />
      <MenuSeparator />
      <MenuItem icon={<SlidersHorizontal size={18} />} label="Toolbar Customization" onSelect={() => { onClose(); onCustomize() }} />
    </Menu>
  )
}


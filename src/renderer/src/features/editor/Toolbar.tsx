/** Editor toolbar: panels on the left, tools in the centre, page actions on the right. */
import { useState, type ReactNode } from 'react'
import { ChevronDown, GripVertical } from 'lucide-react'
import { Button, Dialog, DialogFooter, Toggle, Tooltip } from '../../components/kit'
import { useEditor, useSession } from '../../stores/editor'
import { useTools, type ToolId } from '../../stores/tools'
import { useUi } from '../../stores/ui'
import { insertImages } from './actions'
import {
  AddPageIcon, AiIcon, AudioIcon, ElementsIcon, EraserIcon, ImageIcon, LassoIcon, LaserIcon, MoreIcon, PagesIcon, PenIcon, ReadOnlyIcon,
  SearchIcon, ShareIcon, StickerIcon, StickyNoteIcon, TextIcon
} from './icons'
import { ElementsPopover, StickersPopover } from './InsertPopovers'
import { AddPagePopover, AudioMenu, MoreMenu, SharePopover } from './menus'
import type { PanelId } from '../../stores/editor'
import { startRecording } from './audio'

type CenterId = ToolId | 'audio'

const TOOLS: { id: CenterId; label: string; key?: string; icon: (active: boolean) => ReactNode }[] = [
  { id: 'lasso', label: 'Lasso', key: 'L', icon: () => <LassoIcon size={23} /> },
  { id: 'pen', label: 'Pen', key: 'P', icon: () => <PenIcon size={23} /> },
  { id: 'eraser', label: 'Eraser', key: 'E', icon: () => <EraserIcon size={23} /> },
  { id: 'text', label: 'Text', key: 'T', icon: () => <TextIcon size={23} /> },
  { id: 'sticker', label: 'Stickers & GIFs', icon: () => <StickerIcon size={23} /> },
  { id: 'image', label: 'Image', icon: () => <ImageIcon size={23} /> },
  { id: 'elements', label: 'Elements', icon: () => <ElementsIcon size={23} /> },
  { id: 'sticky', label: 'Sticky note', icon: () => <StickyNoteIcon size={23} /> },
  { id: 'laser', label: 'Laser pointer', icon: (a) => <LaserIcon size={23} active={a} /> },
  { id: 'audio', label: 'Audio', icon: () => <AudioIcon size={23} /> }
]
const DEFAULT_ORDER = TOOLS.map((t) => t.id)

function useToolbarConfig(): { order: CenterId[]; hidden: Set<string> } {
  const cfg = useUi((s) => s.settings?.toolbar)
  const known = new Set<string>(DEFAULT_ORDER)
  const order = [...(cfg?.order ?? []).filter((id) => known.has(id)), ...DEFAULT_ORDER.filter((id) => !(cfg?.order ?? []).includes(id))] as CenterId[]
  return { order, hidden: new Set(cfg?.hidden ?? []) }
}

function TbBtn({ label, active, onClick, children, className = '' }: { label: string; active?: boolean; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; children: ReactNode; className?: string }): JSX.Element {
  return (
    <Tooltip label={label}>
      <button type="button" aria-label={label} aria-pressed={active} className={`tb-btn${active ? ' on' : ''} ${className}`} onClick={onClick}>
        {children}
      </button>
    </Tooltip>
  )
}

export function Toolbar({ docId }: { docId: string }): JSX.Element {
  const tool = useTools((s) => s.tool)
  const setTool = useTools((s) => s.setTool)
  const panel = useSession(docId, (s) => s.panel)
  const readOnly = useSession(docId, (s) => s.readOnly)
  const isText = useSession(docId, (s) => s.doc.kind === 'text')
  const { order, hidden } = useToolbarConfig()
  const [pop, setPop] = useState<{ id: 'sticker' | 'elements' | 'audio' | 'add' | 'share' | 'more'; anchor: HTMLElement } | null>(null)
  const [customize, setCustomize] = useState(false)
  const togglePanel = (p: PanelId): void => useEditor.getState().view(docId, { panel: panel === p ? null : p })
  const close = (): void => setPop(null)

  const onTool = (id: CenterId, el: HTMLElement): void => {
    if (id === 'sticker' || id === 'elements' || id === 'audio') {
      setPop(pop?.id === id ? null : { id, anchor: el })
      return
    }
    if (id === 'image') {
      void insertImages(docId)
      return
    }
    setTool(id)
    useEditor.getState().view(docId, { editing: null, ...(id !== 'lasso' ? { selection: null } : {}) })
  }

  return (
    <div className="ed-toolbar">
      <div className="tb-left">
        {!isText && (
          <TbBtn label="Pages" active={panel === 'pages'} onClick={() => togglePanel('pages')}>
            <PagesIcon size={23} />
          </TbBtn>
        )}
        <TbBtn label="Search (Ctrl+F)" active={panel === 'search'} onClick={() => togglePanel('search')}>
          <SearchIcon size={23} />
        </TbBtn>
        <TbBtn label="AI (Ctrl+Shift+A)" active={panel === 'ai'} onClick={() => togglePanel('ai')}>
          <AiIcon size={23} />
        </TbBtn>
        {!isText && (
          <TbBtn label={readOnly ? 'Leave read-only' : 'Read-only'} active={readOnly} onClick={() => useEditor.getState().view(docId, { readOnly: !readOnly, selection: null, editing: null })}>
            <ReadOnlyIcon size={23} />
          </TbBtn>
        )}
      </div>
      <div className="tb-center">
        {isText ? (
          <span className="tb-label">Text Document</span>
        ) : readOnly ? (
          <span className="tb-label">Read Only</span>
        ) : (
          order
            .filter((id) => !hidden.has(id))
            .map((id, i, arr) => {
              const t = TOOLS.find((x) => x.id === id)
              if (!t) return null
              const active = tool === id || pop?.id === id
              return (
                <span key={id} className="tb-slot">
                  {id === 'audio' && i > 0 && <span className="tb-sep" />}
                  <TbBtn label={t.key ? `${t.label} (${t.key})` : t.label} active={active} className={id === 'audio' ? 'with-chev' : ''} onClick={(e) => onTool(id, e.currentTarget)}>
                    {t.icon(active)}
                    {id === 'audio' && <ChevronDown size={12} strokeWidth={2.4} />}
                  </TbBtn>
                  {id === 'lasso' && i < arr.length - 1 && <span className="tb-sep" />}
                </span>
              )
            })
        )}
      </div>
      <div className="tb-right">
        {!isText && (
          <TbBtn label="Add page" active={pop?.id === 'add'} onClick={(e) => setPop({ id: 'add', anchor: e.currentTarget })}>
            <AddPageIcon size={23} />
          </TbBtn>
        )}
        <TbBtn label="Share & export" active={pop?.id === 'share'} onClick={(e) => setPop({ id: 'share', anchor: e.currentTarget })}>
          <ShareIcon size={23} />
        </TbBtn>
        {!isText && (
          <TbBtn label="More" active={pop?.id === 'more'} onClick={(e) => setPop({ id: 'more', anchor: e.currentTarget })}>
            <MoreIcon size={23} />
          </TbBtn>
        )}
      </div>
      {pop?.id === 'sticker' && <StickersPopover docId={docId} anchor={pop.anchor} onClose={close} />}
      {pop?.id === 'elements' && <ElementsPopover docId={docId} anchor={pop.anchor} onClose={close} />}
      {pop?.id === 'audio' && <AudioMenu docId={docId} anchor={pop.anchor} onClose={close} onRecord={() => void startRecording(docId)} onCustomize={() => setCustomize(true)} />}
      {pop?.id === 'add' && <AddPagePopover docId={docId} anchor={pop.anchor} onClose={close} />}
      {pop?.id === 'share' && <SharePopover docId={docId} anchor={pop.anchor} onClose={close} />}
      {pop?.id === 'more' && <MoreMenu docId={docId} anchor={pop.anchor} onClose={close} onCustomize={() => setCustomize(true)} />}
      {customize && <ToolbarCustomization onClose={() => setCustomize(false)} />}
    </div>
  )
}

function ToolbarCustomization({ onClose }: { onClose: () => void }): JSX.Element {
  const cfg = useToolbarConfig()
  const [order, setOrder] = useState<CenterId[]>(cfg.order)
  const [hidden, setHidden] = useState<Set<string>>(cfg.hidden)
  const [drag, setDrag] = useState<number | null>(null)
  const save = (): void => {
    void useUi.getState().patchSettings({ toolbar: { order, hidden: [...hidden] } })
    onClose()
  }
  return (
    <Dialog open onClose={onClose} width={420} label="Toolbar customization">
      <div className="small-dialog">
        <h3>Toolbar Customization</h3>
        <p className="dim">Drag to reorder. Switch off tools you don't use.</p>
        <ul className="tbc-list">
          {order.map((id, i) => {
            const t = TOOLS.find((x) => x.id === id)
            if (!t) return null
            return (
              <li
                key={id}
                draggable
                className={drag === i ? 'dragging' : ''}
                onDragStart={() => setDrag(i)}
                onDragEnd={() => setDrag(null)}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (drag === null || drag === i) return
                  const next = order.slice()
                  const [m] = next.splice(drag, 1)
                  next.splice(i, 0, m)
                  setOrder(next)
                  setDrag(i)
                }}
              >
                <GripVertical size={16} className="dim" />
                <span className="tbc-ico">{t.icon(false)}</span>
                <span className="tbc-name">{t.label}</span>
                <Toggle
                  checked={!hidden.has(id)}
                  disabled={id === 'pen'}
                  onChange={(v) => {
                    const next = new Set(hidden)
                    if (v) next.delete(id)
                    else next.add(id)
                    setHidden(next)
                  }}
                  label={t.label}
                />
              </li>
            )
          })}
        </ul>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={() => { setOrder(DEFAULT_ORDER); setHidden(new Set()) }}>Reset</Button>
        <span style={{ flex: 1 }} />
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save}>Done</Button>
      </DialogFooter>
    </Dialog>
  )
}

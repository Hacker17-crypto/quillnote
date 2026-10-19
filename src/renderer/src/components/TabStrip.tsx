import { useMemo, useState } from 'react'
import { ChevronDown, FileDown, FolderOpen, House, Pencil, Plus, Sparkles, X } from 'lucide-react'
import { formatItemDate } from '@shared/docs'
import { Button, Dialog, DialogFooter, Menu, MenuItem, MenuLabel, MenuSeparator, Popover } from './kit'
import { Thumbnail } from './Thumbnail'
import { useEditor, useSession } from '../stores/editor'
import { useLibrary } from '../stores/library'
import { useTabs } from '../stores/tabs'
import { useUi } from '../stores/ui'
import { openItem } from '../features/library/actions'

export async function closeTab(id: string): Promise<void> {
  await useEditor.getState().close(id)
  useTabs.getState().close(id)
}

const STATUS: Record<string, [string, string]> = {
  saved: ['Saved', 'ok'],
  saving: ['Saving…', 'busy'],
  unsaved: ['Saving…', 'busy'],
  error: ["Couldn't save", 'bad']
}

function TabMenu({ id, anchor, onClose, onRename }: { id: string; anchor: HTMLElement; onClose: () => void; onRename: () => void }): JSX.Element {
  const title = useSession(id, (s) => s.doc.title)
  const status = useSession(id, (s) => s.status)
  const [label, cls] = STATUS[status] ?? STATUS.saved
  const suggest = async (): Promise<void> => {
    onClose()
    const ui = useUi.getState()
    try {
      const [{ ask, scopeContext }, { setTitle }] = await Promise.all([import('../features/editor/ai'), import('../features/editor/actions')])
      ui.toast('Asking AI for a title…')
      const ctx = await scopeContext(id, 'page')
      const t = (await ask({ kind: 'title', text: ctx.text, images: ctx.images.slice(0, 1), scope: ctx.label }).promise).replace(/^["'#\s]+|["'\s]+$/g, '').slice(0, 80)
      if (t) {
        const prev = useEditor.getState().sessions[id]?.doc.title ?? ''
        setTitle(id, t)
        ui.toast(`Renamed to “${t}”`, { label: 'Undo', run: () => setTitle(id, prev) })
      }
    } catch (e) {
      ui.toast(`AI: ${e instanceof Error ? e.message : 'failed'}`)
    }
  }
  return (
    <Menu anchor={anchor} onClose={onClose} width={280} caret>
      <MenuLabel>{title}</MenuLabel>
      <div className="q-menu-item static">
        <span className="q-menu-label">Sync status</span>
        <span className={`tab-status ${cls}`}>{label}</span>
      </div>
      <div className="q-menu-item static">
        <span className="q-menu-label">Saved for offline</span>
        <span className="tab-status ok">Ready</span>
      </div>
      <MenuSeparator />
      <MenuItem icon={<Pencil size={17} />} label="Rename" onSelect={() => { onClose(); onRename() }} />
      <MenuItem icon={<Sparkles size={17} />} label="Suggest a title with AI" onSelect={() => void suggest()} />
      <MenuItem icon={<FolderOpen size={17} />} label="Show in folder" onSelect={() => { window.quill.library.showInFolder(id); onClose() }} />
      <MenuItem icon={<FileDown size={17} />} label="Export as PDF" onSelect={() => { onClose(); void import('../features/editor/exporting').then((m) => m.exportPdf(id)) }} />
      <MenuSeparator />
      <MenuItem icon={<X size={17} />} label="Close tab" hint="Ctrl+W" onSelect={() => { onClose(); void closeTab(id) }} />
    </Menu>
  )
}

function RenameDialog({ id, onClose }: { id: string; onClose: () => void }): JSX.Element {
  const [v, setV] = useState(useEditor.getState().sessions[id]?.doc.title ?? '')
  const save = (): void => {
    if (v.trim()) void import('../features/editor/actions').then((m) => m.setTitle(id, v))
    onClose()
  }
  return (
    <Dialog open onClose={onClose} width={380} label="Rename">
      <div className="small-dialog">
        <h3>Rename</h3>
        <input autoFocus className="q-input" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} onFocus={(e) => e.target.select()} />
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save}>Rename</Button>
      </DialogFooter>
    </Dialog>
  )
}

/** "+" picker: open another document in a new tab. */
function OpenPicker({ anchor, onClose }: { anchor: HTMLElement; onClose: () => void }): JSX.Element {
  const items = useLibrary((s) => s.items)
  const [q, setQ] = useState('')
  const list = useMemo(
    () =>
      items
        .filter((i) => i.type !== 'folder' && i.trashedAt === null && i.title.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => b.modifiedAt - a.modifiedAt)
        .slice(0, 40),
    [items, q]
  )
  return (
    <Popover anchor={anchor} onClose={onClose} side="bottom" align="end" className="open-picker">
      <input autoFocus className="q-input" placeholder="Open a document…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter' && list[0]) {
          openItem(list[0])
          onClose()
        }
      }} />
      <div className="open-list">
        {list.length === 0 && <p className="panel-empty">No documents</p>}
        {list.map((it) => (
          <button key={it.id} type="button" className="open-row" onClick={() => { openItem(it); onClose() }}>
            <Thumbnail id={it.id} type={it.type} cover={it.cover} paper={it.paper} thumbAsset={it.thumbAsset} width={30} />
            <span className="open-row-text">
              <span>{it.title}</span>
              <small>{formatItemDate(it.modifiedAt)}</small>
            </span>
          </button>
        ))}
      </div>
    </Popover>
  )
}

/** Tab strip: Home chip, one tab per open document, and "+" to open another. */
export function TabStrip(): JSX.Element {
  const { tabs, active, activate } = useTabs()
  const home = active === 'home'
  const [menu, setMenu] = useState<{ id: string; anchor: HTMLElement } | null>(null)
  const [rename, setRename] = useState<string | null>(null)
  const [picker, setPicker] = useState<HTMLElement | null>(null)
  const [drag, setDrag] = useState<string | null>(null)
  return (
    <div className={`tabstrip drag${home ? '' : ' editing'}${window.quill.platform === 'darwin' ? ' mac' : ''}`}>
      <button type="button" className={`tab-home no-drag${home ? ' on' : ''}`} aria-label="Home" onClick={() => activate('home')}>
        <House size={19} strokeWidth={1.7} />
      </button>
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          tabIndex={0}
          draggable
          className={`tab no-drag${active === t.id ? ' on' : ''}${home ? ' dim' : ''}`}
          onClick={() => activate(t.id)}
          onAuxClick={(e) => e.button === 1 && void closeTab(t.id)}
          onKeyDown={(e) => e.key === 'Enter' && activate(t.id)}
          onDragStart={() => setDrag(t.id)}
          onDragEnd={() => setDrag(null)}
          onDragOver={(e) => {
            e.preventDefault()
            if (drag && drag !== t.id) useTabs.getState().reorder(drag, t.id)
          }}
        >
          <span className="tab-title">{t.title}</span>
          <button
            type="button"
            className="tab-chev"
            aria-label="Document options"
            onClick={(e) => {
              e.stopPropagation()
              activate(t.id)
              setMenu({ id: t.id, anchor: e.currentTarget })
            }}
          >
            <ChevronDown size={15} />
          </button>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            className="tab-x"
            aria-label={`Close ${t.title}`}
            onClick={(e) => {
              e.stopPropagation()
              void closeTab(t.id)
            }}
          >
            <X size={13} />
          </button>
        </div>
      ))}
      <span className="tab-fill" />
      <button type="button" className="tab-plus no-drag" aria-label="Open a document" title="Open a document" onClick={(e) => setPicker(e.currentTarget)}>
        <Plus size={18} />
      </button>
      {menu && <TabMenu id={menu.id} anchor={menu.anchor} onClose={() => setMenu(null)} onRename={() => setRename(menu.id)} />}
      {rename && <RenameDialog id={rename} onClose={() => setRename(null)} />}
      {picker && <OpenPicker anchor={picker} onClose={() => setPicker(null)} />}
    </div>
  )
}

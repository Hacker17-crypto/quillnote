import { useMemo, useState } from 'react'
import { ChevronRight, Folder, Library } from 'lucide-react'
import { COVER_GROUPS, COVERS } from '@shared/covers'
import type { LibraryItem } from '@shared/types'
import { Button, Dialog, DialogFooter } from '../../components/kit'
import { useLibrary } from '../../stores/library'
import { useUi } from '../../stores/ui'
import { currentParent } from './actions'
import { NewNotebookDialog } from './NewNotebookDialog'
import { CoverTile } from './PaperTile'
import { descendantIds } from './selectors'

function NameDialog({ label, heading, initial, cta, onSubmit }: { label: string; heading: string; initial: string; cta: string; onSubmit: (v: string) => Promise<void> | void }): JSX.Element {
  const close = useUi((s) => s.closeDialog)
  const [value, setValue] = useState(initial)
  const ok = value.trim().length > 0
  const submit = async (): Promise<void> => {
    if (!ok) return
    close()
    await onSubmit(value.trim())
  }
  return (
    <Dialog open onClose={close} label={label} width={380}>
      <div className="dlg-pad">
        <h2 className="dlg-h">{heading}</h2>
        <input
          className="q-input"
          autoFocus
          value={value}
          maxLength={120}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" className="dlg-btn" onClick={close}>Cancel</Button>
        <Button variant="primary" className="dlg-btn" disabled={!ok} onClick={() => void submit()}>{cta}</Button>
      </DialogFooter>
    </Dialog>
  )
}

function MoveDialog({ ids }: { ids: string[] }): JSX.Element {
  const close = useUi((s) => s.closeDialog)
  const exitSelect = useUi((s) => s.exitSelect)
  const items = useLibrary((s) => s.items)
  const [target, setTarget] = useState<string | null>(null)
  const [path, setPath] = useState<string[]>([])
  const parent = path.length ? path[path.length - 1] : null

  const blocked = useMemo(() => {
    const out = new Set(ids)
    for (const id of ids) for (const d of descendantIds(items, id)) out.add(d)
    return out
  }, [ids, items])
  const folders = items.filter((i) => i.type === 'folder' && i.trashedAt === null && i.parentId === parent && !blocked.has(i.id))
  const crumbs = path.map((id) => items.find((i) => i.id === id)).filter((i): i is LibraryItem => !!i)
  const sameLocation = ids.every((id) => (items.find((i) => i.id === id)?.parentId ?? null) === target)

  return (
    <Dialog open onClose={close} label="Move" width={420} height={480}>
      <div className="dlg-pad grow">
        <h2 className="dlg-h">Move {ids.length === 1 ? 'item' : `${ids.length} items`} to…</h2>
        <div className="mv-path">
          <button type="button" onClick={() => { setPath([]); setTarget(null) }}>Documents</button>
          {crumbs.map((c, i) => (
            <span key={c.id}>
              <ChevronRight size={14} />
              <button type="button" onClick={() => { setPath(path.slice(0, i + 1)); setTarget(c.id) }}>{c.title}</button>
            </span>
          ))}
        </div>
        <div className="mv-list">
          <button type="button" className={`mv-row${target === parent ? ' on' : ''}`} onClick={() => setTarget(parent)}>
            <Library size={18} strokeWidth={1.7} /> {parent ? 'This folder' : 'Documents (top level)'}
          </button>
          {folders.map((f) => (
            <button key={f.id} type="button" className={`mv-row${target === f.id ? ' on' : ''}`} onClick={() => setTarget(f.id)} onDoubleClick={() => { setPath([...path, f.id]); setTarget(f.id) }}>
              <Folder size={18} strokeWidth={1.7} />
              <span className="mv-name">{f.title}</span>
              <ChevronRight size={16} className="mv-open" onClick={(e) => { e.stopPropagation(); setPath([...path, f.id]); setTarget(f.id) }} />
            </button>
          ))}
          {!folders.length && <p className="mv-empty">No folders here.</p>}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" className="dlg-btn" onClick={close}>Cancel</Button>
        <Button
          variant="primary"
          className="dlg-btn"
          disabled={sameLocation}
          onClick={async () => {
            close()
            await useLibrary.getState().move(ids, target)
            exitSelect()
          }}
        >
          Move
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

function CoverDialog({ item }: { item: LibraryItem }): JSX.Element {
  const close = useUi((s) => s.closeDialog)
  const [cover, setCover] = useState(item.cover ?? 'simple')
  return (
    <Dialog open onClose={close} label="Change cover" width={560} height={520}>
      <div className="dlg-pad grow">
        <h2 className="dlg-h">Change cover</h2>
        <div className="cv-scroll">
          {COVER_GROUPS.map((g) => (
            <div key={g.id}>
              <div className="nb-section-head static">{g.name}</div>
              <div className="cv-grid">
                {COVERS.filter((c) => c.group === g.id).map((c) => (
                  <CoverTile key={c.id} id={c.id} name={c.name} selected={cover === c.id} onSelect={() => setCover(c.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" className="dlg-btn" onClick={close}>Cancel</Button>
        <Button variant="primary" className="dlg-btn" onClick={() => { close(); void useLibrary.getState().setCover(item.id, cover) }}>Apply</Button>
      </DialogFooter>
    </Dialog>
  )
}

function ConfirmDialog({ heading, body, cta, onConfirm }: { heading: string; body: string; cta: string; onConfirm: () => void }): JSX.Element {
  const close = useUi((s) => s.closeDialog)
  return (
    <Dialog open onClose={close} label={heading} width={380}>
      <div className="dlg-pad">
        <h2 className="dlg-h">{heading}</h2>
        <p className="dlg-p">{body}</p>
      </div>
      <DialogFooter>
        <Button variant="outline" className="dlg-btn" onClick={close}>Cancel</Button>
        <Button variant="primary" className="dlg-btn danger-fill" autoFocus onClick={() => { close(); onConfirm() }}>{cta}</Button>
      </DialogFooter>
    </Dialog>
  )
}

export function DialogHost(): JSX.Element | null {
  const dialog = useUi((s) => s.dialog)
  if (!dialog) return null
  switch (dialog.kind) {
    case 'newNotebook':
      return <NewNotebookDialog />
    case 'newFolder':
      return <NameDialog label="New folder" heading="New folder" initial="Untitled Folder" cta="Create" onSubmit={(v) => void useLibrary.getState().createFolder(v, currentParent())} />
    case 'rename':
      return <NameDialog label="Rename" heading="Rename" initial={dialog.item.title} cta="Rename" onSubmit={(v) => void useLibrary.getState().rename(dialog.item.id, v)} />
    case 'move':
      return <MoveDialog ids={dialog.ids} />
    case 'cover':
      return <CoverDialog item={dialog.item} />
    case 'confirmDelete': {
      const ids = dialog.ids
      return (
        <ConfirmDialog
          heading="Delete forever?"
          body={`${ids.length === 1 ? 'This item' : `These ${ids.length} items`} will be permanently deleted. This can’t be undone.`}
          cta="Delete"
          onConfirm={() => void useLibrary.getState().deleteForever(ids).then(() => useUi.getState().exitSelect())}
        />
      )
    }
    case 'confirmEmpty':
      return <ConfirmDialog heading="Empty Trash?" body="Everything in Trash will be permanently deleted. This can’t be undone." cta="Empty Trash" onConfirm={() => void useLibrary.getState().emptyTrash()} />
  }
}

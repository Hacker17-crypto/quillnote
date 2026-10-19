import { ArrowDown, ArrowUp, Copy, FileDown, FolderInput, FolderOpen, LayoutGrid, List, Package, Palette, Pencil, RotateCcw, Share, Star, Trash2 } from 'lucide-react'
import type { LibraryItem, SortKey } from '@shared/types'
import { Menu, MenuItem, MenuSeparator, type PopoverAnchor } from '../../components/kit'
import { useLibrary } from '../../stores/library'
import { useUi } from '../../stores/ui'
import { exportAs } from './actions'

const ICON = { size: 18, strokeWidth: 1.7 }

interface DocMenuProps {
  item: LibraryItem
  anchor: PopoverAnchor
  onClose: () => void
}

export function DocMenu({ item, anchor, onClose }: DocMenuProps): JSX.Element {
  const lib = useLibrary.getState()
  const ui = useUi.getState()
  // The menu opens on top of the chevron (its top-left corner at the trigger), like the reference.
  if (anchor instanceof HTMLElement) {
    const r = anchor.getBoundingClientRect()
    anchor = { x: r.left - 1, y: r.top - 4 }
  }
  const trashed = item.trashedAt !== null
  const isDoc = item.type !== 'folder'
  const pick = (fn: () => void) => (): void => {
    onClose()
    fn()
  }

  if (trashed) {
    return (
      <Menu anchor={anchor} onClose={onClose} width={210}>
        <MenuItem icon={<RotateCcw {...ICON} />} label="Restore" onSelect={pick(() => void lib.restore([item.id]))} />
        <MenuSeparator />
        <MenuItem icon={<Trash2 {...ICON} />} label="Delete forever" danger onSelect={pick(() => ui.openDialog({ kind: 'confirmDelete', ids: [item.id] }))} />
      </Menu>
    )
  }

  return (
    <Menu anchor={anchor} onClose={onClose} width={196}>
      <MenuItem icon={<Pencil {...ICON} />} label="Rename" onSelect={pick(() => ui.openDialog({ kind: 'rename', item }))} />
      <MenuItem icon={<Copy {...ICON} />} label="Duplicate" onSelect={pick(() => void lib.duplicate([item.id]))} />
      {isDoc && <MenuItem icon={<FileDown {...ICON} />} label="Export as PDF" onSelect={pick(() => void exportAs(item, 'pdf'))} />}
      {isDoc && <MenuItem icon={<Package {...ICON} />} label="Export as .quill" onSelect={pick(() => void exportAs(item, 'quill'))} />}
      <MenuItem icon={<FolderInput {...ICON} />} label="Move" onSelect={pick(() => ui.openDialog({ kind: 'move', ids: [item.id] }))} />
      {item.type === 'notebook' && <MenuItem icon={<Palette {...ICON} />} label="Change cover" onSelect={pick(() => ui.openDialog({ kind: 'cover', item }))} />}
      <MenuItem
        icon={<Star {...ICON} fill={item.favorite ? 'currentColor' : 'none'} />}
        label={item.favorite ? 'Remove from Favorites' : 'Add to Favorites'}
        onSelect={pick(() => void lib.setFavorite([item.id], !item.favorite))}
      />
      {isDoc && (
        <MenuItem
          icon={<Share {...ICON} />}
          label="Share…"
          onSelect={pick(() => void exportAs(item, 'quill'))}
        />
      )}
      {isDoc && <MenuItem icon={<FolderOpen {...ICON} />} label="Show in folder" onSelect={pick(() => window.quill.library.showInFolder(item.id))} />}
      <MenuSeparator />
      <MenuItem icon={<Trash2 {...ICON} />} label="Move to Trash" danger onSelect={pick(() => void lib.trash([item.id]))} />
    </Menu>
  )
}

interface SortMenuProps {
  anchor: HTMLElement
  onClose: () => void
}

const SORT_KEYS: { id: SortKey; label: string }[] = [
  { id: 'date', label: 'Date' },
  { id: 'name', label: 'Name' },
  { id: 'type', label: 'Type' }
]

export function SortMenu({ anchor, onClose }: SortMenuProps): JSX.Element | null {
  const settings = useUi((s) => s.settings)
  const patch = useUi((s) => s.patchSettings)
  if (!settings) return null
  return (
    <Menu anchor={anchor} onClose={onClose} align="end" width={190} ignore={[anchor]}>
      {SORT_KEYS.map((k) => (
        <MenuItem key={k.id} label={k.label} checked={settings.sortKey === k.id} onSelect={() => void patch({ sortKey: k.id })} />
      ))}
      <MenuSeparator />
      <MenuItem icon={<ArrowUp {...ICON} />} label="Ascending" checked={settings.sortDir === 'asc'} onSelect={() => void patch({ sortDir: 'asc' })} />
      <MenuItem icon={<ArrowDown {...ICON} />} label="Descending" checked={settings.sortDir === 'desc'} onSelect={() => void patch({ sortDir: 'desc' })} />
      <MenuSeparator />
      <MenuItem icon={<LayoutGrid {...ICON} />} label="Grid" checked={settings.view === 'grid'} onSelect={() => void patch({ view: 'grid' })} />
      <MenuItem icon={<List {...ICON} />} label="List" checked={settings.view === 'list'} onSelect={() => void patch({ view: 'list' })} />
    </Menu>
  )
}

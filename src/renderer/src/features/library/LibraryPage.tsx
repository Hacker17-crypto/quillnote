import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent } from 'react'
import { ChevronDown, ChevronRight, CircleCheck, Copy, FolderInput, Plus, Search, Settings, Trash2, X } from 'lucide-react'
import { TRASH_RETENTION_DAYS, type LibraryItem } from '@shared/types'
import { Button, EmptyState, IconButton } from '../../components/kit'
import { useLibrary } from '../../stores/library'
import { compareItems, useUi } from '../../stores/ui'
import { DocMenu, SortMenu } from './DocMenu'
import { ItemCard } from './ItemCard'
import { NewMenu } from './NewMenu'
import { createAndOpen, currentParent, openItem } from './actions'
import { breadcrumb, itemsFor } from './selectors'

const TITLES = { documents: 'Documents', favorites: 'Favorites', shared: 'Shared', marketplace: 'Marketplace', trash: 'Trash' } as const

export function LibraryPage(): JSX.Element {
  const items = useLibrary((s) => s.items)
  const loaded = useLibrary((s) => s.loaded)
  const ui = useUi()
  const { nav, folderId, selectMode, selected, settings, searching, query } = ui

  const [focusId, setFocusId] = useState<string | null>(null)
  const [newAnchor, setNewAnchor] = useState<HTMLElement | null>(null)
  const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null)
  const [menu, setMenu] = useState<{ item: LibraryItem; anchor: HTMLElement | { x: number; y: number } } | null>(null)
  const [dropId, setDropId] = useState<string | null>(null)
  const [fileDrag, setFileDrag] = useState(false)
  const newClickTimer = useRef<number>(0)
  const searchRef = useRef<HTMLInputElement>(null)

  const visible = useMemo(() => {
    const base = searching && query.trim() ? items.filter((i) => i.trashedAt === null && i.title.toLowerCase().includes(query.trim().toLowerCase())) : itemsFor(items, nav, folderId)
    return [...base].sort(compareItems(settings?.sortKey ?? 'date', settings?.sortDir ?? 'desc'))
  }, [items, nav, folderId, settings?.sortKey, settings?.sortDir, searching, query])

  const trail = useMemo(() => breadcrumb(items, folderId), [items, folderId])
  const inTrash = nav === 'trash'

  useEffect(() => {
    if (searching) searchRef.current?.focus()
  }, [searching])
  useEffect(() => setFocusId(null), [nav, folderId])

  // ── interactions ──
  const onCardClick = useCallback(
    (item: LibraryItem, _e: MouseEvent) => {
      if (useUi.getState().selectMode) useUi.getState().toggleSelected(item.id)
      else setFocusId(item.id)
    },
    []
  )
  const onFavorite = useCallback((item: LibraryItem) => void useLibrary.getState().setFavorite([item.id], !item.favorite), [])
  const onMenu = useCallback((item: LibraryItem, anchor: HTMLElement | { x: number; y: number }) => {
    setFocusId(item.id)
    setMenu({ item, anchor })
  }, [])

  const dragIds = useRef<string[]>([])
  const onDragStart = useCallback((item: LibraryItem, e: DragEvent) => {
    const st = useUi.getState()
    dragIds.current = st.selectMode && st.selected.includes(item.id) ? st.selected : [item.id]
    e.dataTransfer.setData('application/x-quill-items', dragIds.current.join(','))
    e.dataTransfer.effectAllowed = 'move'
  }, [])
  const onDragOverItem = useCallback((item: LibraryItem, e: DragEvent) => {
    if (item.type === 'folder' && dragIds.current.length && !dragIds.current.includes(item.id)) {
      e.preventDefault()
      e.stopPropagation()
      setDropId(item.id)
    }
  }, [])
  const onDropOnItem = useCallback((item: LibraryItem, e: DragEvent) => {
    setDropId(null)
    if (item.type !== 'folder' || !dragIds.current.length) return
    e.preventDefault()
    e.stopPropagation()
    const ids = dragIds.current.filter((id) => id !== item.id)
    dragIds.current = []
    if (ids.length) void useLibrary.getState().move(ids, item.id)
  }, [])

  const isFileDrag = (e: DragEvent): boolean => e.dataTransfer.types.includes('Files')
  const onGridDrop = async (e: DragEvent): Promise<void> => {
    setFileDrag(false)
    if (!isFileDrag(e)) return
    e.preventDefault()
    const paths = Array.from(e.dataTransfer.files).map((f) => window.quill.pathForFile(f)).filter(Boolean)
    if (paths.length) useLibrary.getState().applyImport(await window.quill.library.importPaths(paths, currentParent()))
  }

  // ── header ──
  const title = searching ? null : nav === 'documents' && trail.length ? null : TITLES[nav]
  const allSelected = visible.length > 0 && selected.length === visible.length
  const hasSel = selected.length > 0

  const onNewClick = (e: MouseEvent<HTMLElement>): void => {
    const el = e.currentTarget
    // Double-click on "+ New" makes a Quick note immediately.
    if (newClickTimer.current) {
      window.clearTimeout(newClickTimer.current)
      newClickTimer.current = 0
      setNewAnchor(null)
      void createAndOpen('quick')
      return
    }
    newClickTimer.current = window.setTimeout(() => {
      newClickTimer.current = 0
      setNewAnchor((cur) => (cur ? null : el))
    }, 230)
  }

  const header = selectMode ? (
    <div className="lib-head select">
      <IconButton label="Exit select mode" size={34} onClick={ui.exitSelect} tip={false}>
        <X size={22} />
      </IconButton>
      <button type="button" className="sel-all" onClick={() => ui.setSelected(allSelected ? [] : visible.map((i) => i.id))}>
        <span className={`sel-radio${allSelected ? ' on' : ''}`} />
        Select all
      </button>
      <button type="button" className="sel-act" disabled={!hasSel} onClick={() => void useLibrary.getState().duplicate(selected).then(ui.exitSelect)}>
        <Copy size={20} strokeWidth={1.6} /> Duplicate
      </button>
      <button type="button" className="sel-act" disabled={!hasSel} onClick={() => ui.openDialog({ kind: 'move', ids: selected })}>
        <FolderInput size={20} strokeWidth={1.6} /> Move
      </button>
      <button type="button" className="sel-act" disabled={!hasSel} onClick={() => (inTrash ? ui.openDialog({ kind: 'confirmDelete', ids: selected }) : void useLibrary.getState().trash(selected).then(ui.exitSelect))}>
        <Trash2 size={20} strokeWidth={1.6} /> Delete
      </button>
    </div>
  ) : (
    <div className="lib-head">
      {searching ? (
        <div className="lib-search">
          <Search size={22} strokeWidth={1.8} />
          <input ref={searchRef} value={query} placeholder="Search documents and folders" onChange={(e) => ui.setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && ui.setSearching(false)} />
          <button type="button" className="lib-search-x" aria-label="Close search" onClick={() => ui.setSearching(false)}>
            <X size={18} />
          </button>
        </div>
      ) : nav === 'documents' && trail.length ? (
        <h1 className="lib-title-h crumbs">
          <button type="button" onClick={() => ui.openFolder(null)}>Documents</button>
          {trail.map((f, i) => (
            <span key={f.id} className="crumb">
              <ChevronRight size={22} />
              {i === trail.length - 1 ? <span>{f.title}</span> : <button type="button" onClick={() => ui.openFolder(f.id)}>{f.title}</button>}
            </span>
          ))}
        </h1>
      ) : (
        <h1 className="lib-title-h">{title}</h1>
      )}
      <div className="lib-actions">
        {nav === 'documents' && !searching && (
          <Button variant="primary" className="new-btn" icon={<Plus size={20} strokeWidth={1.8} />} trailing={<ChevronDown size={15} />} onClick={onNewClick} aria-haspopup="menu" aria-expanded={!!newAnchor}>
            New
          </Button>
        )}
        {nav === 'trash' && (
          <Button variant="outline" disabled={!visible.length} onClick={() => ui.openDialog({ kind: 'confirmEmpty' })}>
            Empty Trash
          </Button>
        )}
        {!searching && (nav === 'documents' || nav === 'favorites' || nav === 'trash') && (
          <>
            <span className="lib-act-sep" />
            <Button variant="outline" className="sort-btn" trailing={<ChevronDown size={15} />} onClick={(e) => setSortAnchor((c) => (c ? null : e.currentTarget))} aria-haspopup="menu">
              {settings?.sortKey === 'name' ? 'Name' : settings?.sortKey === 'type' ? 'Type' : 'Date'}
            </Button>
            <IconButton label="Select" size={38} onClick={() => ui.enterSelect()} disabled={!visible.length}>
              <CircleCheck size={26} strokeWidth={1.5} />
            </IconButton>
          </>
        )}
      </div>
    </div>
  )

  // ── body ──
  let body: JSX.Element
  if (!loaded) body = <div className="lib-grid" />
  else if (nav === 'shared')
    body = <EmptyState art="shared" title="No shared documents" caption="Export a notebook as a Quillnote file from its menu to share it, or open a .quill file someone sent you with + New → Import." />
  else if (nav === 'marketplace') body = <EmptyState art="search" title="Marketplace" caption="Templates, stickers and covers are coming in a later update." />
  else if (!visible.length) {
    if (searching && query.trim()) body = <EmptyState art="search" title="No results" caption={`Nothing in your library matches “${query.trim()}”.`} />
    else if (nav === 'favorites')
      body = <EmptyState art="favorites" title="Find things quicker with Favorites" caption="Click ☆ to add documents or folders, or bookmark a page with 🔖" />
    else if (nav === 'trash') body = <EmptyState art="trash" title="Trash is empty" caption={`Deleted items stay here for ${TRASH_RETENTION_DAYS} days before they are removed.`} />
    else body = <EmptyState art="folder" title={folderId ? 'This folder is empty' : 'No documents yet'} caption="Click + New to create a notebook, whiteboard or quick note, or drop files here to import them." />
  } else {
    body = (
      <div className={`lib-grid${settings?.view === 'list' ? ' list' : ''}`} onClick={(e) => e.target === e.currentTarget && setFocusId(null)}>
        {visible.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            focused={focusId === item.id || menu?.item.id === item.id}
            selectMode={selectMode}
            selected={selected.includes(item.id)}
            trash={inTrash}
            dropTarget={dropId === item.id}
            onClick={onCardClick}
            onOpen={openItem}
            onMenu={onMenu}
            onFavorite={onFavorite}
            onDragStart={onDragStart}
            onDragOverItem={onDragOverItem}
            onDropOnItem={onDropOnItem}
          />
        ))}
      </div>
    )
  }

  return (
    <main
      className={`lib-main${fileDrag ? ' filedrop' : ''}`}
      onDragOver={(e) => {
        if (isFileDrag(e)) {
          e.preventDefault()
          setFileDrag(true)
        }
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setFileDrag(false)}
      onDrop={(e) => void onGridDrop(e)}
      onDragEnd={() => {
        dragIds.current = []
        setDropId(null)
      }}
    >
      <div className="lib-top">
        <IconButton label="Search" size={36} onClick={() => ui.setSearching(true)}>
          <Search size={22} strokeWidth={1.7} />
        </IconButton>
        <IconButton label="Settings" size={36} onClick={() => ui.toast('Settings arrive in M8')}>
          <Settings size={22} strokeWidth={1.7} />
        </IconButton>
      </div>
      {header}
      <div className="lib-body">
        {inTrash && visible.length > 0 && <p className="lib-note">Items in Trash are deleted after {TRASH_RETENTION_DAYS} days.</p>}
        {body}
      </div>
      {newAnchor && <NewMenu anchor={newAnchor} onClose={() => setNewAnchor(null)} />}
      {sortAnchor && <SortMenu anchor={sortAnchor} onClose={() => setSortAnchor(null)} />}
      {menu && <DocMenu item={menu.item} anchor={menu.anchor} onClose={() => setMenu(null)} />}
    </main>
  )
}

import { create } from 'zustand'
import type { DocKind, ImportResult, LibraryItem, NewDocOptions } from '@shared/types'
import type { LibraryChange } from '@shared/api'
import { useUi } from './ui'

interface LibraryState {
  items: LibraryItem[]
  loaded: boolean
  load: () => Promise<void>
  createDoc: (opts: NewDocOptions) => Promise<string | undefined>
  quickCreate: (kind: DocKind, parentId: string | null) => Promise<string | undefined>
  createFolder: (title: string, parentId: string | null) => Promise<string | undefined>
  rename: (id: string, title: string) => Promise<void>
  duplicate: (ids: string[]) => Promise<void>
  move: (ids: string[], parentId: string | null) => Promise<void>
  trash: (ids: string[]) => Promise<void>
  restore: (ids: string[]) => Promise<void>
  deleteForever: (ids: string[]) => Promise<void>
  emptyTrash: () => Promise<void>
  setFavorite: (ids: string[], fav: boolean) => Promise<void>
  setCover: (id: string, cover: string) => Promise<void>
  applyImport: (r: ImportResult) => void
}

const toast = (msg: string, action?: { label: string; run: () => void }): void => useUi.getState().toast(msg, action)

export const useLibrary = create<LibraryState>((set, get) => {
  /** Run a mutation and replace the item list with the new index from main. */
  async function run(fn: () => Promise<LibraryChange>): Promise<string | undefined> {
    try {
      const res = await fn()
      set({ items: res.items })
      return res.id
    } catch (e) {
      toast(`Something went wrong: ${e instanceof Error ? e.message.replace(/^Error invoking remote method '[^']+': /, '') : 'unknown error'}`)
      return undefined
    }
  }
  const q = window.quill.library
  const noun = (ids: string[]): string => (ids.length === 1 ? 'item' : `${ids.length} items`)

  return {
    items: [],
    loaded: false,
    load: async () => {
      set({ items: await q.list(), loaded: true })
    },
    createDoc: (opts) => run(() => q.createDoc(opts)),
    quickCreate: (kind, parentId) => run(() => q.createDoc({ kind, parentId })),
    createFolder: (title, parentId) => run(() => q.createFolder(title, parentId)),
    rename: async (id, title) => {
      await run(() => q.rename(id, title))
    },
    duplicate: async (ids) => {
      await run(() => q.duplicate(ids))
      toast(`Duplicated ${noun(ids)}`)
    },
    move: async (ids, parentId) => {
      await run(() => q.move(ids, parentId))
      toast(`Moved ${noun(ids)}`)
    },
    trash: async (ids) => {
      await run(() => q.trash(ids))
      toast(`Moved ${noun(ids)} to Trash`, { label: 'Undo', run: () => void get().restore(ids) })
    },
    restore: async (ids) => {
      await run(() => q.restore(ids))
      toast(`Restored ${noun(ids)}`)
    },
    deleteForever: async (ids) => {
      await run(() => q.deleteForever(ids))
    },
    emptyTrash: async () => {
      await run(() => q.emptyTrash())
    },
    setFavorite: async (ids, fav) => {
      await run(() => q.setFavorite(ids, fav))
    },
    setCover: async (id, cover) => {
      await run(() => q.setCover(id, cover))
    },
    applyImport: (r) => {
      set({ items: r.items })
      if (r.imported.length) toast(`Imported ${r.imported.length} ${r.imported.length === 1 ? 'item' : 'items'}`)
      if (r.skipped.length) toast(r.skipped[0])
    }
  }
})

import { create } from 'zustand'
import type { LibraryItem, Settings, SortKey } from '@shared/types'

export type NavId = 'documents' | 'favorites' | 'shared' | 'marketplace' | 'trash'

export interface Toast {
  id: number
  message: string
  action?: { label: string; run: () => void }
}

export type Dialog =
  | { kind: 'newNotebook' }
  | { kind: 'rename'; item: LibraryItem }
  | { kind: 'newFolder' }
  | { kind: 'move'; ids: string[] }
  | { kind: 'cover'; item: LibraryItem }
  | { kind: 'confirmDelete'; ids: string[] }
  | { kind: 'confirmEmpty' }
  | null

interface UiState {
  settings: Settings | null
  nav: NavId
  /** Folder currently open in Documents (null = root). */
  folderId: string | null
  selectMode: boolean
  selected: string[]
  searching: boolean
  query: string
  dialog: Dialog
  toasts: Toast[]
  setSettings: (s: Settings) => void
  patchSettings: (patch: Partial<Settings>) => Promise<void>
  setNav: (n: NavId) => void
  openFolder: (id: string | null) => void
  enterSelect: (id?: string) => void
  exitSelect: () => void
  toggleSelected: (id: string) => void
  setSelected: (ids: string[]) => void
  setSearching: (v: boolean) => void
  setQuery: (q: string) => void
  openDialog: (d: Dialog) => void
  closeDialog: () => void
  toast: (message: string, action?: Toast['action']) => void
  dismissToast: (id: number) => void
}

let toastId = 1

export const useUi = create<UiState>((set, get) => ({
  settings: null,
  nav: 'documents',
  folderId: null,
  selectMode: false,
  selected: [],
  searching: false,
  query: '',
  dialog: null,
  toasts: [],
  setSettings: (settings) => set({ settings }),
  patchSettings: async (patch) => {
    set((s) => (s.settings ? { settings: { ...s.settings, ...patch } } : s))
    const next = await window.quill.settings.set(patch)
    set({ settings: next })
  },
  setNav: (nav) => set({ nav, folderId: null, selectMode: false, selected: [], searching: false, query: '' }),
  openFolder: (folderId) => set({ folderId, selectMode: false, selected: [], searching: false, query: '' }),
  enterSelect: (id) => set({ selectMode: true, selected: id ? [id] : [] }),
  exitSelect: () => set({ selectMode: false, selected: [] }),
  toggleSelected: (id) =>
    set((s) => ({ selected: s.selected.includes(id) ? s.selected.filter((x) => x !== id) : [...s.selected, id] })),
  setSelected: (selected) => set({ selected }),
  setSearching: (searching) => set({ searching, query: searching ? get().query : '' }),
  setQuery: (query) => set({ query }),
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
  toast: (message, action) => {
    const id = toastId++
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, action }] }))
    window.setTimeout(() => get().dismissToast(id), action ? 6000 : 3200)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}))

export function compareItems(key: SortKey, dir: 'asc' | 'desc'): (a: LibraryItem, b: LibraryItem) => number {
  const sign = dir === 'asc' ? 1 : -1
  return (a, b) => {
    // Folders always sort first.
    if ((a.type === 'folder') !== (b.type === 'folder')) return a.type === 'folder' ? -1 : 1
    let r: number
    if (key === 'name') r = a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })
    else if (key === 'type') r = a.type.localeCompare(b.type) || b.modifiedAt - a.modifiedAt
    else r = a.modifiedAt - b.modifiedAt
    return r * sign
  }
}

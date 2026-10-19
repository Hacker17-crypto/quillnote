import { create } from 'zustand'

export interface DocTab {
  id: string
  title: string
}

interface TabsState {
  tabs: DocTab[]
  /** 'home' = the library; otherwise a document id. */
  active: string
  open: (id: string, title: string) => void
  close: (id: string) => void
  activate: (id: string) => void
  retitle: (id: string, title: string) => void
  /** Move tab `from` to the position of tab `to`. */
  reorder: (from: string, to: string) => void
  /** Drop tabs whose documents no longer exist or were trashed. */
  prune: (liveIds: Set<string>) => void
}

export const useTabs = create<TabsState>((set) => ({
  tabs: [],
  active: 'home',
  open: (id, title) =>
    set((s) => ({ tabs: s.tabs.some((t) => t.id === id) ? s.tabs : [...s.tabs, { id, title }], active: id })),
  close: (id) =>
    set((s) => {
      const i = s.tabs.findIndex((t) => t.id === id)
      const tabs = s.tabs.filter((t) => t.id !== id)
      const active = s.active === id ? (tabs[Math.min(i, tabs.length - 1)]?.id ?? 'home') : s.active
      return { tabs, active }
    }),
  activate: (active) => set({ active }),
  retitle: (id, title) => set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, title } : t)) })),
  reorder: (from, to) =>
    set((s) => {
      const tabs = s.tabs.slice()
      const i = tabs.findIndex((t) => t.id === from)
      const j = tabs.findIndex((t) => t.id === to)
      if (i < 0 || j < 0) return s
      const [m] = tabs.splice(i, 1)
      tabs.splice(j, 0, m)
      return { tabs }
    }),
  prune: (liveIds) =>
    set((s) => {
      const tabs = s.tabs.filter((t) => liveIds.has(t.id))
      if (tabs.length === s.tabs.length) return s
      return { tabs, active: tabs.some((t) => t.id === s.active) ? s.active : 'home' }
    })
}))

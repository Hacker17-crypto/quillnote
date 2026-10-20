/**
 * Open documents: content, undo history, view state and autosave (500 ms debounce).
 * Every content change goes through `edit`, which records undo snapshots of `doc.pages`.
 */
import { create } from 'zustand'
import type { PageData, PageObject, QuillDoc } from '@shared/types'
import { useLibrary } from './library'
import { useUi } from './ui'

export type PanelId = 'pages' | 'search' | 'ai' | 'recordings'

export interface Selection {
  pageId: string
  ids: string[]
}

export interface SearchHit {
  page: number
  /** Highlight rectangles in page units. */
  rects: { x: number; y: number; w: number; h: number }[]
}

export interface DocSession {
  doc: QuillDoc
  past: PageData[][]
  future: PageData[][]
  status: 'saved' | 'saving' | 'unsaved' | 'error'
  /** Index of the page nearest the middle of the viewport. */
  page: number
  zoom: number
  selection: Selection | null
  /** Text box / sticky note currently being typed in. */
  editing: string | null
  readOnly: boolean
  panel: PanelId | null
  /** Ask the view to scroll a page (and optional point) into view. */
  jump: { page: number; y?: number; nonce: number } | null
  hits: SearchHit[]
  /** Ink playback: strokes from this recording written after `t` ms are dimmed. */
  playback: { rec: string; t: number } | null
  /** Recording in progress: new strokes get tagged with it. */
  recording: { id: string; startedAt: number; pausedMs: number; pausedAt: number | null } | null
}

interface EditorState {
  sessions: Record<string, DocSession>
  open: (id: string) => Promise<void>
  close: (id: string) => Promise<void>
  /** Change document content. `history: false` for transient steps of one gesture. */
  edit: (id: string, fn: (doc: QuillDoc) => QuillDoc, opts?: { history?: boolean }) => void
  /** Shorthand: replace one page's objects. */
  editObjects: (id: string, pageId: string, fn: (objs: PageObject[]) => PageObject[], opts?: { history?: boolean }) => void
  /** Start a multi-step gesture: one undo step for everything until `endGesture`. */
  beginGesture: (id: string) => void
  endGesture: (id: string) => void
  undo: (id: string) => void
  redo: (id: string) => void
  view: (id: string, patch: Partial<Omit<DocSession, 'doc' | 'past' | 'future' | 'status'>>) => void
  saveNow: (id: string) => Promise<void>
  flushAll: () => Promise<void>
}

const HISTORY = 200
const timers = new Map<string, number>()
const gestureStart = new Map<string, PageData[]>()

export const useEditor = create<EditorState>((set, get) => {
  const patchSession = (id: string, p: Partial<DocSession>): void =>
    set((s) => (s.sessions[id] ? { sessions: { ...s.sessions, [id]: { ...s.sessions[id], ...p } } } : s))

  const schedule = (id: string): void => {
    window.clearTimeout(timers.get(id))
    timers.set(id, window.setTimeout(() => void get().saveNow(id), 500))
  }

  return {
    sessions: {},

    open: async (id) => {
      if (get().sessions[id]) return
      const doc = await window.quill.library.readDoc(id)
      const fresh: DocSession = {
        doc, past: [], future: [], status: 'saved', page: 0, zoom: 0, selection: null, editing: null,
        readOnly: false, panel: null, jump: null, hits: [], playback: null, recording: null
      }
      set((s) => (s.sessions[id] ? s : { sessions: { ...s.sessions, [id]: fresh } }))
    },

    close: async (id) => {
      await get().saveNow(id)
      set((s) => {
        const next = { ...s.sessions }
        delete next[id]
        return { sessions: next }
      })
    },

    edit: (id, fn, opts = {}) => {
      const cur = get().sessions[id]
      if (!cur) return
      const doc = fn(cur.doc)
      if (doc === cur.doc) return
      const history = opts.history !== false && !gestureStart.has(id) && doc.pages !== cur.doc.pages
      patchSession(id, {
        doc,
        past: history ? [...cur.past.slice(-HISTORY + 1), cur.doc.pages] : cur.past,
        future: history ? [] : cur.future,
        status: 'unsaved'
      })
      schedule(id)
    },

    editObjects: (id, pageId, fn, opts) =>
      get().edit(
        id,
        (doc) => {
          const i = doc.pages.findIndex((p) => p.id === pageId)
          if (i < 0) return doc
          const objects = fn(doc.pages[i].objects)
          if (objects === doc.pages[i].objects) return doc
          const pages = doc.pages.slice()
          pages[i] = { ...pages[i], objects }
          return { ...doc, pages }
        },
        opts
      ),

    beginGesture: (id) => {
      const cur = get().sessions[id]
      if (cur && !gestureStart.has(id)) gestureStart.set(id, cur.doc.pages)
    },

    endGesture: (id) => {
      const before = gestureStart.get(id)
      gestureStart.delete(id)
      const cur = get().sessions[id]
      if (!cur || !before || before === cur.doc.pages) return
      patchSession(id, { past: [...cur.past.slice(-HISTORY + 1), before], future: [] })
    },

    undo: (id) => {
      const cur = get().sessions[id]
      if (!cur?.past.length) return
      const pages = cur.past[cur.past.length - 1]
      patchSession(id, {
        doc: { ...cur.doc, pages },
        past: cur.past.slice(0, -1),
        future: [cur.doc.pages, ...cur.future],
        selection: null,
        editing: null,
        page: Math.min(cur.page, pages.length - 1),
        status: 'unsaved'
      })
      schedule(id)
    },

    redo: (id) => {
      const cur = get().sessions[id]
      if (!cur?.future.length) return
      const pages = cur.future[0]
      patchSession(id, {
        doc: { ...cur.doc, pages },
        past: [...cur.past, cur.doc.pages],
        future: cur.future.slice(1),
        selection: null,
        editing: null,
        page: Math.min(cur.page, pages.length - 1),
        status: 'unsaved'
      })
      schedule(id)
    },

    view: (id, patch) => patchSession(id, patch),

    saveNow: async (id) => {
      window.clearTimeout(timers.get(id))
      timers.delete(id)
      const cur = get().sessions[id]
      if (!cur || cur.status === 'saved') return
      const doc = cur.doc
      patchSession(id, { status: 'saving' })
      try {
        const res = await window.quill.library.saveDoc(doc)
        useLibrary.setState({ items: res.items })
        // Only mark saved if nothing changed while the write was in flight.
        if (get().sessions[id]?.doc === doc) patchSession(id, { status: 'saved' })
      } catch (e) {
        patchSession(id, { status: 'error' })
        useUi.getState().toast(`Couldn't save: ${e instanceof Error ? e.message.replace(/^Error invoking remote method '[^']+': /, '') : 'unknown error'}`)
      }
    },

    flushAll: async () => {
      await Promise.all(Object.keys(get().sessions).map((id) => get().saveNow(id)))
    }
  }
})

/** Keep titles and covers changed from the library in step with open documents. */
useLibrary.subscribe((lib) => {
  const { sessions } = useEditor.getState()
  for (const [id, s] of Object.entries(sessions)) {
    const item = lib.items.find((i) => i.id === id)
    if (item && (item.title !== s.doc.title || (item.cover !== s.doc.cover && item.type === 'notebook')))
      useEditor.setState((st) => ({ sessions: { ...st.sessions, [id]: { ...st.sessions[id], doc: { ...st.sessions[id].doc, title: item.title, cover: item.cover } } } }))
  }
})

export function useSession<T>(id: string, pick: (s: DocSession) => T): T {
  return useEditor((st) => pick(st.sessions[id] ?? EMPTY))
}

const EMPTY = {
  doc: { version: 1, id: '', kind: 'notebook', title: '', createdAt: 0, modifiedAt: 0, cover: null, paper: { template: 'blank', color: 'white', size: 'a4', orientation: 'portrait', style: 'standard', lang: 'en-US' }, pages: [] },
  past: [], future: [], status: 'saved', page: 0, zoom: 1, selection: null, editing: null, readOnly: false, panel: null, jump: null, hits: [], playback: null, recording: null
} as DocSession

export const session = (id: string): DocSession | undefined => useEditor.getState().sessions[id]

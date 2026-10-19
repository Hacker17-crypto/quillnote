/** Pure helpers to build new documents. Used by main (creation/import) and the renderer. */
import { DEFAULT_COVER } from './covers'
import { DEFAULT_PAPER, pageDims } from './paper'
import type { DocKind, ItemType, LibraryItem, NewDocOptions, PageData, PaperSpec, QuillDoc } from './types'

export const uid = (): string => globalThis.crypto.randomUUID()

/** "Oct 19, 2026 at 3:52 PM" — the format used under library thumbnails. */
export function formatItemDate(ts: number): string {
  const d = new Date(ts)
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${date} at ${time}`
}

export function defaultTitle(kind: DocKind | 'folder', now = Date.now()): string {
  switch (kind) {
    case 'notebook': return 'Untitled Notebook'
    case 'whiteboard': return 'Untitled Whiteboard'
    case 'text': return 'Untitled Text Document'
    case 'quick': return formatItemDate(now)
    case 'image': return 'Untitled Image'
    case 'pdf': return 'Untitled PDF'
    case 'folder': return 'Untitled Folder'
  }
}

export const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  notebook: 'Notebook',
  quick: 'Quick note',
  whiteboard: 'Whiteboard',
  text: 'Text document',
  image: 'Image',
  pdf: 'PDF',
  folder: 'Folder'
}

export function newPage(paper: PaperSpec): PageData {
  const { w, h } = pageDims(paper.size, paper.orientation)
  return { id: uid(), width: w, height: h, paper, objects: [] }
}

export const WHITEBOARD_PAPER: PaperSpec = {
  template: 'dotted',
  color: 'white',
  size: 'a4',
  orientation: 'landscape',
  style: 'standard',
  lang: 'en-US'
}

/** Build the on-disk content of a freshly created document. */
export function createDocContent(id: string, opts: NewDocOptions, now = Date.now()): QuillDoc {
  const base = { version: 1 as const, id, kind: opts.kind, createdAt: now, modifiedAt: now }
  const title = opts.title?.trim() || defaultTitle(opts.kind, now)
  switch (opts.kind) {
    case 'whiteboard':
      return {
        ...base, title, cover: null, paper: WHITEBOARD_PAPER,
        pages: [{ id: uid(), width: 3200, height: 2400, infinite: true, paper: WHITEBOARD_PAPER, objects: [] }]
      }
    case 'text': {
      const paper: PaperSpec = { ...DEFAULT_PAPER, template: 'blank', color: 'white' }
      return { ...base, title, cover: null, paper, pages: [newPage(paper)], text: { html: '' } }
    }
    case 'quick': {
      const paper = opts.paper ?? DEFAULT_PAPER
      return { ...base, title, cover: null, paper, pages: [newPage(paper)] }
    }
    default: {
      const paper = opts.paper ?? DEFAULT_PAPER
      return { ...base, title, cover: opts.cover ?? DEFAULT_COVER, paper, pages: [newPage(paper)] }
    }
  }
}

/** Library index entry for a document. */
export function itemFromDoc(doc: QuillDoc, parentId: string | null, prev?: LibraryItem): LibraryItem {
  const first = doc.pages[0]
  return {
    id: doc.id,
    type: doc.kind,
    title: doc.title,
    parentId,
    createdAt: doc.createdAt,
    modifiedAt: doc.modifiedAt,
    favorite: prev?.favorite ?? false,
    trashedAt: prev?.trashedAt ?? null,
    cover: doc.cover,
    paper: first?.paper ?? doc.paper,
    pageCount: doc.pages.length,
    thumbAsset: first?.background?.type === 'image' ? (first.background.asset ?? null) : null
  }
}

export function newFolderItem(title: string, parentId: string | null, now = Date.now()): LibraryItem {
  return {
    id: uid(), type: 'folder', title: title.trim() || defaultTitle('folder'), parentId,
    createdAt: now, modifiedAt: now, favorite: false, trashedAt: null,
    cover: null, paper: null, pageCount: 0, thumbAsset: null
  }
}

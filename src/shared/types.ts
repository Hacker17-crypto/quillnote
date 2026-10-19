/**
 * Quillnote shared types: document model, library index and settings.
 * Imported by main, preload and renderer (types only, no runtime code).
 */

// ───────────────────────── Paper ─────────────────────────
export type PaperColor = 'white' | 'yellow' | 'dark'
export type PageSize = 'a4' | 'letter' | 'wide'
export type Orientation = 'portrait' | 'landscape'
/** Line weight family; shown as the "template set" pill in the New Notebook dialog. */
export type PaperStyle = 'standard' | 'fine' | 'bold'

export interface PaperSpec {
  /** Template id, see shared/paper.ts (e.g. "squared", "cornell", "weekly"). */
  template: string
  color: PaperColor
  size: PageSize
  orientation: Orientation
  style: PaperStyle
  /** BCP-47 language for planner labels (en-US, es, fr...). */
  lang: string
}

// ───────────────────────── Document ─────────────────────────
export type DocKind = 'notebook' | 'quick' | 'whiteboard' | 'text' | 'image' | 'pdf'
export type ItemType = DocKind | 'folder'

/** A point is stored flat as [x, y, pressure] triples in page units (pt). */
export interface StrokeObject {
  id: string
  type: 'stroke'
  tool: 'fountain' | 'ball' | 'brush' | 'highlighter'
  color: string
  width: number
  points: number[]
  /** Milliseconds from recording start, for audio-linked playback (M7). */
  t?: number
}
export interface TextObject {
  id: string
  type: 'text'
  x: number
  y: number
  w: number
  h: number
  html: string
}
export interface ImageObject {
  id: string
  type: 'image'
  x: number
  y: number
  w: number
  h: number
  rotation: number
  opacity: number
  asset: string
}
export interface ShapeObject {
  id: string
  type: 'shape'
  shape: 'line' | 'arrow' | 'rect' | 'ellipse' | 'triangle' | 'polygon' | 'star'
  x: number
  y: number
  w: number
  h: number
  stroke: string
  fill: string | null
  width: number
  dash: boolean
}
export interface StickerObject {
  id: string
  type: 'sticker'
  x: number
  y: number
  w: number
  h: number
  svg: string
}
export interface StickyObject {
  id: string
  type: 'sticky'
  x: number
  y: number
  w: number
  h: number
  color: string
  text: string
  collapsed: boolean
}
export type PageObject =
  | StrokeObject
  | TextObject
  | ImageObject
  | ShapeObject
  | StickerObject
  | StickyObject

export interface PageBackground {
  type: 'pdf' | 'image'
  /** pdf: page index inside assets/source.pdf. image: file name inside assets/. */
  pdfPage?: number
  asset?: string
}

export interface PageData {
  id: string
  /** Page size in points. Whiteboards use a single "infinite" page. */
  width: number
  height: number
  infinite?: boolean
  paper: PaperSpec
  background?: PageBackground
  objects: PageObject[]
  /** AI-recognised handwriting (M7); feeds the search index. */
  ocrText?: string
  bookmarked?: boolean
  outlineTitle?: string
}

export interface QuillDoc {
  version: 1
  id: string
  kind: DocKind
  title: string
  createdAt: number
  modifiedAt: number
  cover: string | null
  paper: PaperSpec
  pages: PageData[]
  /** Rich-text content (TipTap JSON/HTML) for `text` documents. */
  text?: { html: string }
}

// ───────────────────────── Library ─────────────────────────
export interface LibraryItem {
  id: string
  type: ItemType
  title: string
  parentId: string | null
  createdAt: number
  modifiedAt: number
  favorite: boolean
  /** Epoch ms when moved to Trash; null when live. */
  trashedAt: number | null
  /** Cover id for notebooks. */
  cover: string | null
  /** Paper used by the first page (drives thumbnails of quick notes and pages). */
  paper: PaperSpec | null
  pageCount: number
  /** Asset file name for image documents (thumbnail). */
  thumbAsset: string | null
}

export interface NewDocOptions {
  kind: DocKind
  title?: string
  parentId: string | null
  cover?: string | null
  paper?: PaperSpec
}

export interface ImportResult {
  items: LibraryItem[]
  imported: string[]
  skipped: string[]
}

// ───────────────────────── Settings ─────────────────────────
export type ThemeSetting = 'system' | 'light' | 'dark'
export type SortKey = 'date' | 'name' | 'type'

export interface Settings {
  theme: ThemeSetting
  libraryRoot: string
  defaultPaper: PaperSpec
  defaultCover: string
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  view: 'grid' | 'list'
  scrollDirection: 'vertical' | 'horizontal'
  onlyDrawWithStylus: boolean
  claudePath: string
}

export const TRASH_RETENTION_DAYS = 30

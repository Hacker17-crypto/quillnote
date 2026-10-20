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

export type StrokeTool = 'fountain' | 'ball' | 'brush' | 'highlighter' | 'tape'

/** perfect-freehand parameters captured when the stroke was drawn. */
export interface StrokeOpts {
  thinning: number
  smoothing: number
  streamline: number
  taperStart: number
  taperEnd: number
  /** Simulate pressure from velocity (mouse input). */
  simulate: boolean
  /** Fountain pen: nib angle in radians (width varies with direction). */
  nib?: number
}

/** A point is stored flat as [x, y, pressure] triples in page units (pt). */
export interface StrokeObject {
  id: string
  type: 'stroke'
  tool: StrokeTool
  color: string
  width: number
  points: number[]
  opts?: StrokeOpts
  /** Recording this stroke was written during, and ms from its start (ink playback). */
  rec?: string
  t?: number
  /** Tape: currently peeled back to reveal what is underneath. */
  revealed?: boolean
}
export interface TextObject {
  id: string
  type: 'text'
  x: number
  y: number
  w: number
  h: number
  html: string
  font?: 'sans' | 'serif' | 'mono' | 'hand'
  size?: number
  color?: string
  align?: 'left' | 'center' | 'right'
  bg?: string | null
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
  /** Visible part of the source image as fractions (0–1). */
  crop?: { x: number; y: number; w: number; h: number }
}
export interface ShapeObject {
  id: string
  type: 'shape'
  shape: 'line' | 'arrow' | 'rect' | 'ellipse' | 'triangle' | 'polygon' | 'star'
  x: number
  y: number
  w: number
  h: number
  /** Absolute vertices for line / arrow / triangle / polygon. */
  points?: number[]
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
  rotation?: number
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
  /** pdf: page index inside the PDF asset (default source.pdf). image: file name inside assets/. */
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
  /** Rich-text content (HTML) for `text` documents. */
  text?: { html: string }
  recordings?: Recording[]
  flashcards?: Flashcard[]
}

export interface Recording {
  id: string
  /** webm/opus file inside assets/. */
  asset: string
  title: string
  createdAt: number
  /** Milliseconds. */
  duration: number
  transcript?: string
  summary?: string
}

export interface Flashcard {
  id: string
  q: string
  a: string
  /** Spaced-repetition box (0 = new / again, higher = known better). */
  box: number
  due: number
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
  /** Editor tool state (colours, widths, current tool...). Shape owned by the renderer. */
  tools?: unknown
  /** Main toolbar order and hidden tools. */
  toolbar?: { order: string[]; hidden: string[] }
  gestures?: { doubleTapEraser: boolean; scribbleErase: boolean; drawAndHold: boolean; circleLasso: boolean }
  /** Marketplace items the user added (ids), and the ones they hearted. */
  owned?: string[]
  liked?: string[]
  /** Folder for automatic .quill backups ('' = off). */
  backupFolder?: string
  profileName?: string
}

export const TRASH_RETENTION_DAYS = 30

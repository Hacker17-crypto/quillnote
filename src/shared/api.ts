import type {
  ImportResult,
  LibraryItem,
  NewDocOptions,
  QuillDoc,
  Settings
} from './types'

export interface ExportResult {
  ok: boolean
  path?: string
  error?: string
}

export interface ClaudeStatus {
  found: boolean
  path: string | null
  version: string | null
}

/** One page handed to main for PDF export / print. Coordinates are page points. */
export interface ExportPage {
  width: number
  height: number
  bg:
    | { type: 'svg'; svg: string }
    | { type: 'image'; asset: string }
    | { type: 'pdf'; asset: string; page: number }
    /** Pre-rendered PNG (used for printing PDF-backed pages). */
    | { type: 'png'; dataUrl: string }
    | { type: 'none'; color?: string }
  /** Annotation layer: a complete <svg> element in page units (quill-asset:// hrefs allowed). */
  overlay: string
}

export interface ExportPayload {
  docId: string
  title: string
  pages: ExportPage[]
  /** Text documents: flowing HTML paginated by the print engine instead of fixed pages. */
  flow?: string
}

export interface AddedAsset {
  asset: string
  width: number
  height: number
}

export interface AddedPdf {
  asset: string
  pages: { width: number; height: number }[]
}

export type AiKind = 'chat' | 'ocr' | 'summarize' | 'spell' | 'math' | 'quiz' | 'create' | 'recording' | 'search' | 'title'

export interface AiImage {
  name: string
  /** PNG bytes as base64 (no data: prefix). */
  base64: string
}

export interface AiRequest {
  id: string
  kind: AiKind
  /** The user's message / instruction (chat, create, search query). */
  prompt?: string
  /** Earlier chat turns, oldest first. */
  history?: { role: 'user' | 'assistant'; text: string }[]
  /** Human label for the context ("this page", "pages 1–4", "the selection"). */
  scope?: string
  /** Typed / recognised / PDF text that makes up the context. */
  text?: string
  images?: AiImage[]
}

export type AiEvent =
  | { id: string; type: 'chunk'; text: string }
  | { id: string; type: 'done'; text: string }
  | { id: string; type: 'error'; error: string }

export interface ElementItem {
  id: string
  name: string
  /** Page objects normalised so the group's top-left is 0,0. */
  objects: unknown[]
  w: number
  h: number
}

export interface ElementCollection {
  id: string
  name: string
  items: ElementItem[]
}

/** Result of any library mutation: the new full index (plus the id that was created/affected). */
export interface LibraryChange {
  items: LibraryItem[]
  id?: string
}

/**
 * The renderer-facing API exposed on `window.quill` by the preload script.
 * Later milestones add namespaces (ai, audio, pdf) here and in src/main/ipc.ts.
 */
export interface QuillApi {
  platform: 'win32' | 'darwin' | 'linux'
  win: {
    minimize(): void
    toggleMaximize(): void
    close(): void
    isMaximized(): Promise<boolean>
    onMaximizedChange(cb: (maximized: boolean) => void): () => void
  }
  settings: {
    get(): Promise<Settings>
    set(patch: Partial<Settings>): Promise<Settings>
    pickLibraryFolder(): Promise<Settings | null>
  }
  library: {
    list(): Promise<LibraryItem[]>
    createDoc(opts: NewDocOptions): Promise<LibraryChange>
    createFolder(title: string, parentId: string | null): Promise<LibraryChange>
    rename(id: string, title: string): Promise<LibraryChange>
    duplicate(ids: string[]): Promise<LibraryChange>
    move(ids: string[], parentId: string | null): Promise<LibraryChange>
    trash(ids: string[]): Promise<LibraryChange>
    restore(ids: string[]): Promise<LibraryChange>
    deleteForever(ids: string[]): Promise<LibraryChange>
    emptyTrash(): Promise<LibraryChange>
    setFavorite(ids: string[], favorite: boolean): Promise<LibraryChange>
    setCover(id: string, cover: string): Promise<LibraryChange>
    readDoc(id: string): Promise<QuillDoc>
    saveDoc(doc: QuillDoc): Promise<LibraryChange>
    exportQuill(id: string): Promise<ExportResult>
    showInFolder(id: string): void
    pickImport(parentId: string | null, mode: 'files' | 'images'): Promise<ImportResult>
    importPaths(paths: string[], parentId: string | null): Promise<ImportResult>
    importFolder(parentId: string | null, hint?: string): Promise<ImportResult>
  }
  /** Resolve an OS drag-and-drop File to a filesystem path. */
  pathForFile(file: File): string
  claude: {
    status(): Promise<ClaudeStatus>
  }
  doc: {
    /** Store bytes in the document's assets/ folder; returns the (possibly de-duplicated) file name. */
    writeAsset(docId: string, name: string, data: Uint8Array): Promise<string>
    pickImages(docId: string): Promise<AddedAsset[]>
    addImageFromPath(docId: string, path: string): Promise<AddedAsset | null>
    pickPdf(docId: string): Promise<AddedPdf | null>
  }
  export: {
    pdf(payload: ExportPayload): Promise<ExportResult>
    print(payload: ExportPayload): Promise<ExportResult>
    images(title: string, files: { name: string; data: Uint8Array }[]): Promise<ExportResult>
    markdown(title: string, text: string): Promise<ExportResult>
    showFile(path: string): void
  }
  ai: {
    status(): Promise<ClaudeStatus>
    ask(req: AiRequest): Promise<void>
    cancel(id: string): void
    onEvent(cb: (e: AiEvent) => void): () => void
  }
  elements: {
    get(): Promise<ElementCollection[]>
    set(cols: ElementCollection[]): Promise<void>
  }
  app: {
    version: string
    openExternal(url: string): void
    /** Main asks the renderer to flush unsaved work before the window closes. */
    onBeforeClose(cb: () => Promise<void>): void
  }
}

declare global {
  interface Window {
    quill: QuillApi
  }
}

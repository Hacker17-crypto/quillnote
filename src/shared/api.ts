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
    exportPdf(id: string): Promise<ExportResult>
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
  app: {
    version: string
    openExternal(url: string): void
  }
}

declare global {
  interface Window {
    quill: QuillApi
  }
}

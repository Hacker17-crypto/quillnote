/**
 * IPC surface. Channel names mirror QuillApi (src/shared/api.ts); each handler is a thin
 * wrapper over storage / importer / exporter. Later milestones register `ai:*`, `audio:*`, `pdf:*` here.
 */
import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { askAi, cancelAi } from './ai/bridge'
import { addImageFromPath, pickImages, pickPdf, writeAsset } from './assets'
import { claudeStatus } from './claude'
import { loadElements, saveElements } from './elements'
import { exportImages, exportMarkdown, exportPdf, exportQuill, printDoc, showFile } from './exporter'
import { IMAGE_FILTERS, IMPORT_FILTERS, Importer, syncFolderHint } from './importer'
import { loadSettings, updateSettings } from './settings'
import { LibraryStorage } from './storage'
import type { AiRequest, ElementCollection, ExportPayload } from '@shared/api'
import type { ImportResult, NewDocOptions, QuillDoc, Settings } from '@shared/types'

export interface MainContext {
  storage: LibraryStorage
  importer: Importer
  window: () => BrowserWindow | null
}

export function createContext(storage: LibraryStorage, window: () => BrowserWindow | null): MainContext {
  return { storage, importer: new Importer(storage), window }
}

export function registerIpc(ctx: MainContext): void {
  const h = ipcMain.handle.bind(ipcMain)
  const items = () => ({ items: ctx.storage.items })

  // ── window ──
  ipcMain.on('win:minimize', () => ctx.window()?.minimize())
  ipcMain.on('win:toggleMaximize', () => {
    const w = ctx.window()
    if (w) w.isMaximized() ? w.unmaximize() : w.maximize()
  })
  ipcMain.on('win:close', () => ctx.window()?.close())
  h('win:isMaximized', () => ctx.window()?.isMaximized() ?? false)

  // ── settings ──
  h('settings:get', () => loadSettings())
  h('settings:set', (_e, patch: Partial<Settings>) => updateSettings(patch))
  h('settings:pickLibraryFolder', async () => {
    const parent = ctx.window()
    const opts = { title: 'Choose library location', properties: ['openDirectory', 'createDirectory'] as ('openDirectory' | 'createDirectory')[] }
    const pick = parent ? await dialog.showOpenDialog(parent, opts) : await dialog.showOpenDialog(opts)
    if (pick.canceled || !pick.filePaths[0]) return null
    const next = await updateSettings({ libraryRoot: pick.filePaths[0] })
    ctx.storage = new LibraryStorage(next.libraryRoot)
    await ctx.storage.init()
    ctx.importer = new Importer(ctx.storage)
    return next
  })

  // ── library ──
  h('library:list', () => ctx.storage.items)
  h('library:createDoc', async (_e, opts: NewDocOptions) => ctx.storage.createDoc(opts))
  h('library:createFolder', (_e, title: string, parentId: string | null) => ctx.storage.createFolder(title, parentId))
  h('library:rename', async (_e, id: string, title: string) => ({ items: await ctx.storage.rename(id, title) }))
  h('library:duplicate', (_e, ids: string[]) => ctx.storage.duplicate(ids))
  h('library:move', async (_e, ids: string[], parentId: string | null) => ({ items: await ctx.storage.move(ids, parentId) }))
  h('library:trash', async (_e, ids: string[]) => ({ items: await ctx.storage.trash(ids) }))
  h('library:restore', async (_e, ids: string[]) => ({ items: await ctx.storage.restore(ids) }))
  h('library:deleteForever', async (_e, ids: string[]) => ({ items: await ctx.storage.deleteForever(ids) }))
  h('library:emptyTrash', async () => ({ items: await ctx.storage.emptyTrash() }))
  h('library:setFavorite', async (_e, ids: string[], fav: boolean) => ({ items: await ctx.storage.setFavorite(ids, fav) }))
  h('library:setCover', async (_e, id: string, cover: string) => ({ items: await ctx.storage.setCover(id, cover) }))
  h('library:readDoc', (_e, id: string) => ctx.storage.readDoc(id))
  h('library:saveDoc', async (_e, doc: QuillDoc) => ({ items: await ctx.storage.saveDoc(doc) }))
  h('library:exportQuill', (_e, id: string) => exportQuill(ctx.storage, id, ctx.window()))
  ipcMain.on('library:showInFolder', (_e, id: string) => {
    const it = ctx.storage.items.find((i) => i.id === id)
    if (it && it.type !== 'folder') shell.showItemInFolder(ctx.storage.docFile(id))
  })
  h('library:pickImport', async (_e, parentId: string | null, mode: 'files' | 'images'): Promise<ImportResult> => {
    const parent = ctx.window()
    const opts = {
      title: mode === 'images' ? 'Choose an image' : 'Import',
      properties: ['openFile', 'multiSelections'] as ('openFile' | 'multiSelections')[],
      filters: mode === 'images' ? IMAGE_FILTERS : IMPORT_FILTERS
    }
    const pick = parent ? await dialog.showOpenDialog(parent, opts) : await dialog.showOpenDialog(opts)
    if (pick.canceled || !pick.filePaths.length) return { ...items(), imported: [], skipped: [] }
    return ctx.importer.importPaths(pick.filePaths, parentId)
  })
  h('library:importPaths', (_e, paths: string[], parentId: string | null) => ctx.importer.importPaths(paths, parentId))
  h('library:importFolder', async (_e, parentId: string | null, hint?: string): Promise<ImportResult> => {
    const parent = ctx.window()
    const opts = {
      title: 'Open from folder',
      defaultPath: syncFolderHint(hint),
      properties: ['openDirectory'] as 'openDirectory'[]
    }
    const pick = parent ? await dialog.showOpenDialog(parent, opts) : await dialog.showOpenDialog(opts)
    if (pick.canceled || !pick.filePaths[0]) return { ...items(), imported: [], skipped: [] }
    return ctx.importer.importDirectory(pick.filePaths[0], parentId)
  })

  // ── document assets ──
  h('doc:writeAsset', (_e, id: string, name: string, data: Uint8Array) => writeAsset(ctx.storage, id, name, data))
  h('doc:pickImages', (_e, id: string) => pickImages(ctx.storage, id, ctx.window()))
  h('doc:addImageFromPath', (_e, id: string, path: string) => addImageFromPath(ctx.storage, id, path))
  h('doc:pickPdf', (_e, id: string) => pickPdf(ctx.storage, id, ctx.window()))

  // ── export ──
  h('export:pdf', (_e, payload: ExportPayload) => exportPdf(ctx.storage, payload, ctx.window()))
  h('export:print', (_e, payload: ExportPayload) => printDoc(ctx.storage, payload))
  h('export:images', (_e, title: string, files: { name: string; data: Uint8Array }[]) => exportImages(title, files, ctx.window()))
  h('export:markdown', (_e, title: string, text: string) => exportMarkdown(title, text, ctx.window()))
  ipcMain.on('export:showFile', (_e, path: string) => showFile(path))

  // ── AI (local Claude Code) ──
  h('ai:ask', (e, req: AiRequest) => {
    void askAi(req, e.sender)
  })
  ipcMain.on('ai:cancel', (_e, id: string) => cancelAi(id))

  // ── elements library ──
  h('elements:get', () => loadElements())
  h('elements:set', (_e, cols: ElementCollection[]) => saveElements(cols))

  // ── integrations ──
  h('claude:status', async () => claudeStatus((await loadSettings()).claudePath))
  ipcMain.on('app:openExternal', (_e, url: string) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
  })
}

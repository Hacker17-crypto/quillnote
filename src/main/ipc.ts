/**
 * IPC surface. Channel names mirror QuillApi (src/shared/api.ts); each handler is a thin
 * wrapper over storage / importer / exporter. Later milestones register `ai:*`, `audio:*`, `pdf:*` here.
 */
import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import { askAi, cancelAi } from './ai/bridge'
import { addImageFromPath, pickImages, pickPdf, writeAsset } from './assets'
import { claudeStatus } from './claude'
import { loadElements, saveElements } from './elements'
import { exportImages, exportMarkdown, exportPdf, exportQuill, printDoc, quillBundle, showFile } from './exporter'
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

const backupTimers = new Map<string, NodeJS.Timeout>()

/** Write a .quill copy to the backup folder a little while after the last edit. */
function scheduleBackup(storage: LibraryStorage, id: string): void {
  clearTimeout(backupTimers.get(id))
  backupTimers.set(
    id,
    setTimeout(async () => {
      backupTimers.delete(id)
      const dir = (await loadSettings()).backupFolder
      if (!dir) return
      try {
        const item = storage.items.find((i) => i.id === id)
        if (!item || item.trashedAt !== null) return
        const name = `${item.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'Untitled'} (${id.slice(0, 8)}).quill`
        await fs.mkdir(dir, { recursive: true })
        await fs.writeFile(join(dir, name), await quillBundle(storage, id))
      } catch {
        /* backup folder unavailable; try again on the next save */
      }
    }, 30_000)
  )
}

export interface ContentHit {
  id: string
  page: number
  snippet: string
}

const stripHtml = (h: string): string =>
  h.replace(/<br\s*\/?>|<\/(p|div|li|h\d)>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim()

/** Find text inside documents: typed text, sticky notes, recognised handwriting, text documents. */
async function searchContent(storage: LibraryStorage, query: string): Promise<ContentHit[]> {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const hits: ContentHit[] = []
  const snippet = (t: string): string => {
    const i = t.toLowerCase().indexOf(q)
    const s = Math.max(0, i - 40)
    return (s ? '…' : '') + t.slice(s, i + q.length + 60) + (i + q.length + 60 < t.length ? '…' : '')
  }
  for (const it of storage.items) {
    if (it.type === 'folder' || it.trashedAt !== null || hits.length >= 80) continue
    let doc: QuillDoc
    try {
      doc = await storage.readDoc(it.id)
    } catch {
      continue
    }
    if (doc.kind === 'text') {
      const t = stripHtml(doc.text?.html ?? '')
      if (t.toLowerCase().includes(q)) hits.push({ id: it.id, page: 0, snippet: snippet(t) })
      continue
    }
    doc.pages.forEach((p, i) => {
      const texts = [
        ...p.objects.map((o) => (o.type === 'text' ? stripHtml(o.html) : o.type === 'sticky' ? o.text : '')),
        p.ocrText ?? ''
      ]
      const t = texts.find((x) => x && x.toLowerCase().includes(q))
      if (t) hits.push({ id: it.id, page: i, snippet: snippet(t) })
    })
  }
  return hits
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
  h('settings:pickFolder', async (_e, title: string) => {
    const parent = ctx.window()
    const opts = { title, properties: ['openDirectory', 'createDirectory'] as ('openDirectory' | 'createDirectory')[] }
    const pick = parent ? await dialog.showOpenDialog(parent, opts) : await dialog.showOpenDialog(opts)
    return pick.canceled ? null : (pick.filePaths[0] ?? null)
  })
  h('settings:pickFile', async (_e, title: string) => {
    const parent = ctx.window()
    const opts = { title, properties: ['openFile'] as 'openFile'[] }
    const pick = parent ? await dialog.showOpenDialog(parent, opts) : await dialog.showOpenDialog(opts)
    return pick.canceled ? null : (pick.filePaths[0] ?? null)
  })
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
  h('library:saveDoc', async (_e, doc: QuillDoc) => {
    const items = await ctx.storage.saveDoc(doc)
    scheduleBackup(ctx.storage, doc.id)
    return { items }
  })
  h('library:searchContent', (_e, query: string) => searchContent(ctx.storage, query))
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

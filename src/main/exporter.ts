/** Export documents as PDF (Chromium printToPDF over generated page markup) or .quill zip. */
import { BrowserWindow, dialog, type SaveDialogOptions } from 'electron'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import { extname, join } from 'path'
import { strToU8, zipSync } from 'fflate'
import { uid } from '@shared/docs'
import { paperSvg, whiteboardSvg } from '@shared/paper'
import type { ExportResult } from '@shared/api'
import type { PageData, QuillDoc } from '@shared/types'
import type { LibraryStorage } from './storage'

const safeName = (s: string): string => s.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'Untitled'

function saveDialog(parent: BrowserWindow | null, opts: SaveDialogOptions) {
  return parent ? dialog.showSaveDialog(parent, opts) : dialog.showSaveDialog(opts)
}

export async function exportQuill(storage: LibraryStorage, id: string, parent: BrowserWindow | null): Promise<ExportResult> {
  const doc = await storage.readDoc(id)
  const pick = await saveDialog(parent, {
    title: 'Export as Quillnote file',
    defaultPath: `${safeName(doc.title)}.quill`,
    filters: [{ name: 'Quillnote file', extensions: ['quill'] }]
  })
  if (pick.canceled || !pick.filePath) return { ok: false }
  const files: Record<string, Uint8Array> = {
    'manifest.json': strToU8(JSON.stringify({ format: 'quillnote', version: 1, id: doc.id, title: doc.title, kind: doc.kind, exportedAt: Date.now() })),
    'doc.json': strToU8(JSON.stringify(doc))
  }
  const dir = storage.assetsDir(id)
  try {
    for (const name of await fs.readdir(dir)) files[`assets/${name}`] = new Uint8Array(await fs.readFile(join(dir, name)))
  } catch {
    /* no assets */
  }
  await fs.writeFile(pick.filePath, zipSync(files, { level: 4 }))
  return { ok: true, path: pick.filePath }
}

export async function exportPdf(storage: LibraryStorage, id: string, parent: BrowserWindow | null): Promise<ExportResult> {
  const doc = await storage.readDoc(id)
  const pick = await saveDialog(parent, {
    title: 'Export as PDF',
    defaultPath: `${safeName(doc.title)}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })
  if (pick.canceled || !pick.filePath) return { ok: false }

  if (doc.kind === 'pdf') {
    // Annotation flattening arrives with the ink engine; until then the source PDF is exported as-is.
    await fs.copyFile(join(storage.assetsDir(id), 'source.pdf'), pick.filePath)
    return { ok: true, path: pick.filePath }
  }

  const html = await buildHtml(storage, doc)
  const tmp = join(tmpdir(), `quillnote-export-${uid()}.html`)
  await fs.writeFile(tmp, html, 'utf8')
  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true } })
  try {
    await win.loadFile(tmp)
    await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)')
    const pdf = await win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true })
    await fs.writeFile(pick.filePath, pdf)
    return { ok: true, path: pick.filePath }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  } finally {
    win.destroy()
    fs.rm(tmp, { force: true }).catch(() => undefined)
  }
}

async function fontFace(): Promise<string> {
  try {
    const path = require.resolve('@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2')
    const b64 = (await fs.readFile(path)).toString('base64')
    return `@font-face{font-family:Figtree;font-weight:100 900;src:url(data:font/woff2;base64,${b64}) format('woff2')}`
  } catch {
    return ''
  }
}

async function pageMarkup(storage: LibraryStorage, doc: QuillDoc, page: PageData): Promise<string> {
  if (page.background?.type === 'image' && page.background.asset) {
    const file = join(storage.assetsDir(doc.id), page.background.asset)
    const ext = extname(file).slice(1).toLowerCase().replace('jpg', 'jpeg').replace('svg', 'svg+xml')
    const b64 = (await fs.readFile(file)).toString('base64')
    return `<img src="data:image/${ext};base64,${b64}" style="width:${page.width}pt;height:${page.height}pt;display:block"/>`
  }
  if (page.infinite) return whiteboardSvg(1200, 900, page.paper.color)
  if (doc.kind === 'text') {
    const body = doc.text?.html ?? ''
    return `<div style="box-sizing:border-box;width:${page.width}pt;height:${page.height}pt;padding:56pt;font:12pt/1.5 Figtree,'Segoe UI',sans-serif;color:#111;background:#fff">${body}</div>`
  }
  return paperSvg(page.paper, { fixedPt: true })
}

async function buildHtml(storage: LibraryStorage, doc: QuillDoc): Promise<string> {
  const sizes = new Map<string, string>()
  const blocks: string[] = []
  for (const page of doc.pages) {
    const w = page.infinite ? 1200 : page.width
    const h = page.infinite ? 900 : page.height
    const key = `${Math.round(w)}x${Math.round(h)}`
    if (!sizes.has(key)) sizes.set(key, `s${sizes.size}`)
    blocks.push(`<section class="${sizes.get(key)}" style="width:${w}pt;height:${h}pt">${await pageMarkup(storage, doc, page)}</section>`)
  }
  const pageRules = [...sizes.entries()]
    .map(([key, name]) => {
      const [w, h] = key.split('x')
      return `@page ${name}{size:${w}pt ${h}pt;margin:0}.${name}{page:${name}}`
    })
    .join('')
  return `<!doctype html><html><head><meta charset="utf-8"><style>${await fontFace()}
html,body{margin:0;padding:0;background:#fff}section{break-after:page;overflow:hidden}section:last-child{break-after:auto}svg{display:block}${pageRules}</style></head><body>${blocks.join('')}</body></html>`
}

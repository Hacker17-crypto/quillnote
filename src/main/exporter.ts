/**
 * Export: .quill bundles, and PDF / print / PNG / Markdown from pages the renderer prepared.
 * PDF pipeline: page backgrounds + annotation SVGs → HTML → Chromium printToPDF; pages backed by
 * an imported PDF keep the original vector page and get the annotation layer stamped on top (pdf-lib).
 */
import { BrowserWindow, dialog, shell, type SaveDialogOptions } from 'electron'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import { extname, join } from 'path'
import { degrees, PDFDocument } from 'pdf-lib'
import { strToU8, zipSync } from 'fflate'
import { uid } from '@shared/docs'
import type { ExportPayload, ExportResult } from '@shared/api'
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
  await fs.writeFile(pick.filePath, await quillBundle(storage, id))
  return { ok: true, path: pick.filePath }
}

/** Zip of doc.json + assets/ (also used for automatic backups). */
export async function quillBundle(storage: LibraryStorage, id: string): Promise<Uint8Array> {
  const doc = await storage.readDoc(id)
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
  return zipSync(files, { level: 4 })
}

// ───────────────────────── PDF / print ─────────────────────────
export async function exportPdf(storage: LibraryStorage, payload: ExportPayload, parent: BrowserWindow | null): Promise<ExportResult> {
  const pick = await saveDialog(parent, {
    title: 'Export as PDF',
    defaultPath: `${safeName(payload.title)}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })
  if (pick.canceled || !pick.filePath) return { ok: false }
  try {
    const bytes = await renderPdf(storage, payload)
    await fs.writeFile(pick.filePath, bytes)
    return { ok: true, path: pick.filePath }
  } catch (e) {
    return { ok: false, error: `Export failed: ${(e as Error).message}` }
  }
}

export async function printDoc(storage: LibraryStorage, payload: ExportPayload): Promise<ExportResult> {
  const html = await buildHtml(storage, payload, true)
  return withPage(html, async (win) => {
    const ok = await new Promise<boolean>((resolve) =>
      win.webContents.print({ silent: false, printBackground: true }, (success, reason) => resolve(success || reason === 'cancelled'))
    )
    return ok ? { ok: true } : { ok: false, error: 'Printing failed' }
  })
}

async function renderPdf(storage: LibraryStorage, payload: ExportPayload): Promise<Uint8Array> {
  const html = await buildHtml(storage, payload, false)
  const printed = await withPage(html, async (win) =>
    new Uint8Array(await win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true }))
  )
  const pdfPages = payload.pages.filter((p) => p.bg.type === 'pdf')
  if (!pdfPages.length || payload.flow) return printed

  const rendered = await PDFDocument.load(printed)
  const out = await PDFDocument.create()
  out.setTitle(payload.title)
  out.setCreator('Quillnote')
  const sources = new Map<string, PDFDocument>()
  for (let i = 0; i < payload.pages.length; i++) {
    const page = payload.pages[i]
    if (page.bg.type === 'pdf') {
      let src = sources.get(page.bg.asset)
      if (!src) {
        src = await PDFDocument.load(await fs.readFile(join(storage.assetsDir(payload.docId), page.bg.asset)), { ignoreEncryption: true })
        sources.set(page.bg.asset, src)
      }
      const [copied] = await out.copyPages(src, [page.bg.page])
      out.addPage(copied)
      const overlay = await out.embedPage(rendered.getPage(i))
      const { width, height } = copied.getSize()
      const angle = copied.getRotation().angle % 360
      // Stamp the annotation layer in the page's displayed orientation.
      if (angle === 90) copied.drawPage(overlay, { x: width, y: 0, width: height, height: width, rotate: degrees(90) })
      else if (angle === 180) copied.drawPage(overlay, { x: width, y: height, width, height, rotate: degrees(180) })
      else if (angle === 270) copied.drawPage(overlay, { x: 0, y: height, width: height, height: width, rotate: degrees(270) })
      else copied.drawPage(overlay, { x: 0, y: 0, width, height })
    } else {
      const [copied] = await out.copyPages(rendered, [i])
      out.addPage(copied)
    }
  }
  return out.save()
}

/** Load HTML into a hidden window, wait for fonts and images, run `fn`, then clean up. */
async function withPage<T>(html: string, fn: (win: BrowserWindow) => Promise<T>): Promise<T> {
  const tmp = join(tmpdir(), `quillnote-export-${uid()}.html`)
  await fs.writeFile(tmp, html, 'utf8')
  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } })
  try {
    await win.loadFile(tmp)
    await win.webContents.executeJavaScript(
      `document.fonts.ready.then(() => Promise.all([...document.querySelectorAll('img')].map((i) => i.decode().catch(() => 0)))).then(() => new Promise((r) => setTimeout(r, 150)))`
    )
    return await fn(win)
  } finally {
    win.destroy()
    fs.rm(tmp, { force: true }).catch(() => undefined)
  }
}

const MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml'
}

async function dataUri(file: string): Promise<string> {
  const ext = extname(file).slice(1).toLowerCase()
  const b64 = (await fs.readFile(file)).toString('base64')
  return `data:${MIME[ext] ?? 'application/octet-stream'};base64,${b64}`
}

/** Replace quill-asset://<doc>/<file> references with inline data URIs. */
async function inlineAssets(storage: LibraryStorage, markup: string): Promise<string> {
  const refs = new Set(markup.match(/quill-asset:\/\/[A-Za-z0-9_-]+\/[^"'\s)]+/g) ?? [])
  for (const ref of refs) {
    const m = /^quill-asset:\/\/([A-Za-z0-9_-]+)\/(.+)$/.exec(ref)
    if (!m) continue
    try {
      const name = decodeURIComponent(m[2]).replace(/[\\/]/g, '')
      markup = markup.split(ref).join(await dataUri(join(storage.assetsDir(m[1]), name)))
    } catch {
      /* missing asset: leave the reference, it renders empty */
    }
  }
  return markup
}

async function fontFaces(): Promise<string> {
  const faces: [string, string, string][] = [
    ['Figtree', '100 900', '@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2'],
    ['Figtree', '100 900', '@fontsource-variable/figtree/files/figtree-latin-ext-wght-normal.woff2'],
    ['Caveat', '400', '@fontsource/caveat/files/caveat-latin-400-normal.woff2'],
    ['Caveat', '700', '@fontsource/caveat/files/caveat-latin-700-normal.woff2']
  ]
  let css = ''
  for (const [family, weight, mod] of faces) {
    try {
      const b64 = (await fs.readFile(require.resolve(mod))).toString('base64')
      css += `@font-face{font-family:'${family}';font-weight:${weight};src:url(data:font/woff2;base64,${b64}) format('woff2')}`
    } catch {
      /* font not bundled: system fallback */
    }
  }
  // Aliases so markup written for the app's font stack resolves in the export window too.
  return css + `@font-face{font-family:'Figtree Variable';src:local('Figtree')}`
}

async function buildHtml(storage: LibraryStorage, payload: ExportPayload, forPrint: boolean): Promise<string> {
  // Transparent page background so annotation layers can be stamped over original PDF pages.
  const base = `html,body{margin:0;padding:0;background:transparent}*{box-sizing:border-box}svg{display:block}
.qn-text{font-family:Figtree,'Segoe UI',sans-serif}`
  if (payload.flow !== undefined) {
    const body = await inlineAssets(storage, payload.flow)
    return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(payload.title)}</title><style>${await fontFaces()}${base}
@page{size:A4;margin:56pt}html,body{background:#fff}body{font:12pt/1.55 Figtree,'Segoe UI',sans-serif;color:#111}
img{max-width:100%}h1{font-size:24pt}h2{font-size:18pt}h3{font-size:14pt}blockquote{border-left:3pt solid #ccc;margin-left:0;padding-left:12pt;color:#444}
ul.qn-check{list-style:none;padding-left:4pt}pre,code{font-family:Consolas,Menlo,monospace}</style></head><body>${body}</body></html>`
  }
  const sizes = new Map<string, string>()
  const blocks: string[] = []
  for (const page of payload.pages) {
    const w = Math.round(page.width * 100) / 100
    const h = Math.round(page.height * 100) / 100
    const key = `${w}x${h}`
    if (!sizes.has(key)) sizes.set(key, `s${sizes.size}`)
    let bg = ''
    switch (page.bg.type) {
      case 'svg':
        bg = page.bg.svg.replace('<svg ', `<svg style="position:absolute;inset:0;width:100%;height:100%" preserveAspectRatio="none" `)
        break
      case 'image': {
        const src = await dataUri(join(storage.assetsDir(payload.docId), page.bg.asset.replace(/[\\/]/g, '')))
        bg = `<img src="${src}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:fill"/>`
        break
      }
      case 'png':
        bg = `<img src="${page.bg.dataUrl}" style="position:absolute;inset:0;width:100%;height:100%"/>`
        break
      case 'none':
        bg = page.bg.color ? `<div style="position:absolute;inset:0;background:${page.bg.color}"></div>` : ''
        break
      case 'pdf':
        // Printing needs a raster of the PDF page (the renderer sends 'png' for print); for export the
        // original page is merged in afterwards, so leave this layer transparent.
        bg = forPrint ? '<div style="position:absolute;inset:0;background:#fff"></div>' : ''
        break
    }
    const overlay = (await inlineAssets(storage, page.overlay)).replace('<svg ', '<svg style="position:absolute;inset:0;width:100%;height:100%" ')
    blocks.push(`<section class="${sizes.get(key)}" style="width:${w}pt;height:${h}pt">${bg}${overlay}</section>`)
  }
  const pageRules = [...sizes.entries()]
    .map(([key, name]) => {
      const [w, h] = key.split('x')
      return `@page ${name}{size:${w}pt ${h}pt;margin:0}.${name}{page:${name}}`
    })
    .join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(payload.title)}</title><style>${await fontFaces()}${base}
section{position:relative;break-after:page;overflow:hidden}section:last-child{break-after:auto}${pageRules}</style></head><body>${blocks.join('')}</body></html>`
}

const escapeHtml = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)

// ───────────────────────── PNG / Markdown ─────────────────────────
export async function exportImages(title: string, files: { name: string; data: Uint8Array }[], parent: BrowserWindow | null): Promise<ExportResult> {
  if (files.length === 1) {
    const pick = await saveDialog(parent, { title: 'Export as image', defaultPath: `${safeName(title)}.png`, filters: [{ name: 'PNG image', extensions: ['png'] }] })
    if (pick.canceled || !pick.filePath) return { ok: false }
    await fs.writeFile(pick.filePath, files[0].data)
    return { ok: true, path: pick.filePath }
  }
  const opts = { title: 'Choose a folder for the page images', properties: ['openDirectory', 'createDirectory'] as ('openDirectory' | 'createDirectory')[] }
  const pick = parent ? await dialog.showOpenDialog(parent, opts) : await dialog.showOpenDialog(opts)
  if (pick.canceled || !pick.filePaths[0]) return { ok: false }
  const dir = join(pick.filePaths[0], safeName(title))
  await fs.mkdir(dir, { recursive: true })
  for (const f of files) await fs.writeFile(join(dir, safeName(f.name)), f.data)
  return { ok: true, path: join(dir, safeName(files[0].name)) }
}

export async function exportMarkdown(title: string, text: string, parent: BrowserWindow | null): Promise<ExportResult> {
  const pick = await saveDialog(parent, { title: 'Export as Markdown', defaultPath: `${safeName(title)}.md`, filters: [{ name: 'Markdown', extensions: ['md'] }] })
  if (pick.canceled || !pick.filePath) return { ok: false }
  await fs.writeFile(pick.filePath, text, 'utf8')
  return { ok: true, path: pick.filePath }
}

export function showFile(path: string): void {
  shell.showItemInFolder(path)
}

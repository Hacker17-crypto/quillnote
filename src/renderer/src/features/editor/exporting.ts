/**
 * Build export payloads from a document: page backgrounds + annotation SVGs for PDF / print,
 * rasterised PNGs, and Markdown. Works on any document, open in the editor or not.
 */
import { paperSvg } from '@shared/paper'
import type { ExportPage, ExportPayload } from '@shared/api'
import type { PageData, QuillDoc } from '@shared/types'
import { session, useEditor } from '../../stores/editor'
import { useUi } from '../../stores/ui'
import { unionBounds, type Rect } from './geometry'
import { htmlText, htmlToMd } from './markdown'
import { pdfPagePng, pdfText } from './pdf'
import { assetUrl, overlaySvg, setRootAttrs, svgDataUrl } from './render'

export interface ExportOptions {
  /** Page indices to include (default: all). */
  pages?: number[]
  /** Include paper templates / page backgrounds (default true). */
  backgrounds?: boolean
}

/** The latest content: the open editor session if any (after saving), else the file on disk. */
export async function loadDoc(docId: string): Promise<QuillDoc> {
  const s = session(docId)
  if (s) {
    await useEditor.getState().saveNow(docId)
    return s.doc
  }
  return window.quill.library.readDoc(docId)
}

/** Region of a page to export (whiteboards: the content bounds). */
export function pageRegion(page: PageData): Rect {
  if (!page.infinite) return { x: 0, y: 0, w: page.width, h: page.height }
  const b = unionBounds(page.objects)
  if (!b) return { x: 0, y: 0, w: 842, h: 595 }
  const m = 40
  return { x: Math.floor(b.x - m), y: Math.floor(b.y - m), w: Math.ceil(Math.max(b.w + m * 2, 400)), h: Math.ceil(Math.max(b.h + m * 2, 300)) }
}

function dotsSvg(r: Rect): string {
  const x0 = Math.ceil((r.x - 12) / 24) * 24 + 12
  const y0 = Math.ceil((r.y - 12) / 24) * 24 + 12
  let d = ''
  for (let y = y0; y < r.y + r.h; y += 24) for (let x = x0; x < r.x + r.w; x += 24) d += `M${x} ${y}h.01`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r.x} ${r.y} ${r.w} ${r.h}"><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="#fff"/><path d="${d}" stroke="#C3C8D2" stroke-width="2.3" stroke-linecap="round"/></svg>`
}

export async function buildPayload(doc: QuillDoc, opts: ExportOptions = {}, forPrint = false): Promise<ExportPayload> {
  const idx = opts.pages ?? doc.pages.map((_, i) => i)
  const bgOn = opts.backgrounds !== false
  if (doc.kind === 'text') return { docId: doc.id, title: doc.title, pages: [], flow: `<h1>${escapeHtml(doc.title)}</h1>${doc.text?.html ?? ''}` }
  const pages: ExportPage[] = []
  for (const i of idx) {
    const page = doc.pages[i]
    if (!page) continue
    const r = pageRegion(page)
    let bg: ExportPage['bg']
    if (page.background?.type === 'pdf') {
      if (forPrint) {
        const c = await pdfPagePng(doc.id, page.background.asset, page.background.pdfPage ?? 0, Math.round(page.width * 2.5))
        bg = { type: 'png', dataUrl: c.toDataURL('image/png') }
      } else bg = { type: 'pdf', asset: page.background.asset ?? 'source.pdf', page: page.background.pdfPage ?? 0 }
    } else if (page.background?.type === 'image' && page.background.asset) bg = { type: 'image', asset: page.background.asset }
    else if (!bgOn) bg = { type: 'none', color: '#fff' }
    else if (page.infinite) bg = { type: 'svg', svg: dotsSvg(r) }
    else bg = { type: 'svg', svg: paperSvg(page.paper) }
    pages.push({ width: r.w, height: r.h, bg, overlay: overlaySvg(page, doc.id, r) })
  }
  return { docId: doc.id, title: doc.title, pages }
}

const escapeHtml = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)

function report(res: { ok: boolean; path?: string; error?: string }, what: string): void {
  const ui = useUi.getState()
  if (res.ok && res.path) ui.toast(`Exported ${what}`, { label: 'Show', run: () => window.quill.export.showFile(res.path as string) })
  else if (res.ok) ui.toast(`Exported ${what}`)
  else if (res.error) ui.toast(res.error)
}

export async function exportPdf(docId: string, opts: ExportOptions = {}): Promise<void> {
  const doc = await loadDoc(docId)
  report(await window.quill.export.pdf(await buildPayload(doc, opts)), 'PDF')
}

export async function printDoc(docId: string, opts: ExportOptions = {}): Promise<void> {
  const doc = await loadDoc(docId)
  const res = await window.quill.export.print(await buildPayload(doc, opts, true))
  if (!res.ok && res.error) useUi.getState().toast(res.error)
}

export async function exportQuill(docId: string): Promise<void> {
  await loadDoc(docId)
  report(await window.quill.library.exportQuill(docId), 'Quillnote file')
}

// ───────────────────────── raster ─────────────────────────
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image failed to load'))
    img.src = src
  })
}

async function toDataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob()
  return new Promise((resolve) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.readAsDataURL(blob)
  })
}

/** Render a page (or a region of it) to a canvas `pxWidth` pixels wide. */
export async function rasterPage(doc: QuillDoc, page: PageData, pxWidth: number, region?: Rect, opts: { background?: boolean } = {}): Promise<HTMLCanvasElement> {
  const r = region ?? pageRegion(page)
  const k = pxWidth / r.w
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(r.w * k))
  c.height = Math.max(1, Math.round(r.h * k))
  const ctx = c.getContext('2d') as CanvasRenderingContext2D
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, c.width, c.height)
  const full = { x: 0, y: 0, w: page.width, h: page.height }
  // draws an image that covers the whole page into the region-relative canvas
  const drawFull = (img: CanvasImageSource): void => ctx.drawImage(img, (full.x - r.x) * k, (full.y - r.y) * k, full.w * k, full.h * k)
  if (opts.background !== false) {
    try {
      if (page.background?.type === 'pdf') drawFull(await pdfPagePng(doc.id, page.background.asset, page.background.pdfPage ?? 0, Math.round(page.width * k)))
      else if (page.background?.type === 'image' && page.background.asset) drawFull(await loadImage(assetUrl(doc.id, page.background.asset)))
      else if (page.infinite) ctx.drawImage(await loadImage(svgDataUrl(dotsSvg(r))), 0, 0, c.width, c.height)
      else drawFull(await loadImage(svgDataUrl(setRootAttrs(paperSvg(page.paper), { width: String(Math.round(page.width * k)), height: String(Math.round(page.height * k)), preserveAspectRatio: 'none' }))))
    } catch {
      /* background unavailable: keep white */
    }
  }
  const hrefs = new Map<string, string>()
  for (const o of page.objects) if (o.type === 'image' && !hrefs.has(o.asset)) hrefs.set(o.asset, await toDataUrl(assetUrl(doc.id, o.asset)).catch(() => ''))
  const svg = setRootAttrs(overlaySvg(page, doc.id, r, { hrefs }), { width: String(c.width), height: String(c.height) })
  try {
    ctx.drawImage(await loadImage(svgDataUrl(svg)), 0, 0, c.width, c.height)
  } catch {
    /* overlay failed */
  }
  return c
}

const canvasBytes = (c: HTMLCanvasElement): Promise<Uint8Array> =>
  new Promise((resolve, reject) => c.toBlob((b) => (b ? b.arrayBuffer().then((a) => resolve(new Uint8Array(a))) : reject(new Error('PNG encoding failed'))), 'image/png'))

export async function exportImages(docId: string, opts: ExportOptions = {}): Promise<void> {
  const doc = await loadDoc(docId)
  const idx = opts.pages ?? doc.pages.map((_, i) => i)
  const files: { name: string; data: Uint8Array }[] = []
  for (const i of idx) {
    const page = doc.pages[i]
    if (!page) continue
    const r = pageRegion(page)
    const c = await rasterPage(doc, page, Math.min(4096, Math.round(r.w * 2.5)), r, { background: opts.backgrounds !== false })
    files.push({ name: `${doc.title} - page ${i + 1}.png`, data: await canvasBytes(c) })
  }
  if (!files.length) return
  report(await window.quill.export.images(doc.title, files), files.length === 1 ? 'image' : `${files.length} images`)
}

/** Every bit of text on a page: typed, sticky notes, recognised handwriting and PDF text. */
export async function pageText(doc: QuillDoc, page: PageData, withPdf = true): Promise<string> {
  const parts: string[] = []
  for (const o of page.objects) {
    if (o.type === 'text') parts.push(htmlText(o.html))
    else if (o.type === 'sticky' && o.text.trim()) parts.push(o.text.trim())
  }
  if (page.ocrText?.trim()) parts.push(page.ocrText.trim())
  if (withPdf && page.background?.type === 'pdf') {
    const items = await pdfText(doc.id, page.background.asset, page.background.pdfPage ?? 0).catch(() => [])
    if (items.length) parts.push(items.map((t) => t.str).join(' '))
  }
  return parts.filter(Boolean).join('\n\n')
}

export async function docMarkdown(doc: QuillDoc): Promise<string> {
  if (doc.kind === 'text') return `# ${doc.title}\n\n${htmlToMd(doc.text?.html ?? '')}\n`
  const out = [`# ${doc.title}`]
  for (const [i, page] of doc.pages.entries()) {
    const blocks: string[] = []
    const ordered = page.objects
      .filter((o) => o.type === 'text' || o.type === 'sticky')
      .sort((a, b) => (a as { y: number }).y - (b as { y: number }).y || (a as { x: number }).x - (b as { x: number }).x)
    for (const o of ordered) {
      if (o.type === 'text') blocks.push(htmlToMd(o.html))
      else if (o.type === 'sticky' && o.text.trim()) blocks.push(`> 🗒 ${o.text.trim().replace(/\n/g, '\n> ')}`)
    }
    if (page.ocrText?.trim()) blocks.push(page.ocrText.trim())
    if (page.background?.type === 'pdf') {
      const items = await pdfText(doc.id, page.background.asset, page.background.pdfPage ?? 0).catch(() => [])
      if (items.length) blocks.push(items.map((t) => t.str).join(' '))
    }
    const title = page.outlineTitle ? `## ${page.outlineTitle}` : `## Page ${i + 1}`
    out.push(`${title}\n\n${blocks.filter(Boolean).join('\n\n') || '_(handwriting only — use AI › Recognise handwriting to include it)_'}`)
  }
  return out.join('\n\n') + '\n'
}

export async function exportMarkdown(docId: string): Promise<void> {
  const doc = await loadDoc(docId)
  report(await window.quill.export.markdown(doc.title, await docMarkdown(doc)), 'Markdown')
}

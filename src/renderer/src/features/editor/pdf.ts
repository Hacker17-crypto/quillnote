/** pdf.js loading and page rendering for PDF-backed pages (lazy, cached per document asset). */
import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { assetUrl } from './render'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

const base = import.meta.env.DEV ? '/node_modules/pdfjs-dist/' : './pdfjs/'
const docs = new Map<string, Promise<PDFDocumentProxy>>()

export function loadPdf(docId: string, asset = 'source.pdf'): Promise<PDFDocumentProxy> {
  const key = `${docId}/${asset}`
  let p = docs.get(key)
  if (!p) {
    p = fetch(assetUrl(docId, asset))
      .then((r) => {
        if (!r.ok) throw new Error('PDF file is missing')
        return r.arrayBuffer()
      })
      .then(
        (data) =>
          pdfjs.getDocument({
            data,
            standardFontDataUrl: `${base}standard_fonts/`,
            cMapUrl: `${base}cmaps/`,
            cMapPacked: true,
            wasmUrl: `${base}wasm/`
          }).promise
      )
    p.catch(() => docs.delete(key))
    docs.set(key, p)
  }
  return p
}

export async function getPdfPage(docId: string, asset: string | undefined, index: number): Promise<PDFPageProxy> {
  const pdf = await loadPdf(docId, asset)
  return pdf.getPage(index + 1)
}

/** Render a page into a canvas so it fills `cssWidth` CSS px. Returns a cancel function. */
export function renderPdfPage(
  docId: string,
  asset: string | undefined,
  index: number,
  canvas: HTMLCanvasElement,
  cssWidth: number,
  onDone?: () => void
): () => void {
  let cancelled = false
  let task: { cancel(): void; promise: Promise<void> } | null = null
  void getPdfPage(docId, asset, index)
    .then((page) => {
      if (cancelled) return
      const base = page.getViewport({ scale: 1 })
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      // cap the backing store to keep memory sane at high zoom
      const scale = Math.min((cssWidth / base.width) * dpr, 4096 / base.width)
      const vp = page.getViewport({ scale })
      const off = document.createElement('canvas')
      off.width = Math.ceil(vp.width)
      off.height = Math.ceil(vp.height)
      const ctx = off.getContext('2d')
      if (!ctx) return
      task = page.render({ canvas: off, canvasContext: ctx, viewport: vp })
      return task.promise.then(() => {
        if (cancelled) return
        canvas.width = off.width
        canvas.height = off.height
        canvas.getContext('2d')?.drawImage(off, 0, 0)
        onDone?.()
      })
    })
    .catch(() => undefined)
  return () => {
    cancelled = true
    task?.cancel()
  }
}

export interface PdfTextItem {
  str: string
  x: number
  y: number
  w: number
  h: number
}

const textCache = new Map<string, Promise<PdfTextItem[]>>()

/** Text runs with their rectangles in page units (top-left origin), cached. */
export function pdfText(docId: string, asset: string | undefined, index: number): Promise<PdfTextItem[]> {
  const key = `${docId}/${asset ?? 'source.pdf'}#${index}`
  let p = textCache.get(key)
  if (!p) {
    p = getPdfPage(docId, asset, index).then(async (page) => {
      const vp = page.getViewport({ scale: 1 })
      const content = await page.getTextContent()
      const out: PdfTextItem[] = []
      for (const it of content.items) {
        if (!('str' in it) || !it.str.trim()) continue
        const [a, b, , , e, f] = pdfjs.Util.transform(vp.transform, it.transform)
        const h = Math.hypot(a, b) || it.height
        out.push({ str: it.str, x: e, y: f - h, w: it.width * (vp.scale || 1), h })
      }
      return out
    })
    p.catch(() => textCache.delete(key))
    textCache.set(key, p)
  }
  return p
}

export interface PdfLink {
  rect: { x: number; y: number; w: number; h: number }
  url?: string
  page?: number
}

export async function pdfLinks(docId: string, asset: string | undefined, index: number): Promise<PdfLink[]> {
  const pdf = await loadPdf(docId, asset)
  const page = await pdf.getPage(index + 1)
  const vp = page.getViewport({ scale: 1 })
  const out: PdfLink[] = []
  for (const a of await page.getAnnotations()) {
    if (a.subtype !== 'Link') continue
    const [x1, y1] = vp.convertToViewportPoint(a.rect[0], a.rect[1]) as number[]
    const [x2, y2] = vp.convertToViewportPoint(a.rect[2], a.rect[3]) as number[]
    const rect = { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) }
    if (a.url) out.push({ rect, url: a.url })
    else if (a.dest) {
      try {
        const dest = typeof a.dest === 'string' ? await pdf.getDestination(a.dest) : a.dest
        if (dest?.[0]) out.push({ rect, page: await pdf.getPageIndex(dest[0]) })
      } catch {
        /* unresolvable destination */
      }
    }
  }
  return out
}

/** Render a page to a PNG data URL at a given pixel width (exports, AI, printing). */
export async function pdfPagePng(docId: string, asset: string | undefined, index: number, pxWidth: number): Promise<HTMLCanvasElement> {
  const page = await getPdfPage(docId, asset, index)
  const base = page.getViewport({ scale: 1 })
  const vp = page.getViewport({ scale: pxWidth / base.width })
  const c = document.createElement('canvas')
  c.width = Math.ceil(vp.width)
  c.height = Math.ceil(vp.height)
  const ctx = c.getContext('2d')
  if (!ctx) return c
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, c.width, c.height)
  await page.render({ canvas: c, canvasContext: ctx, viewport: vp }).promise
  return c
}

/** Renderer side of the AI bridge: requests with streaming, page images, handwriting recognition. */
import { uid } from '@shared/docs'
import type { AiRequest, AiImage } from '@shared/api'
import type { PageData, QuillDoc } from '@shared/types'
import { session, useEditor } from '../../stores/editor'
import { useUi } from '../../stores/ui'
import { pageText, rasterPage } from './exporting'
import { unionBounds, type Rect } from './geometry'
import { selectedObjects } from './actions'

const pending = new Map<string, { chunk?: (t: string) => void; resolve: (t: string) => void; reject: (e: Error) => void }>()
let listening = false

function listen(): void {
  if (listening) return
  listening = true
  window.quill.ai.onEvent((e) => {
    const p = pending.get(e.id)
    if (!p) return
    if (e.type === 'chunk') p.chunk?.(e.text)
    else {
      pending.delete(e.id)
      if (e.type === 'done') p.resolve(e.text)
      else p.reject(new Error(e.error))
    }
  })
}

export interface AiCall {
  id: string
  promise: Promise<string>
  cancel: () => void
}

export function ask(req: Omit<AiRequest, 'id'>, onChunk?: (t: string) => void): AiCall {
  listen()
  const id = uid()
  const promise = new Promise<string>((resolve, reject) => {
    pending.set(id, { chunk: onChunk, resolve, reject })
    window.quill.ai.ask({ ...req, id }).catch((e: Error) => {
      pending.delete(id)
      reject(e)
    })
  })
  return {
    id,
    promise,
    cancel: () => {
      const p = pending.get(id)
      pending.delete(id)
      window.quill.ai.cancel(id)
      p?.reject(new Error('cancelled'))
    }
  }
}

const base64 = (c: HTMLCanvasElement): string => c.toDataURL('image/png').split(',')[1]

const hasInk = (p: PageData): boolean => p.objects.some((o) => o.type === 'stroke' || o.type === 'shape')

/** A PNG of a page for Claude to read (ink + backgrounds). */
export async function pageImage(doc: QuillDoc, index: number, background = true): Promise<AiImage> {
  const page = doc.pages[index]
  const c = await rasterPage(doc, page, 1400, undefined, { background })
  return { name: `page-${index + 1}.png`, base64: base64(c) }
}

/** Context for a scope: text from every page, plus images of pages that have handwriting not yet recognised. */
export async function scopeContext(docId: string, scope: 'page' | 'document' | 'selection'): Promise<{ text: string; images: AiImage[]; label: string }> {
  const s = session(docId)
  if (!s) return { text: '', images: [], label: '' }
  const doc = s.doc
  if (doc.kind === 'text') {
    const { htmlText } = await import('./markdown')
    return { text: htmlText(doc.text?.html ?? ''), images: [], label: `the text document "${doc.title}"` }
  }
  if (scope === 'selection') {
    const img = await selectionImage(docId)
    if (img) return { text: '', images: [img.image], label: 'a selection the user made on the page' }
    scope = 'page'
  }
  const idx = scope === 'page' ? [s.page] : doc.pages.map((_, i) => i)
  const texts: string[] = []
  const images: AiImage[] = []
  for (const i of idx) {
    const p = doc.pages[i]
    const t = await pageText(doc, p)
    if (t) texts.push(idx.length > 1 ? `--- Page ${i + 1} ---\n${t}` : t)
    // send an image when there is ink we haven't transcribed (limit the payload for long documents)
    if (hasInk(p) && !p.ocrText && images.length < 8) images.push(await pageImage(doc, i, p.background?.type !== 'pdf'))
    else if (!t && p.background && images.length < 8) images.push(await pageImage(doc, i))
  }
  const label = scope === 'page' ? (doc.pages[s.page]?.infinite ? `the whiteboard "${doc.title}"` : `page ${s.page + 1} of "${doc.title}"`) : `the whole document "${doc.title}" (${doc.pages.length} pages)`
  return { text: texts.join('\n\n'), images, label }
}

/** PNG of the lasso selection, with its bounds. */
export async function selectionImage(docId: string, withBackground = false): Promise<{ image: AiImage; bounds: Rect; pageIndex: number } | null> {
  const s = session(docId)
  const sel = selectedObjects(docId)
  if (!s || !sel?.objs.length) return null
  const b = unionBounds(sel.objs)
  if (!b) return null
  const pad = 12
  const region = { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 }
  const only = { ...sel.page, objects: sel.objs }
  const c = await rasterPage(s.doc, only, Math.min(2000, Math.max(600, region.w * 3)), region, { background: withBackground })
  return { image: { name: 'selection.png', base64: base64(c) }, bounds: b, pageIndex: s.doc.pages.indexOf(sel.page) }
}

/** Handwriting → text for one page; cached in page.ocrText (feeds search and Markdown export). */
export async function recognizePage(docId: string, index: number): Promise<string> {
  const s = session(docId)
  const page = s?.doc.pages[index]
  if (!s || !page || !hasInk(page)) return ''
  const img = await pageImage(s.doc, index, false)
  const text = (await ask({ kind: 'ocr', images: [img], scope: `page ${index + 1}` }).promise).trim()
  useEditor.getState().edit(
    docId,
    (doc) => ({ ...doc, pages: doc.pages.map((p) => (p.id === page.id ? { ...p, ocrText: text } : p)) }),
    { history: false }
  )
  return text
}

export async function recognizeDocument(docId: string): Promise<void> {
  const s = session(docId)
  if (!s) return
  const ui = useUi.getState()
  const todo = s.doc.pages.map((p, i) => (hasInk(p) ? i : -1)).filter((i) => i >= 0)
  if (!todo.length) {
    ui.toast('There is no handwriting to recognise')
    return
  }
  ui.toast(`Recognising handwriting on ${todo.length} ${todo.length === 1 ? 'page' : 'pages'}…`)
  let done = 0
  for (const i of todo) {
    try {
      await recognizePage(docId, i)
      done++
    } catch (e) {
      ui.toast(`AI: ${e instanceof Error ? e.message : 'failed'}`)
      return
    }
  }
  ui.toast(`Recognised ${done} ${done === 1 ? 'page' : 'pages'} — handwriting is now searchable`)
}

/** Answer → JSON (validated by main already; this just extracts it). */
export function parseJson<T>(text: string): T | null {
  const m = /\{[\s\S]*\}/.exec(text)
  if (!m) return null
  try {
    return JSON.parse(m[0]) as T
  } catch {
    return null
  }
}

/** Keep only a safe, standalone SVG from an AI answer. */
export function cleanSvg(text: string): { svg: string; w: number; h: number } | null {
  const m = /<svg[\s\S]*<\/svg>/i.exec(text)
  if (!m) return null
  const doc = new DOMParser().parseFromString(m[0], 'image/svg+xml')
  const root = doc.documentElement
  if (root.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) return null
  doc.querySelectorAll('script, foreignObject, iframe, image[href^="http"], use[href^="http"]').forEach((n) => n.remove())
  doc.querySelectorAll('*').forEach((el) => {
    for (const a of Array.from(el.attributes)) if (/^on/i.test(a.name) || /javascript:/i.test(a.value)) el.removeAttribute(a.name)
  })
  root.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const vb = (root.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number)
  let w = vb.length === 4 ? vb[2] : Number(root.getAttribute('width')) || 400
  let h = vb.length === 4 ? vb[3] : Number(root.getAttribute('height')) || 300
  if (vb.length !== 4) root.setAttribute('viewBox', `0 0 ${w} ${h}`)
  root.removeAttribute('width')
  root.removeAttribute('height')
  const k = Math.min(1, 480 / w, 480 / h)
  w *= k
  h *= k
  return { svg: new XMLSerializer().serializeToString(root), w, h }
}

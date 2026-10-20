/** Editor commands: selection, clipboard, inserting things, page management. */
import { newPage, uid } from '@shared/docs'
import { pageDims } from '@shared/paper'
import type { ImageObject, PageData, PageObject, PaperSpec, QuillDoc, StickerObject, TextObject } from '@shared/types'
import { session, useEditor } from '../../stores/editor'
import { useTools } from '../../stores/tools'
import { useUi } from '../../stores/ui'
import { bounds, scale, translate, unionBounds, withNewId } from './geometry'
import { mdToHtml } from './markdown'
import { viewCenter } from './views'

const toast = (m: string): void => useUi.getState().toast(m)
const ed = (): ReturnType<typeof useEditor.getState> => useEditor.getState()

function currentPage(docId: string): PageData | undefined {
  const s = session(docId)
  return s?.doc.pages[s.page] ?? s?.doc.pages[0]
}

export function selectedObjects(docId: string): { page: PageData; objs: PageObject[] } | null {
  const s = session(docId)
  if (!s?.selection) return null
  const page = s.doc.pages.find((p) => p.id === s.selection?.pageId)
  if (!page) return null
  const ids = new Set(s.selection.ids)
  return { page, objs: page.objects.filter((o) => ids.has(o.id)) }
}

// ───────────────────────── selection ─────────────────────────
export function deleteSelection(docId: string): void {
  const sel = selectedObjects(docId)
  if (!sel) return
  const ids = new Set(sel.objs.map((o) => o.id))
  ed().editObjects(docId, sel.page.id, (objs) => objs.filter((o) => !ids.has(o.id)))
  ed().view(docId, { selection: null })
}

export function selectAll(docId: string): void {
  const page = currentPage(docId)
  if (!page?.objects.length) return
  useTools.getState().setTool('lasso')
  ed().view(docId, { selection: { pageId: page.id, ids: page.objects.map((o) => o.id) }, editing: null })
}

let clipboard: { objs: PageObject[]; docId: string } | null = null

export function copySelection(docId: string): void {
  const sel = selectedObjects(docId)
  if (!sel?.objs.length) return
  clipboard = { objs: sel.objs, docId }
  // Also put plain text on the system clipboard when text is selected.
  const text = sel.objs
    .map((o) => (o.type === 'text' ? new DOMParser().parseFromString(o.html, 'text/html').body.textContent ?? '' : o.type === 'sticky' ? o.text : ''))
    .filter(Boolean)
    .join('\n')
  void navigator.clipboard.writeText(text || ' ').catch(() => undefined)
  copiedAt = Date.now()
}
let copiedAt = 0

export function cutSelection(docId: string): void {
  copySelection(docId)
  deleteSelection(docId)
}

export function duplicateSelection(docId: string): void {
  const sel = selectedObjects(docId)
  if (!sel) return
  const copies = sel.objs.map((o) => translate(withNewId(o), 18, 18))
  ed().editObjects(docId, sel.page.id, (objs) => [...objs, ...copies])
  ed().view(docId, { selection: { pageId: sel.page.id, ids: copies.map((c) => c.id) } })
}

/** Paste our own clipboard, or an image / text from the system clipboard. */
export async function paste(docId: string): Promise<void> {
  const s = session(docId)
  if (!s || s.readOnly) return
  const c = viewCenter(docId)
  const page = s.doc.pages[c.page]
  if (!page) return
  try {
    const items = await navigator.clipboard.read()
    for (const item of items) {
      const type = item.types.find((t) => t.startsWith('image/'))
      if (type && (!clipboard || Date.now() - copiedAt > 1500)) {
        const blob = await item.getType(type)
        const ext = type.split('/')[1].replace('jpeg', 'jpg').replace(/\+.*/, '')
        const name = await window.quill.doc.writeAsset(docId, `pasted-${uid().slice(0, 8)}.${ext}`, new Uint8Array(await blob.arrayBuffer()))
        const dims = await imageDims(URL.createObjectURL(blob))
        placeImage(docId, { asset: name, width: dims.width, height: dims.height })
        return
      }
    }
  } catch {
    /* no permission or empty clipboard */
  }
  if (clipboard) {
    const b = unionBounds(clipboard.objs)
    if (!b) return
    const sameDoc = clipboard.docId === docId
    if (!sameDoc && clipboard.objs.some((o) => o.type === 'image')) {
      toast('Images can only be pasted inside the same document')
    }
    const dx = c.x - (b.x + b.w / 2)
    const dy = c.y - (b.y + b.h / 2)
    const copies = clipboard.objs.filter((o) => sameDoc || o.type !== 'image').map((o) => translate(withNewId(o), dx, dy))
    ed().editObjects(docId, page.id, (objs) => [...objs, ...copies])
    useTools.getState().setTool('lasso')
    ed().view(docId, { selection: { pageId: page.id, ids: copies.map((o) => o.id) } })
    return
  }
  const text = await navigator.clipboard.readText().catch(() => '')
  if (text.trim()) insertTextBox(docId, mdToHtml(text), c)
}

export function recolorSelection(docId: string, color: string): void {
  const sel = selectedObjects(docId)
  if (!sel) return
  const ids = new Set(sel.objs.map((o) => o.id))
  ed().editObjects(docId, sel.page.id, (objs) =>
    objs.map((o) => {
      if (!ids.has(o.id)) return o
      if (o.type === 'stroke') return { ...o, color }
      if (o.type === 'shape') return { ...o, stroke: color, fill: o.fill ? color + '2e' : null }
      if (o.type === 'text') return { ...o, color }
      if (o.type === 'sticky') return { ...o, color }
      return o
    })
  )
}

export function arrangeSelection(docId: string, where: 'front' | 'back'): void {
  const sel = selectedObjects(docId)
  if (!sel) return
  const ids = new Set(sel.objs.map((o) => o.id))
  ed().editObjects(docId, sel.page.id, (objs) => {
    const picked = objs.filter((o) => ids.has(o.id))
    const rest = objs.filter((o) => !ids.has(o.id))
    return where === 'front' ? [...rest, ...picked] : [...picked, ...rest]
  })
}

export function patchSelected(docId: string, fn: (o: PageObject) => PageObject): void {
  const sel = selectedObjects(docId)
  if (!sel) return
  const ids = new Set(sel.objs.map((o) => o.id))
  ed().editObjects(docId, sel.page.id, (objs) => objs.map((o) => (ids.has(o.id) ? fn(o) : o)))
}

export function rotateSelectedImage(docId: string, deg: number): void {
  patchSelected(docId, (o) => (o.type === 'image' || o.type === 'sticker' ? { ...o, rotation: (((o.rotation ?? 0) + deg) % 360 + 360) % 360 } : o))
}

// ───────────────────────── inserting ─────────────────────────
function imageDims(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth || 400, height: img.naturalHeight || 300 })
    img.onerror = () => resolve({ width: 400, height: 300 })
    img.src = url
  })
}

export function placeImage(docId: string, a: { asset: string; width: number; height: number }, at?: { x: number; y: number }): void {
  const s = session(docId)
  if (!s) return
  const c = at ? { ...viewCenter(docId), ...at } : viewCenter(docId)
  const page = s.doc.pages[c.page]
  if (!page) return
  const maxW = page.infinite ? 480 : page.width * 0.6
  const maxH = page.infinite ? 480 : page.height * 0.5
  const k = Math.min(1, maxW / a.width, maxH / a.height)
  const w = a.width * k
  const h = a.height * k
  const img: ImageObject = { id: uid(), type: 'image', x: c.x - w / 2, y: c.y - h / 2, w, h, rotation: 0, opacity: 1, asset: a.asset }
  ed().editObjects(docId, page.id, (objs) => [...objs, img])
  useTools.getState().setTool('lasso')
  ed().view(docId, { selection: { pageId: page.id, ids: [img.id] } })
}

export async function insertImages(docId: string): Promise<void> {
  const added = await window.quill.doc.pickImages(docId)
  added.forEach((a, i) => placeImage(docId, a, i ? { x: viewCenter(docId).x + i * 24, y: viewCenter(docId).y + i * 24 } : undefined))
}

/** Files dropped from the OS onto the editor. */
export async function dropFiles(docId: string, files: File[], at?: { page: number; x: number; y: number }): Promise<void> {
  for (const f of files) {
    const path = window.quill.pathForFile(f)
    if (!path) continue
    const a = await window.quill.doc.addImageFromPath(docId, path)
    if (a) placeImage(docId, a, at)
    else toast(`${f.name} isn't an image`)
  }
}

export function insertSticker(docId: string, svg: string, w: number, h: number): void {
  const c = viewCenter(docId)
  const page = session(docId)?.doc.pages[c.page]
  if (!page) return
  const st: StickerObject = { id: uid(), type: 'sticker', x: c.x - w / 2, y: c.y - h / 2, w, h, svg }
  ed().editObjects(docId, page.id, (objs) => [...objs, st])
  useTools.getState().setTool('lasso')
  ed().view(docId, { selection: { pageId: page.id, ids: [st.id] } })
}

/** Place a group of objects (an element from the Elements library) centred in view. */
export function insertObjects(docId: string, objects: PageObject[], w: number, h: number): void {
  const c = viewCenter(docId)
  const page = session(docId)?.doc.pages[c.page]
  if (!page) return
  const copies = objects.map((o) => translate(withNewId(o), c.x - w / 2, c.y - h / 2))
  ed().editObjects(docId, page.id, (objs) => [...objs, ...copies])
  useTools.getState().setTool('lasso')
  ed().view(docId, { selection: { pageId: page.id, ids: copies.map((o) => o.id) } })
}

export function insertTextBox(docId: string, html: string, at?: { page: number; x: number; y: number }, w = 360): string | null {
  const c = at ?? viewCenter(docId)
  const page = session(docId)?.doc.pages[c.page]
  if (!page) return null
  const t = useTools.getState().text
  const width = Math.min(w, page.infinite ? w : page.width - 48)
  const x = page.infinite ? c.x - width / 2 : Math.max(24, Math.min(page.width - width - 24, c.x - width / 2))
  const box: TextObject = { id: uid(), type: 'text', x, y: c.y, w: width, h: 40, html, font: t.font, size: t.size, color: t.color, align: 'left', bg: null }
  ed().editObjects(docId, page.id, (objs) => [...objs, box])
  // measure the real height once rendered
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>(`[data-id="${box.id}"] .qn-text`)
    if (el) ed().editObjects(docId, page.id, (objs) => objs.map((o) => (o.id === box.id && o.type === 'text' ? { ...o, h: Math.max(40, el.scrollHeight) } : o)), { history: false })
  })
  return box.id
}

// ───────────────────────── pages ─────────────────────────
export type AddWhere = 'before' | 'after' | 'last'

function insertPages(docId: string, where: AddWhere, made: PageData[]): void {
  const s = session(docId)
  if (!s) return
  const at = where === 'before' ? s.page : where === 'after' ? s.page + 1 : s.doc.pages.length
  ed().edit(docId, (doc) => ({ ...doc, pages: [...doc.pages.slice(0, at), ...made, ...doc.pages.slice(at)] }))
  ed().view(docId, { jump: { page: at, nonce: Date.now() }, page: at })
}

export function addPage(docId: string, where: AddWhere, paper?: PaperSpec): void {
  const s = session(docId)
  if (!s) return
  const ref = s.doc.pages[s.page]
  const spec = paper ?? (ref && !ref.background ? ref.paper : s.doc.paper)
  insertPages(docId, where, [newPage(spec)])
}

export async function addImagePage(docId: string, where: AddWhere): Promise<void> {
  const [a] = await window.quill.doc.pickImages(docId)
  if (!a) return
  const k = 842 / Math.max(a.width, a.height)
  const s = session(docId)
  if (!s) return
  insertPages(docId, where, [{ id: uid(), width: Math.round(a.width * k), height: Math.round(a.height * k), paper: { ...s.doc.paper, template: 'blank', color: 'white' }, background: { type: 'image', asset: a.asset }, objects: [] }])
}

export async function addPdfPages(docId: string, where: AddWhere): Promise<void> {
  try {
    const r = await window.quill.doc.pickPdf(docId)
    const s = session(docId)
    if (!r || !s) return
    const paper = { ...s.doc.paper, template: 'blank', color: 'white' as const }
    insertPages(
      docId,
      where,
      r.pages.map((p, i) => ({ id: uid(), width: p.width, height: p.height, paper, background: { type: 'pdf' as const, asset: r.asset, pdfPage: i }, objects: [] }))
    )
    toast(`Added ${r.pages.length} ${r.pages.length === 1 ? 'page' : 'pages'}`)
  } catch (e) {
    toast(`Couldn't import: ${e instanceof Error ? e.message : 'unknown error'}`)
  }
}

export function duplicatePage(docId: string, index: number): void {
  const s = session(docId)
  const p = s?.doc.pages[index]
  if (!p) return
  const copy: PageData = { ...p, id: uid(), bookmarked: false, objects: p.objects.map(withNewId) }
  ed().edit(docId, (doc) => ({ ...doc, pages: [...doc.pages.slice(0, index + 1), copy, ...doc.pages.slice(index + 1)] }))
  ed().view(docId, { jump: { page: index + 1, nonce: Date.now() } })
}

export function deletePage(docId: string, index: number): void {
  const s = session(docId)
  if (!s) return
  if (s.doc.pages.length <= 1) {
    clearPage(docId, index)
    return
  }
  ed().edit(docId, (doc) => ({ ...doc, pages: doc.pages.filter((_, i) => i !== index) }))
  ed().view(docId, { page: Math.max(0, Math.min(index, s.doc.pages.length - 2)), selection: null })
  useUi.getState().toast('Page deleted', { label: 'Undo', run: () => ed().undo(docId) })
}

export function clearPage(docId: string, index: number, keep?: (o: PageObject) => boolean): void {
  const p = session(docId)?.doc.pages[index]
  if (!p) return
  ed().editObjects(docId, p.id, (objs) => (keep ? objs.filter(keep) : []))
  ed().view(docId, { selection: null })
}

export function movePage(docId: string, from: number, to: number): void {
  if (from === to) return
  ed().edit(docId, (doc) => {
    const pages = doc.pages.slice()
    const [p] = pages.splice(from, 1)
    pages.splice(to, 0, p)
    return { ...doc, pages }
  })
  ed().view(docId, { page: to })
}

export function patchPage(docId: string, index: number, fn: (p: PageData) => PageData, history = true): void {
  ed().edit(
    docId,
    (doc) => {
      const p = doc.pages[index]
      if (!p) return doc
      const next = fn(p)
      if (next === p) return doc
      const pages = doc.pages.slice()
      pages[index] = next
      return { ...doc, pages }
    },
    { history }
  )
}

export function changeTemplate(docId: string, index: number, paper: PaperSpec, allPages = false): void {
  ed().edit(docId, (doc) => ({
    ...doc,
    paper: allPages ? paper : doc.paper,
    pages: doc.pages.map((p, i) => {
      if ((!allPages && i !== index) || p.background || p.infinite) return p
      const { w, h } = pageDims(paper.size, paper.orientation)
      return { ...p, paper, width: w, height: h }
    })
  }))
}

/** Rotate a paper or image page by 90°; its content turns with it. */
export function rotatePage(docId: string, index: number, dir: 1 | -1): void {
  const s = session(docId)
  const p = s?.doc.pages[index]
  if (!p) return
  if (p.background?.type === 'pdf') {
    toast("PDF pages can't be rotated")
    return
  }
  const W = p.width
  const H = p.height
  // 90° clockwise: (x, y) → (H - y, x); counter-clockwise: (x, y) → (y, W - x)
  const mapPt = (x: number, y: number): [number, number] => (dir === 1 ? [H - y, x] : [y, W - x])
  const objects = p.objects.map((o) => {
    if (o.type === 'stroke') {
      const pts = o.points.slice()
      for (let i = 0; i + 1 < pts.length; i += 3) [pts[i], pts[i + 1]] = mapPt(pts[i], pts[i + 1])
      return { ...o, points: pts }
    }
    if (o.type === 'shape' && o.points) {
      const pts = o.points.slice()
      for (let i = 0; i + 1 < pts.length; i += 2) [pts[i], pts[i + 1]] = mapPt(pts[i], pts[i + 1])
      const b = bounds({ ...o, points: pts })
      return { ...o, points: pts, x: b.x, y: b.y, w: b.w, h: b.h }
    }
    const b = { x: o.x, y: o.y, w: o.w, h: o.h }
    const [cx, cy] = mapPt(b.x + b.w / 2, b.y + b.h / 2)
    if (o.type === 'image' || o.type === 'sticker') return { ...o, x: cx - b.w / 2, y: cy - b.h / 2, rotation: (((o.rotation ?? 0) + dir * 90) % 360 + 360) % 360 }
    if (o.type === 'shape') return { ...o, x: cx - b.h / 2, y: cy - b.w / 2, w: b.h, h: b.w }
    return { ...o, x: cx - b.w / 2, y: cy - b.h / 2 }
  })
  const paper: PaperSpec = { ...p.paper, orientation: p.paper.orientation === 'portrait' ? 'landscape' : 'portrait' }
  patchPage(docId, index, () => ({ ...p, width: H, height: W, paper: p.background ? p.paper : paper, objects }))
}

export function toggleBookmark(docId: string, index: number): void {
  patchPage(docId, index, (p) => ({ ...p, bookmarked: !p.bookmarked }), false)
}

export function goToPage(docId: string, index: number): void {
  ed().view(docId, { jump: { page: index, nonce: Date.now() }, page: index })
}

export function setTitle(docId: string, title: string): void {
  const clean = title.trim()
  if (!clean) return
  ed().edit(docId, (doc: QuillDoc) => ({ ...doc, title: clean }))
  void import('../../stores/library').then(({ useLibrary }) => useLibrary.getState().rename(docId, clean))
}

/** Scale a group of objects to fit a box (used when inserting AI-made content). */
export function fitObjects(objs: PageObject[], maxW: number): PageObject[] {
  const b = unionBounds(objs)
  if (!b || b.w <= maxW) return objs
  const k = maxW / b.w
  return objs.map((o) => scale(o, k, k, b.x, b.y))
}

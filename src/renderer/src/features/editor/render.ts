/**
 * Page objects → SVG markup. The same strings render the live page (one <g> per object), the
 * thumbnails, PNG export and the PDF annotation layer, so every surface draws identical ink.
 */
import type { ImageObject, PageData, PageObject, ShapeObject, StickerObject, StickyObject, StrokeObject, TextObject } from '@shared/types'
import { HIGHLIGHT_ALPHA, strokePath } from './ink'
import { shapeVertices } from './geometry'

export const assetUrl = (docId: string, name: string): string => `quill-asset://${docId}/${encodeURIComponent(name)}`

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)
const n = (v: number): string => (Math.round(v * 100) / 100).toString()

export const FONT_STACK: Record<NonNullable<TextObject['font']>, string> = {
  sans: "'Figtree Variable', Figtree, 'Segoe UI', sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "Consolas, Menlo, 'Courier New', monospace",
  hand: "Caveat, 'Segoe Print', 'Bradley Hand', cursive"
}

export function strokeSvg(s: StrokeObject): string {
  const d = strokePath(s)
  if (!d) return ''
  if (s.tool === 'highlighter')
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${n(s.width)}" stroke-linecap="butt" stroke-linejoin="round"/>`
  if (s.tool === 'tape') {
    if (s.revealed)
      return `<path d="${d}" fill="none" stroke="${s.color}" stroke-opacity="0.16" stroke-width="${n(s.width)}" stroke-linecap="butt" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${s.color}" stroke-opacity="0.55" stroke-width="1" stroke-dasharray="4 3"/>`
    const stripe = Math.max(2, s.width / 6)
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${n(s.width)}" stroke-linecap="butt" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#fff" stroke-opacity="0.22" stroke-width="${n(s.width * 0.55)}" stroke-dasharray="${n(stripe)} ${n(stripe)}" stroke-linecap="butt"/>`
  }
  return `<path d="${d}" fill="${s.color}"/>`
}

export function shapeSvg(s: ShapeObject): string {
  const dash = s.dash ? ` stroke-dasharray="${n(s.width * 3)} ${n(s.width * 2.2)}"` : ''
  const common = `stroke="${s.stroke}" stroke-width="${n(s.width)}" stroke-linecap="round" stroke-linejoin="round"${dash}`
  const fill = s.fill ?? 'none'
  switch (s.shape) {
    case 'rect':
      return `<rect x="${n(s.x)}" y="${n(s.y)}" width="${n(s.w)}" height="${n(s.h)}" fill="${fill}" ${common}/>`
    case 'ellipse':
      return `<ellipse cx="${n(s.x + s.w / 2)}" cy="${n(s.y + s.h / 2)}" rx="${n(Math.abs(s.w) / 2)}" ry="${n(Math.abs(s.h) / 2)}" fill="${fill}" ${common}/>`
    case 'line':
    case 'arrow': {
      const [x1, y1, x2, y2] = s.points ?? [s.x, s.y, s.x + s.w, s.y + s.h]
      let out = `<path d="M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}" fill="none" ${common}/>`
      if (s.shape === 'arrow') {
        const a = Math.atan2(y2 - y1, x2 - x1)
        const len = Math.max(10, s.width * 4.5)
        const p1 = [x2 - len * Math.cos(a - 0.45), y2 - len * Math.sin(a - 0.45)]
        const p2 = [x2 - len * Math.cos(a + 0.45), y2 - len * Math.sin(a + 0.45)]
        out += `<path d="M${n(p1[0])} ${n(p1[1])}L${n(x2)} ${n(y2)}L${n(p2[0])} ${n(p2[1])}" fill="none" stroke="${s.stroke}" stroke-width="${n(s.width)}" stroke-linecap="round" stroke-linejoin="round"/>`
      }
      return out
    }
    default: {
      const { xy } = shapeVertices(s)
      const pts = []
      for (let i = 0; i + 1 < xy.length; i += 2) pts.push(`${n(xy[i])},${n(xy[i + 1])}`)
      return `<polygon points="${pts.join(' ')}" fill="${fill}" ${common}/>`
    }
  }
}

export function imageSvg(o: ImageObject, docId: string, href?: string): string {
  const c = o.crop ?? { x: 0, y: 0, w: 1, h: 1 }
  const rot = o.rotation ? ` transform="rotate(${o.rotation} ${n(o.x + o.w / 2)} ${n(o.y + o.h / 2)})"` : ''
  return `<g${rot} opacity="${o.opacity ?? 1}"><svg x="${n(o.x)}" y="${n(o.y)}" width="${n(o.w)}" height="${n(o.h)}" viewBox="${c.x} ${c.y} ${c.w} ${c.h}" preserveAspectRatio="none" overflow="hidden"><image href="${esc(href ?? assetUrl(docId, o.asset))}" x="0" y="0" width="1" height="1" preserveAspectRatio="none"/></svg></g>`
}

/** Replace attributes on an SVG string's root element (drops any existing ones of the same name). */
export function setRootAttrs(svg: string, attrs: Record<string, string>): string {
  return svg.replace(/^<svg\b([^>]*)>/, (_m, rest: string) => {
    let a = rest
    for (const k of Object.keys(attrs)) a = a.replace(new RegExp(`\\s${k}="[^"]*"`, 'g'), '')
    return `<svg${a}${Object.entries(attrs).map(([k, v]) => ` ${k}="${v}"`).join('')}>`
  })
}

export const svgDataUrl = (svg: string): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

export function stickerSvg(o: StickerObject): string {
  const rot = o.rotation ? ` transform="rotate(${o.rotation} ${n(o.x + o.w / 2)} ${n(o.y + o.h / 2)})"` : ''
  return `<g${rot}><image href="${svgDataUrl(o.svg)}" x="${n(o.x)}" y="${n(o.y)}" width="${n(o.w)}" height="${n(o.h)}" preserveAspectRatio="xMidYMid meet"/></g>`
}

/** Inline style for a text box's content element. */
export function textStyle(o: TextObject): string {
  return `font-family:${FONT_STACK[o.font ?? 'sans']};font-size:${n(o.size ?? 16)}px;line-height:1.4;color:${o.color ?? '#1f2430'};text-align:${o.align ?? 'left'};${o.bg ? `background:${o.bg};` : ''}padding:4px 6px;width:100%;min-height:100%;box-sizing:border-box;overflow-wrap:break-word;white-space:pre-wrap;font-weight:400`
}

/** HTML from contentEditable is not always well-formed XML; make it XHTML for SVG images. */
export function toXhtml(html: string): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const ser = new XMLSerializer()
  return Array.from(doc.body.firstElementChild?.childNodes ?? [])
    .map((c) => ser.serializeToString(c))
    .join('')
    .replace(/ xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, '')
}

export function textSvg(o: TextObject): string {
  return `<foreignObject x="${n(o.x)}" y="${n(o.y)}" width="${n(o.w)}" height="${n(o.h)}"><div xmlns="http://www.w3.org/1999/xhtml" class="qn-text" style="${textStyle(o)}">${toXhtml(o.html)}</div></foreignObject>`
}

export const STICKY_COLORS = ['#FFF3A6', '#FFD59E', '#FFB8B8', '#F9C2E6', '#D9C8FF', '#BFD7FF', '#B8EEF0', '#C9F0B8', '#E6E6E6']

export function stickySvg(o: StickyObject): string {
  if (o.collapsed)
    return `<g><rect x="${n(o.x)}" y="${n(o.y)}" width="36" height="36" rx="6" fill="${o.color}" stroke="rgba(0,0,0,.12)"/><path d="M${n(o.x + 10)} ${n(o.y + 14)}h16M${n(o.x + 10)} ${n(o.y + 20)}h16M${n(o.x + 10)} ${n(o.y + 26)}h10" stroke="rgba(0,0,0,.35)" stroke-width="1.6" stroke-linecap="round"/></g>`
  const text = esc(o.text).replace(/\n/g, '<br/>')
  return `<g><rect x="${n(o.x + 2)}" y="${n(o.y + 3)}" width="${n(o.w)}" height="${n(o.h)}" rx="4" fill="rgba(0,0,0,.12)"/><rect x="${n(o.x)}" y="${n(o.y)}" width="${n(o.w)}" height="${n(o.h)}" rx="4" fill="${o.color}"/><foreignObject x="${n(o.x)}" y="${n(o.y)}" width="${n(o.w)}" height="${n(o.h)}"><div xmlns="http://www.w3.org/1999/xhtml" style="padding:14px 14px;font:400 15px/1.4 ${FONT_STACK.sans.replace(/'/g, '&apos;')};color:#2b2b2b;overflow-wrap:break-word;height:100%;box-sizing:border-box;overflow:hidden">${text}</div></foreignObject></g>`
}

/** Markup for one object (text and sticky included; the live view renders those as React instead). */
export function objectSvg(o: PageObject, docId: string): string {
  switch (o.type) {
    case 'stroke':
      return strokeSvg(o)
    case 'shape':
      return shapeSvg(o)
    case 'image':
      return imageSvg(o, docId)
    case 'sticker':
      return stickerSvg(o)
    case 'text':
      return textSvg(o)
    case 'sticky':
      return stickySvg(o)
  }
}

export type Layer = 'media' | 'highlight' | 'top'
/** Images and stickers sit lowest, then highlighter, then ink, shapes, tape, text and notes. */
export function layerOf(o: PageObject): Layer {
  if (o.type === 'image' || o.type === 'sticker') return 'media'
  if (o.type === 'stroke' && o.tool === 'highlighter') return 'highlight'
  return 'top'
}

/** Full annotation layer as a standalone <svg>. */
export function overlaySvg(page: Pick<PageData, 'objects'>, docId: string, view: { x: number; y: number; w: number; h: number }, opts: { hrefs?: Map<string, string> } = {}): string {
  const media: string[] = []
  const hl: string[] = []
  const top: string[] = []
  for (const o of page.objects) {
    const layer = layerOf(o)
    const svg = o.type === 'image' && opts.hrefs ? imageSvg(o, docId, opts.hrefs.get(o.asset)) : objectSvg(o, docId)
    ;(layer === 'media' ? media : layer === 'highlight' ? hl : top).push(svg)
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${n(view.x)} ${n(view.y)} ${n(view.w)} ${n(view.h)}" width="${n(view.w)}" height="${n(view.h)}">${media.join('')}<g opacity="${HIGHLIGHT_ALPHA}">${hl.join('')}</g>${top.join('')}</svg>`
}

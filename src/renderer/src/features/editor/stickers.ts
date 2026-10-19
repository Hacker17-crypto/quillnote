/** Original sticker packs (SVG), animated "GIF" stickers and starter Elements, all drawn in code. */
import type { ElementCollection } from '@shared/api'
import type { PageObject } from '@shared/types'

export interface StickerDef {
  id: string
  name: string
  svg: string
  w: number
  h: number
}

export interface StickerPack {
  id: string
  name: string
  /** Emoji-ish glyph for the category tab. */
  icon: string
  items: StickerDef[]
}

const S = (vb: string, body: string): string => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`
const FONT = `font-family="Figtree, 'Segoe UI', sans-serif"`

function note(color: string, fold: string, lines = true): string {
  return S('0 0 120 120', `<path d="M6 8h108v84l-22 22H6Z" fill="${color}"/><path d="M114 92H92v22Z" fill="${fold}"/><path d="M6 8h108v6H6Z" fill="#000" opacity=".06"/>${lines ? '<path d="M20 38h80M20 54h80M20 70h56" stroke="#000" stroke-opacity=".12" stroke-width="2.4" stroke-linecap="round"/>' : ''}`)
}

function label(text: string, bg: string, fg = '#fff', w = 160): string {
  return S(`0 0 ${w} 52`, `<rect x="3" y="5" width="${w - 6}" height="42" rx="21" fill="${bg}"/><rect x="3" y="5" width="${w - 6}" height="42" rx="21" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="2"/><text x="${w / 2}" y="33" text-anchor="middle" ${FONT} font-size="20" font-weight="800" fill="${fg}" letter-spacing=".5">${text}</text>`)
}

function washi(c1: string, c2: string): string {
  return S('0 0 200 44', `<defs><pattern id="w" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="16" height="16" fill="${c1}"/><rect width="8" height="16" fill="${c2}"/></pattern></defs><path d="M4 4h192l-5 6 5 6-5 6 5 6-5 6 5 6H4l5-6-5-6 5-6-5-6 5-6Z" fill="url(#w)" opacity=".9"/>`)
}

function face(bg: string, mouth: string, extra = ''): string {
  return S('0 0 100 100', `<circle cx="50" cy="50" r="44" fill="${bg}" stroke="#2b2b2b" stroke-width="3.5"/><circle cx="36" cy="42" r="5" fill="#2b2b2b"/><circle cx="64" cy="42" r="5" fill="#2b2b2b"/>${mouth}${extra}`)
}

const STAR = S('0 0 100 100', `<path d="m50 6 13 28 30 4-22 21 6 31-27-15-27 15 6-31L7 38l30-4Z" fill="#FFD43B" stroke="#2b2b2b" stroke-width="3.5" stroke-linejoin="round"/><path d="M38 52q12 10 24 0" fill="none" stroke="#2b2b2b" stroke-width="3" stroke-linecap="round"/><circle cx="40" cy="44" r="3" fill="#2b2b2b"/><circle cx="60" cy="44" r="3" fill="#2b2b2b"/>`)
const HEART = S('0 0 100 100', `<path d="M50 88C20 66 8 50 8 32 8 19 18 10 30 10c9 0 16 5 20 13 4-8 11-13 20-13 12 0 22 9 22 22 0 18-12 34-42 56Z" fill="#FF6B8B" stroke="#2b2b2b" stroke-width="3.5" stroke-linejoin="round"/><path d="M24 28q4-8 12-8" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>`)
const CHECK = S('0 0 100 100', `<circle cx="50" cy="50" r="44" fill="#30A46C" stroke="#2b2b2b" stroke-width="3.5"/><path d="m28 51 15 15 30-31" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`)
const CROSS = S('0 0 100 100', `<circle cx="50" cy="50" r="44" fill="#E5484D" stroke="#2b2b2b" stroke-width="3.5"/><path d="m33 33 34 34M67 33 33 67" stroke="#fff" stroke-width="9" stroke-linecap="round"/>`)
const BULB = S('0 0 100 100', `<path d="M50 10a28 28 0 0 0-16 51c3 2 5 6 5 10v4h22v-4c0-4 2-8 5-10a28 28 0 0 0-16-51Z" fill="#FFE24D" stroke="#2b2b2b" stroke-width="3.5"/><rect x="38" y="78" width="24" height="10" rx="4" fill="#B7B7B7" stroke="#2b2b2b" stroke-width="3.5"/><path d="M44 48l6 8 6-8M50 56v18" fill="none" stroke="#2b2b2b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`)
const PIN = S('0 0 100 100', `<circle cx="50" cy="34" r="22" fill="#E5484D" stroke="#2b2b2b" stroke-width="3.5"/><path d="M50 56v36" stroke="#2b2b2b" stroke-width="4" stroke-linecap="round"/><circle cx="43" cy="27" r="6" fill="#fff" opacity=".6"/>`)
const CLOCK = S('0 0 100 100', `<circle cx="50" cy="50" r="42" fill="#fff" stroke="#2b2b2b" stroke-width="3.5"/><path d="M50 22v28l18 12" fill="none" stroke="#2b2b2b" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="50" r="4" fill="#E5484D"/>`)
const BOOK = S('0 0 110 100', `<path d="M8 18c16-6 30-6 47 4v66c-17-10-31-10-47-4Z" fill="#8EC5FF" stroke="#2b2b2b" stroke-width="3.5" stroke-linejoin="round"/><path d="M102 18c-16-6-30-6-47 4v66c17-10 31-10 47-4Z" fill="#C9A7F2" stroke="#2b2b2b" stroke-width="3.5" stroke-linejoin="round"/>`)
const COFFEE = S('0 0 100 100', `<path d="M18 38h52v30a20 20 0 0 1-20 20H38a20 20 0 0 1-20-20Z" fill="#A0755A" stroke="#2b2b2b" stroke-width="3.5"/><path d="M70 46h6a10 10 0 0 1 0 20h-7" fill="none" stroke="#2b2b2b" stroke-width="3.5"/><path d="M34 14c-4 6 4 10 0 16M46 12c-4 6 4 10 0 16M58 14c-4 6 4 10 0 16" fill="none" stroke="#7A7A7A" stroke-width="3" stroke-linecap="round"/>`)
const ROCKET = S('0 0 100 100', `<path d="M50 6c18 12 24 34 18 58H32C26 40 32 18 50 6Z" fill="#E5E5E5" stroke="#2b2b2b" stroke-width="3.5" stroke-linejoin="round"/><circle cx="50" cy="36" r="9" fill="#8EC5FF" stroke="#2b2b2b" stroke-width="3.5"/><path d="M32 52 18 70l16-2M68 52l14 18-16-2" fill="#E5484D" stroke="#2b2b2b" stroke-width="3.5" stroke-linejoin="round"/><path d="M40 66c2 10 6 18 10 24 4-6 8-14 10-24Z" fill="#FFB224" stroke="#2b2b2b" stroke-width="3" stroke-linejoin="round"/>`)
const SUN = S('0 0 100 100', `<g stroke="#F76B15" stroke-width="5" stroke-linecap="round"><path d="M50 4v12M50 84v12M4 50h12M84 50h12M17 17l9 9M74 74l9 9M17 83l9-9M74 26l9-9"/></g><circle cx="50" cy="50" r="24" fill="#FFB224" stroke="#2b2b2b" stroke-width="3.5"/>`)
const CLOUD = S('0 0 120 80', `<path d="M30 70a22 22 0 0 1-2-44 28 28 0 0 1 52-6 20 20 0 0 1 14 38 14 14 0 0 1-4 12Z" fill="#fff" stroke="#2b2b2b" stroke-width="3.5" stroke-linejoin="round"/>`)
const FLOWER = S('0 0 100 100', `<g fill="#FF9BD2" stroke="#2b2b2b" stroke-width="3">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="50" cy="26" rx="14" ry="20" transform="rotate(${a} 50 50)"/>`).join('')}</g><circle cx="50" cy="50" r="12" fill="#FFE24D" stroke="#2b2b2b" stroke-width="3"/>`)
const TROPHY = S('0 0 100 100', `<path d="M30 12h40v24a20 20 0 0 1-40 0Z" fill="#FFD43B" stroke="#2b2b2b" stroke-width="3.5"/><path d="M30 18H16c0 14 6 20 16 22M70 18h14c0 14-6 20-16 22" fill="none" stroke="#2b2b2b" stroke-width="3.5"/><path d="M46 56h8v16h-8Z" fill="#FFB224" stroke="#2b2b2b" stroke-width="3"/><rect x="30" y="72" width="40" height="14" rx="3" fill="#A0755A" stroke="#2b2b2b" stroke-width="3.5"/>`)

export const STICKER_PACKS: StickerPack[] = [
  {
    id: 'notes',
    name: 'Sticky Notes',
    icon: '🗒',
    items: [
      ['Yellow note', '#FFF3A6', '#E9D86B'], ['Peach note', '#FFD59E', '#E8B46A'], ['Pink note', '#FFB8B8', '#E58A8A'],
      ['Lilac note', '#D9C8FF', '#B29BEA'], ['Sky note', '#BFD7FF', '#8FB0E8'], ['Mint note', '#C9F0B8', '#9DD38A']
    ].map(([name, c, f], i) => ({ id: `note-${i}`, name, svg: note(c, f), w: 140, h: 140 }))
  },
  {
    id: 'study',
    name: 'Study',
    icon: '⭐',
    items: [
      { id: 'star', name: 'Star', svg: STAR, w: 90, h: 90 },
      { id: 'heart', name: 'Heart', svg: HEART, w: 90, h: 90 },
      { id: 'check', name: 'Done', svg: CHECK, w: 80, h: 80 },
      { id: 'cross', name: 'Wrong', svg: CROSS, w: 80, h: 80 },
      { id: 'bulb', name: 'Idea', svg: BULB, w: 90, h: 90 },
      { id: 'pin', name: 'Pin', svg: PIN, w: 70, h: 70 },
      { id: 'clock', name: 'Clock', svg: CLOCK, w: 80, h: 80 },
      { id: 'book', name: 'Book', svg: BOOK, w: 96, h: 88 },
      { id: 'trophy', name: 'Trophy', svg: TROPHY, w: 84, h: 84 }
    ]
  },
  {
    id: 'labels',
    name: 'Labels',
    icon: '🏷',
    items: [
      ['IMPORTANT', '#E5484D'], ['TO DO', '#0C8CF3'], ['DONE', '#30A46C'], ['EXAM', '#8E4EC6'],
      ['REVIEW', '#F76B15'], ['IDEA', '#FFB224', '#2b2b2b'], ['URGENT', '#D6409F'], ['NOTE', '#434343']
    ].map(([t, bg, fg], i) => ({ id: `label-${i}`, name: t, svg: label(t, bg, fg ?? '#fff', Math.max(110, t.length * 16 + 40)), w: Math.max(110, t.length * 16 + 40) * 0.8, h: 42 }))
  },
  {
    id: 'washi',
    name: 'Washi',
    icon: '🎀',
    items: [
      ['#FFB8B8', '#FFD9D9'], ['#BFD7FF', '#E0ECFF'], ['#C9F0B8', '#E6F8DD'], ['#FFE24D', '#FFF2A6'], ['#D9C8FF', '#ECE3FF'], ['#B7B7B7', '#E5E5E5']
    ].map(([a, b], i) => ({ id: `washi-${i}`, name: 'Washi tape', svg: washi(a, b), w: 200, h: 44 }))
  },
  {
    id: 'fun',
    name: 'Fun',
    icon: '😊',
    items: [
      { id: 'smile', name: 'Smile', svg: face('#FFD43B', '<path d="M30 60q20 18 40 0" fill="none" stroke="#2b2b2b" stroke-width="4" stroke-linecap="round"/>'), w: 80, h: 80 },
      { id: 'wow', name: 'Wow', svg: face('#8EC5FF', '<ellipse cx="50" cy="66" rx="9" ry="12" fill="#2b2b2b"/>'), w: 80, h: 80 },
      { id: 'cool', name: 'Cool', svg: face('#7BE495', '<path d="M34 62q16 10 32 0" fill="none" stroke="#2b2b2b" stroke-width="4" stroke-linecap="round"/>', '<path d="M22 36h56v6c0 8-6 12-13 12s-11-4-12-10h-6c-1 6-5 10-12 10s-13-4-13-12Z" fill="#2b2b2b"/>'), w: 80, h: 80 },
      { id: 'love', name: 'Love', svg: face('#FF9BD2', '<path d="M32 60q18 16 36 0" fill="none" stroke="#2b2b2b" stroke-width="4" stroke-linecap="round"/>', '<path d="M30 30c-6-6-14 2-6 8l6 5 6-5c8-6 0-14-6-8ZM70 30c-6-6-14 2-6 8l6 5 6-5c8-6 0-14-6-8Z" fill="#E5484D"/>'), w: 80, h: 80 },
      { id: 'coffee', name: 'Coffee', svg: COFFEE, w: 84, h: 84 },
      { id: 'rocket', name: 'Rocket', svg: ROCKET, w: 84, h: 84 },
      { id: 'sun', name: 'Sun', svg: SUN, w: 84, h: 84 },
      { id: 'cloud', name: 'Cloud', svg: CLOUD, w: 100, h: 66 },
      { id: 'flower', name: 'Flower', svg: FLOWER, w: 84, h: 84 }
    ]
  }
]

// ── animated ("GIFs"): SVG with declarative animation, which runs inside <image> ──
const anim = (body: string, vb = '0 0 100 100'): string => S(vb, body)
export const GIF_STICKERS: StickerDef[] = [
  { id: 'gif-heart', name: 'Beating heart', w: 90, h: 90, svg: anim(`<g transform-origin="50 50"><animateTransform attributeName="transform" type="scale" values="1;1.14;1;1.08;1" dur="1.1s" repeatCount="indefinite"/>${HEART.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`) },
  { id: 'gif-star', name: 'Spinning star', w: 90, h: 90, svg: anim(`<g><animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="3s" repeatCount="indefinite"/>${STAR.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`) },
  { id: 'gif-check', name: 'Pop check', w: 80, h: 80, svg: anim(`<circle cx="50" cy="50" r="44" fill="#30A46C" stroke="#2b2b2b" stroke-width="3.5"/><path d="m28 51 15 15 30-31" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="70" stroke-dashoffset="70"><animate attributeName="stroke-dashoffset" values="70;0;0;70" keyTimes="0;.35;.85;1" dur="2s" repeatCount="indefinite"/></path>`) },
  { id: 'gif-sparkle', name: 'Sparkles', w: 90, h: 90, svg: anim(['M30 20', 'M70 34', 'M44 70'].map((m, i) => `<path d="${m}c1.5 7 3.5 9 10 10-6.5 1-8.5 3-10 10-1.5-7-3.5-9-10-10 6.5-1 8.5-3 10-10Z" fill="#FFD43B" stroke="#2b2b2b" stroke-width="2.5" stroke-linejoin="round" opacity="0"><animate attributeName="opacity" values="0;1;0" dur="1.5s" begin="${i * 0.5}s" repeatCount="indefinite"/></path>`).join('')) },
  { id: 'gif-bulb', name: 'Bright idea', w: 90, h: 90, svg: anim(`<circle cx="50" cy="40" r="34" fill="#FFE24D" opacity=".0"><animate attributeName="opacity" values="0;.45;0" dur="1.4s" repeatCount="indefinite"/></circle>${BULB.replace(/^<svg[^>]*>|<\/svg>$/g, '')}`) },
  { id: 'gif-clock', name: 'Ticking clock', w: 80, h: 80, svg: anim(`<circle cx="50" cy="50" r="42" fill="#fff" stroke="#2b2b2b" stroke-width="3.5"/><path d="M50 50V22" stroke="#2b2b2b" stroke-width="5" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="4s" repeatCount="indefinite"/></path><path d="M50 50h18" stroke="#E5484D" stroke-width="4" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="48s" repeatCount="indefinite"/></path><circle cx="50" cy="50" r="4" fill="#2b2b2b"/>`) },
  { id: 'gif-rocket', name: 'Lift-off', w: 84, h: 84, svg: anim(`<g><animateTransform attributeName="transform" type="translate" values="0 4;0 -4;0 4" dur=".6s" repeatCount="indefinite"/>${ROCKET.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`) },
  { id: 'gif-wave', name: 'Hello wave', w: 120, h: 60, svg: anim(`<text x="60" y="40" text-anchor="middle" ${FONT} font-size="30" font-weight="800" fill="#0C8CF3">Hello!<animate attributeName="fill" values="#0C8CF3;#D6409F;#30A46C;#0C8CF3" dur="3s" repeatCount="indefinite"/></text>`, '0 0 120 60') }
]

// ───────────────────────── starter Elements ─────────────────────────
let n = 0
const id = (): string => `el-${n++}`
const shape = (s: Partial<Extract<PageObject, { type: 'shape' }>> & { shape: Extract<PageObject, { type: 'shape' }>['shape'] }): PageObject =>
  ({ id: id(), type: 'shape', x: 0, y: 0, w: 0, h: 0, stroke: '#1F2430', fill: null, width: 2, dash: false, ...s }) as PageObject
const text = (x: number, y: number, w: number, html: string, size = 16, extra: Record<string, unknown> = {}): PageObject =>
  ({ id: id(), type: 'text', x, y, w, h: size * 1.6 + 8, html, size, font: 'sans', color: '#1F2430', align: 'center', bg: null, ...extra }) as PageObject

const arrow = (x1: number, y1: number, x2: number, y2: number, stroke = '#1F2430', width = 2.4): PageObject =>
  shape({ shape: 'arrow', x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), points: [x1, y1, x2, y2], stroke, width })

export const STARTER_ELEMENTS: ElementCollection[] = [
  {
    id: 'starter-arrows',
    name: 'Arrows',
    items: [
      { id: 'a1', name: 'Right arrow', w: 160, h: 20, objects: [arrow(4, 10, 156, 10)] },
      { id: 'a2', name: 'Down arrow', w: 20, h: 120, objects: [arrow(10, 4, 10, 116)] },
      { id: 'a3', name: 'Diagonal arrow', w: 120, h: 90, objects: [arrow(6, 84, 114, 6, '#0C8CF3', 3)] },
      { id: 'a4', name: 'Two-way', w: 160, h: 20, objects: [arrow(80, 10, 156, 10), arrow(80, 10, 4, 10)] }
    ]
  },
  {
    id: 'starter-dividers',
    name: 'Dividers',
    items: [
      { id: 'd1', name: 'Line', w: 400, h: 10, objects: [shape({ shape: 'line', x: 0, y: 5, w: 400, h: 0, points: [0, 5, 400, 5], stroke: '#AEB6C5', width: 1.5 })] },
      { id: 'd2', name: 'Dashed', w: 400, h: 10, objects: [shape({ shape: 'line', x: 0, y: 5, w: 400, h: 0, points: [0, 5, 400, 5], stroke: '#AEB6C5', width: 1.5, dash: true })] },
      {
        id: 'd3', name: 'Dots', w: 400, h: 12,
        objects: [shape({ shape: 'line', x: 0, y: 6, w: 180, h: 0, points: [0, 6, 180, 6], stroke: '#AEB6C5', width: 1.5 }), shape({ shape: 'ellipse', x: 194, y: 0, w: 12, h: 12, stroke: '#8E4EC6', fill: '#8E4EC6', width: 1 }), shape({ shape: 'line', x: 220, y: 6, w: 180, h: 0, points: [220, 6, 400, 6], stroke: '#AEB6C5', width: 1.5 })]
      }
    ]
  },
  {
    id: 'starter-banners',
    name: 'Banners',
    items: [
      { id: 'b1', name: 'Title banner', w: 360, h: 56, objects: [shape({ shape: 'rect', x: 0, y: 0, w: 360, h: 56, stroke: '#0C8CF3', fill: '#0C8CF31f', width: 2 }), text(0, 12, 360, '<b>Title</b>', 22)] },
      { id: 'b2', name: 'Section header', w: 320, h: 44, objects: [shape({ shape: 'rect', x: 0, y: 0, w: 320, h: 44, stroke: '#30A46C', fill: '#30A46C', width: 1 }), text(0, 8, 320, '<b>Section</b>', 18, { color: '#ffffff' })] },
      { id: 'b3', name: 'Callout', w: 300, h: 90, objects: [shape({ shape: 'rect', x: 0, y: 0, w: 300, h: 90, stroke: '#F76B15', fill: '#FFB2241f', width: 2, dash: true }), text(12, 10, 276, '💡 <b>Remember</b><br>Write the key idea here', 15, { align: 'left' })] }
    ]
  },
  {
    id: 'starter-diagrams',
    name: 'Diagrams',
    items: [
      {
        id: 'g1', name: 'Flow (3 steps)', w: 420, h: 70,
        objects: [
          shape({ shape: 'rect', x: 0, y: 10, w: 110, h: 50, stroke: '#1F2430', fill: '#BFD7FF', width: 2 }), text(0, 22, 110, 'Step 1', 15),
          arrow(114, 35, 152, 35),
          shape({ shape: 'rect', x: 155, y: 10, w: 110, h: 50, stroke: '#1F2430', fill: '#C9F0B8', width: 2 }), text(155, 22, 110, 'Step 2', 15),
          arrow(269, 35, 307, 35),
          shape({ shape: 'rect', x: 310, y: 10, w: 110, h: 50, stroke: '#1F2430', fill: '#FFF3A6', width: 2 }), text(310, 22, 110, 'Step 3', 15)
        ]
      },
      {
        id: 'g2', name: 'Venn', w: 260, h: 170,
        objects: [shape({ shape: 'ellipse', x: 0, y: 0, w: 160, h: 160, stroke: '#0C8CF3', fill: '#0C8CF326', width: 2 }), shape({ shape: 'ellipse', x: 100, y: 0, w: 160, h: 160, stroke: '#D6409F', fill: '#D6409F26', width: 2 })]
      },
      {
        id: 'g3', name: 'Mind map', w: 360, h: 220,
        objects: [
          ...[[20, 20], [240, 20], [20, 170], [240, 170]].map(([x, y]) => shape({ shape: 'line', x: 0, y: 0, w: 0, h: 0, points: [180, 110, x + 50, y + 18], stroke: '#7A7A7A', width: 1.6 })),
          ...[[20, 20], [240, 20], [20, 170], [240, 170]].flatMap(([x, y]) => [shape({ shape: 'rect', x, y, w: 100, h: 36, stroke: '#1F2430', fill: '#ffffff', width: 1.6 }), text(x, y + 5, 100, 'Idea', 14)]),
          shape({ shape: 'ellipse', x: 120, y: 80, w: 120, h: 60, stroke: '#1F2430', fill: '#FFE24D', width: 2 }),
          text(120, 97, 120, '<b>Topic</b>', 16)
        ]
      }
    ]
  }
]

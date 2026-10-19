/**
 * Marketplace catalogue: original planners, covers and sticker packs generated in code.
 * Everything is free; "Get" adds the item to the user's library (settings.owned).
 */
import { coverName } from '@shared/covers'
import type { PaperSpec } from '@shared/types'
import type { StickerDef, StickerPack } from '../editor/stickers'

export type MarketCategory = 'home' | 'work' | 'study' | 'life'
export type MarketKind = 'planner' | 'template' | 'cover' | 'stickers'

export interface MarketItem {
  id: string
  kind: MarketKind
  title: string
  creator: string
  tags: string[]
  likes: number
  cats: MarketCategory[]
  /** Planners/templates: the paper spec of a notebook created from it. */
  paper?: PaperSpec
  /** Covers: cover id from shared/covers. */
  cover?: string
  /** Sticker packs. */
  stickers?: StickerDef[]
  /** Hero banner colours. */
  tint: string
  isNew?: boolean
}

const P = (template: string, color: PaperSpec['color'] = 'white', orientation: PaperSpec['orientation'] = 'portrait'): PaperSpec => ({
  template, color, size: 'a4', orientation, style: 'standard', lang: 'en-US'
})

const svg = (vb: string, body: string): string => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`
const T = `font-family="Figtree, 'Segoe UI', sans-serif" font-weight="800"`

function stamp(text: string, color: string): StickerDef {
  return {
    id: `stamp-${text.toLowerCase().replace(/\W+/g, '-')}`,
    name: text,
    w: 120,
    h: 120,
    svg: svg('0 0 120 120', `<circle cx="60" cy="60" r="52" fill="none" stroke="${color}" stroke-width="5"/><circle cx="60" cy="60" r="44" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="4 4"/><text x="60" y="68" text-anchor="middle" ${T} font-size="${text.length > 6 ? 16 : 22}" fill="${color}" transform="rotate(-12 60 60)">${text}</text>`)
  }
}

function tab(text: string, color: string): StickerDef {
  return {
    id: `tab-${text.toLowerCase()}`,
    name: `${text} tab`,
    w: 70,
    h: 36,
    svg: svg('0 0 100 50', `<path d="M4 6h80l12 19-12 19H4Z" fill="${color}"/><text x="44" y="32" text-anchor="middle" ${T} font-size="17" fill="#fff">${text}</text>`)
  }
}

function weather(kind: 'sun' | 'rain' | 'snow' | 'cloud'): StickerDef {
  const cloud = '<path d="M28 66a17 17 0 0 1-1-34 22 22 0 0 1 41-5 16 16 0 0 1 11 30 11 11 0 0 1-3 9Z" fill="#fff" stroke="#2b2b2b" stroke-width="3"/>'
  const body =
    kind === 'sun'
      ? '<circle cx="50" cy="50" r="20" fill="#FFB224" stroke="#2b2b2b" stroke-width="3"/><g stroke="#F76B15" stroke-width="4" stroke-linecap="round"><path d="M50 8v10M50 82v10M8 50h10M82 50h10M20 20l7 7M73 73l7 7M20 80l7-7M73 27l7-7"/></g>'
      : kind === 'rain'
        ? cloud + '<g stroke="#0C8CF3" stroke-width="4" stroke-linecap="round"><path d="M34 76l-4 10M50 76l-4 10M66 76l-4 10"/></g>'
        : kind === 'snow'
          ? cloud + '<g fill="#8EC5FF"><circle cx="34" cy="82" r="4"/><circle cx="52" cy="86" r="4"/><circle cx="68" cy="80" r="4"/></g>'
          : cloud
  return { id: `weather-${kind}`, name: kind, w: 70, h: 70, svg: svg('0 0 100 100', body) }
}

function habitDot(color: string, i: number): StickerDef {
  return { id: `dot-${i}`, name: 'Dot', w: 28, h: 28, svg: svg('0 0 40 40', `<circle cx="20" cy="20" r="16" fill="${color}"/><circle cx="14" cy="14" r="5" fill="#fff" opacity=".4"/>`) }
}

function fruit(kind: 'apple' | 'cherry' | 'lemon' | 'pear'): StickerDef {
  const b: Record<typeof kind, string> = {
    apple: '<path d="M50 30c-12-10-34-4-34 22 0 22 16 38 34 32 18 6 34-10 34-32 0-26-22-32-34-22Z" fill="#E5484D" stroke="#2b2b2b" stroke-width="3"/><path d="M50 30c0-10 4-16 10-20" stroke="#6E4A2E" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M54 20c8-8 18-6 20-2-6 6-14 6-20 2Z" fill="#30A46C"/>',
    cherry: '<path d="M36 64c4-24 12-40 28-52M66 66c-2-24 0-40-2-54" stroke="#2B7A0B" stroke-width="3.5" fill="none"/><circle cx="34" cy="70" r="16" fill="#D6409F" stroke="#2b2b2b" stroke-width="3"/><circle cx="66" cy="72" r="16" fill="#E5484D" stroke="#2b2b2b" stroke-width="3"/>',
    lemon: '<ellipse cx="50" cy="52" rx="36" ry="26" fill="#FFE24D" stroke="#2b2b2b" stroke-width="3" transform="rotate(-20 50 52)"/><path d="M80 30l8-6" stroke="#2b2b2b" stroke-width="3" stroke-linecap="round"/>',
    pear: '<path d="M50 18c10 0 12 14 14 22 2 10 20 16 20 34 0 14-14 22-34 22S16 88 16 74c0-18 18-24 20-34 2-8 4-22 14-22Z" fill="#7BE495" stroke="#2b2b2b" stroke-width="3"/><path d="M50 18c0-6 2-10 6-12" stroke="#6E4A2E" stroke-width="4" fill="none" stroke-linecap="round"/>'
  }
  return { id: `fruit-${kind}`, name: kind, w: 70, h: 70, svg: svg('0 0 100 100', b[kind]) }
}

export const MARKET: MarketItem[] = [
  // planners
  { id: 'mk-weekly-2027', kind: 'planner', title: 'Weekly Planner 2027', creator: 'Quillnote Studio', tags: ['Planner', 'Weekly'], likes: 4210, cats: ['home', 'work', 'life'], paper: P('weekly', 'white', 'landscape'), tint: '#4FC3DE', isNew: true },
  { id: 'mk-daily-2027', kind: 'planner', title: 'Daily Focus 2027', creator: 'Quillnote Studio', tags: ['Planner', 'Daily'], likes: 3188, cats: ['home', 'work'], paper: P('daily'), tint: '#86C7F9', isNew: true },
  { id: 'mk-monthly-2027', kind: 'planner', title: 'Monthly Overview 2027', creator: 'Quillnote Studio', tags: ['Planner', 'Monthly'], likes: 2950, cats: ['home', 'life'], paper: P('monthly', 'yellow', 'landscape'), tint: '#B6C174', isNew: true },
  { id: 'mk-habit', kind: 'planner', title: 'Habit Tracker', creator: 'Quillnote Studio', tags: ['Habits', 'Wellness'], likes: 2604, cats: ['home', 'life'], paper: P('habit'), tint: '#7BE495' },
  { id: 'mk-todo', kind: 'planner', title: 'Simple To-do', creator: 'Quillnote Studio', tags: ['Productivity'], likes: 2201, cats: ['home', 'work'], paper: P('todo', 'yellow'), tint: '#FFB224' },
  { id: 'mk-meeting', kind: 'planner', title: 'Meeting Notes', creator: 'Quillnote Studio', tags: ['Work', 'Meetings'], likes: 1876, cats: ['work'], paper: P('meeting'), tint: '#8E4EC6' },
  { id: 'mk-dark-weekly', kind: 'planner', title: 'Night Weekly', creator: 'Quillnote Studio', tags: ['Planner', 'Dark'], likes: 1422, cats: ['work', 'life'], paper: P('weekly', 'dark', 'landscape'), tint: '#26272B' },
  // templates
  { id: 'mk-cornell', kind: 'template', title: 'Cornell Lecture Notes', creator: 'Quillnote Studio', tags: ['Study', 'Notes'], likes: 5120, cats: ['home', 'study'], paper: P('cornell'), tint: '#0C8CF3' },
  { id: 'mk-graph', kind: 'template', title: 'Maths Grid', creator: 'Quillnote Studio', tags: ['Study', 'Maths'], likes: 3011, cats: ['study'], paper: P('squared'), tint: '#12A594' },
  { id: 'mk-dotted-journal', kind: 'template', title: 'Dotted Journal', creator: 'Quillnote Studio', tags: ['Journal'], likes: 2780, cats: ['home', 'life'], paper: P('dotted', 'yellow'), tint: '#F76B15' },
  { id: 'mk-legal', kind: 'template', title: 'Legal Pad', creator: 'Quillnote Studio', tags: ['Work', 'Notes'], likes: 1650, cats: ['work'], paper: P('legal', 'yellow'), tint: '#FFE24D' },
  { id: 'mk-two-col', kind: 'template', title: 'Two Column Study', creator: 'Quillnote Studio', tags: ['Study'], likes: 1204, cats: ['study'], paper: P('two-column'), tint: '#D6409F' },
  { id: 'mk-three-col', kind: 'template', title: 'Three Column Review', creator: 'Quillnote Studio', tags: ['Study', 'Review'], likes: 980, cats: ['study'], paper: P('three-column'), tint: '#8EC5FF' },
  { id: 'mk-staff', kind: 'template', title: 'Music Staff Paper', creator: 'Quillnote Studio', tags: ['Music'], likes: 874, cats: ['study', 'life'], paper: P('staff'), tint: '#434343' },
  { id: 'mk-tab', kind: 'template', title: 'Guitar Tab', creator: 'Quillnote Studio', tags: ['Music'], likes: 760, cats: ['life'], paper: P('guitar-tab'), tint: '#A0755A' },
  { id: 'mk-ruled-dark', kind: 'template', title: 'Ruled on Dark', creator: 'Quillnote Studio', tags: ['Dark', 'Notes'], likes: 690, cats: ['study', 'work'], paper: P('ruled-narrow', 'dark'), tint: '#2E2B2B' },
  // covers
  ...['ocean', 'forest', 'sunset', 'dusk', 'charcoal', 'blush', 'mint', 'navy'].map((c, i) => ({
    id: `mk-cover-${c}`, kind: 'cover' as const, title: `${coverName(c)} Cover`, creator: 'Quillnote Studio', tags: ['Cover'], likes: 600 + i * 97,
    cats: (i % 2 ? ['home', 'life'] : ['home', 'study']) as MarketCategory[], cover: c, tint: ['#0E7C86', '#2B7A0B', '#F76B15', '#C9A7F2', '#434343', '#FF9BD2', '#7CE2E0', '#0B3D91'][i]
  })),
  // sticker packs
  { id: 'mk-stamps', kind: 'stickers', title: 'Teacher Stamps', creator: 'Quillnote Studio', tags: ['Stickers', 'Study'], likes: 3320, cats: ['home', 'study'], tint: '#E5484D', isNew: true, stickers: [stamp('GREAT!', '#E5484D'), stamp('WELL DONE', '#30A46C'), stamp('A+', '#0C8CF3'), stamp('CHECK', '#8E4EC6'), stamp('WOW', '#F76B15'), stamp('REVISE', '#D6409F')] },
  { id: 'mk-tabs', kind: 'stickers', title: 'Index Tabs', creator: 'Quillnote Studio', tags: ['Stickers', 'Planner'], likes: 2120, cats: ['home', 'work'], tint: '#0C8CF3', stickers: [tab('JAN', '#E5484D'), tab('FEB', '#F76B15'), tab('MAR', '#FFB224'), tab('APR', '#30A46C'), tab('MAY', '#12A594'), tab('JUN', '#0C8CF3'), tab('JUL', '#4C2889'), tab('AUG', '#8E4EC6'), tab('SEP', '#D6409F'), tab('OCT', '#A0755A'), tab('NOV', '#434343'), tab('DEC', '#0B3D91')] },
  { id: 'mk-weather', kind: 'stickers', title: 'Weather', creator: 'Quillnote Studio', tags: ['Stickers', 'Journal'], likes: 1510, cats: ['life', 'home'], tint: '#8EC5FF', stickers: [weather('sun'), weather('cloud'), weather('rain'), weather('snow')] },
  { id: 'mk-dots', kind: 'stickers', title: 'Habit Dots', creator: 'Quillnote Studio', tags: ['Stickers', 'Habits'], likes: 1190, cats: ['life'], tint: '#7BE495', stickers: ['#E5484D', '#F76B15', '#FFB224', '#30A46C', '#0C8CF3', '#8E4EC6', '#D6409F', '#434343'].map(habitDot) },
  { id: 'mk-fruit', kind: 'stickers', title: 'Fruit Bowl', creator: 'Quillnote Studio', tags: ['Stickers', 'Fun'], likes: 980, cats: ['life', 'home'], tint: '#FF9BD2', stickers: [fruit('apple'), fruit('cherry'), fruit('lemon'), fruit('pear')] }
]

/** Sticker packs the user has added from the Marketplace. */
export function marketStickers(owned: string[]): StickerPack[] {
  return MARKET.filter((m) => m.kind === 'stickers' && owned.includes(m.id)).map((m) => ({ id: m.id, name: m.title, icon: m.title.slice(0, 1), items: m.stickers ?? [] }))
}

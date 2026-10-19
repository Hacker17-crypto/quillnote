/**
 * Notebook covers: 24 original designs generated as SVG (solid colours, linen,
 * gradients, minimal geometric patterns). Cover art is a 132×154 portrait notebook
 * with a pale page-edge spine on the left.
 */

export type CoverGroup = 'colors' | 'linen' | 'gradients' | 'patterns'

export interface CoverDef {
  id: string
  name: string
  group: CoverGroup
}

export const COVER_GROUPS: { id: CoverGroup; name: string }[] = [
  { id: 'colors', name: 'Colours' },
  { id: 'linen', name: 'Linen' },
  { id: 'gradients', name: 'Gradients' },
  { id: 'patterns', name: 'Patterns' }
]

const SOLID: Record<string, [string, string]> = {
  simple: ['Simple', '#B09F86'],
  navy: ['Midnight', '#2D3B5C'],
  forest: ['Forest', '#3F5E4B'],
  burgundy: ['Burgundy', '#7B2F40'],
  charcoal: ['Charcoal', '#3B3B41'],
  teal: ['Lagoon', '#2E7A83'],
  mustard: ['Mustard', '#D3A43F'],
  blush: ['Blush', '#E4B7B1']
}
const LINEN: Record<string, [string, string]> = {
  'linen-sand': ['Sand Linen', '#CDBB9C'],
  'linen-sage': ['Sage Linen', '#A5B79A'],
  'linen-slate': ['Slate Linen', '#6F7F94'],
  'linen-rose': ['Rose Linen', '#C99A98']
}
const GRADIENT: Record<string, [string, string, string]> = {
  sunset: ['Sunset', '#FF9A5C', '#E4508C'],
  ocean: ['Ocean', '#58C2EE', '#2B55CF'],
  aurora: ['Aurora', '#6EE7B7', '#4F7BF0'],
  dusk: ['Dusk', '#8F63F2', '#EC4899'],
  mint: ['Mint', '#C2F3DE', '#55BFA0'],
  peach: ['Peach', '#FFD6AE', '#F0868F']
}
const PATTERN: Record<string, [string, string, string]> = {
  dots: ['Dots', '#2F4B6E', '#8FB5E3'],
  stripes: ['Stripes', '#E9DFC9', '#C46A55'],
  waves: ['Waves', '#1F5F6B', '#8ED6D0'],
  triangles: ['Triangles', '#F1E4C8', '#2E6F73'],
  arcs: ['Arcs', '#5B3A66', '#F0B6C8'],
  diamonds: ['Diamonds', '#33423A', '#C7D8A8']
}

export const COVERS: CoverDef[] = [
  ...Object.entries(SOLID).map(([id, v]) => ({ id, name: v[0], group: 'colors' as const })),
  ...Object.entries(LINEN).map(([id, v]) => ({ id, name: v[0], group: 'linen' as const })),
  ...Object.entries(GRADIENT).map(([id, v]) => ({ id, name: v[0], group: 'gradients' as const })),
  ...Object.entries(PATTERN).map(([id, v]) => ({ id, name: v[0], group: 'patterns' as const }))
]

export const DEFAULT_COVER = 'simple'

export function coverName(id: string | null | undefined): string {
  return COVERS.find((c) => c.id === id)?.name ?? 'Simple'
}

// ───────────────────────── Rendering ─────────────────────────
const W = 132
const H = 154
const SP = 10 // spine width
const R = 8 // outer corner radius
const BODY = `M${SP} 0H${W - R}Q${W} 0 ${W} ${R}V${H - R}Q${W} ${H} ${W - R} ${H}H${SP}Z`

const f = (v: number): string => String(Math.round(v * 10) / 10)

function luminance(hex: string): number {
  const v = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(v >> 16) & 255, (v >> 8) & 255, v & 255]
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

/** Title rule + small "notes" lines in the bottom-right, tinted for contrast. */
function furniture(ink: string): string {
  return (
    `<path d="M28 50H116" stroke="${ink}" stroke-width="1.2"/>` +
    `<path d="M94 118H120M94 126H120M94 134H116" stroke="${ink}" stroke-width="1" opacity=".8"/>` +
    `<path d="M114 133l5-3" stroke="${ink}" stroke-width="1"/>`
  )
}

function patternArt(id: string, base: string, accent: string): string {
  const bits: string[] = [`<rect x="${SP}" width="${W - SP}" height="${H}" fill="${base}"/>`]
  switch (id) {
    case 'dots': {
      for (let y = 10; y < H; y += 14)
        for (let x = SP + 8 + ((y / 14) % 2 ? 7 : 0); x < W; x += 14)
          bits.push(`<circle cx="${x}" cy="${y}" r="2.4" fill="${accent}" opacity=".85"/>`)
      break
    }
    case 'stripes': {
      for (let x = -H; x < W + H; x += 14)
        bits.push(`<path d="M${x} ${H}L${x + H} 0" stroke="${accent}" stroke-width="5" opacity=".9"/>`)
      break
    }
    case 'waves': {
      for (let y = 10; y < H + 8; y += 12) {
        let d = `M${SP} ${y}`
        for (let x = SP; x < W; x += 16) d += `q4 -6 8 0t8 0`
        bits.push(`<path d="${d}" fill="none" stroke="${accent}" stroke-width="1.6" opacity=".85"/>`)
      }
      break
    }
    case 'triangles': {
      for (let row = 0; row < 8; row++)
        for (let col = 0; col < 7; col++) {
          const x = SP + col * 18 - (row % 2 ? 9 : 0)
          const y = row * 20 + 6
          bits.push(`<path d="M${x} ${y + 16}L${x + 9} ${y}L${x + 18} ${y + 16}Z" fill="${accent}" opacity="${(row + col) % 3 ? 0.9 : 0.45}"/>`)
        }
      break
    }
    case 'arcs': {
      for (let r = 14; r < 190; r += 14)
        bits.push(`<circle cx="${W}" cy="${H}" r="${r}" fill="none" stroke="${accent}" stroke-width="3" opacity="${f(0.95 - r / 260)}"/>`)
      break
    }
    case 'diamonds': {
      for (let row = 0; row < 12; row++)
        for (let col = 0; col < 8; col++) {
          const cx = SP + 8 + col * 16 + (row % 2 ? 8 : 0)
          const cy = 6 + row * 13
          bits.push(`<path d="M${cx} ${cy - 6}L${cx + 6} ${cy}L${cx} ${cy + 6}L${cx - 6} ${cy}Z" fill="${accent}" opacity="${(row + col) % 2 ? 0.85 : 0.4}"/>`)
        }
      break
    }
  }
  // label plate so patterns stay tidy behind a (future) title
  bits.push(`<rect x="34" y="52" width="76" height="34" rx="4" fill="${base}" opacity=".92"/>`)
  bits.push(`<path d="M44 64H100M44 74H84" stroke="${accent}" stroke-width="1.4" opacity=".9"/>`)
  return bits.join('')
}

/** SVG markup for a cover (viewBox 132×154). */
export function coverSvg(id: string): string {
  const uid = `qc-${id}`
  let defs = `<clipPath id="${uid}-body"><path d="${BODY}"/></clipPath>`
  let art = ''
  let ink = 'rgba(0,0,0,.3)'

  if (SOLID[id]) {
    const base = SOLID[id][1]
    ink = luminance(base) > 0.62 ? 'rgba(0,0,0,.3)' : 'rgba(255,255,255,.45)'
    art = `<rect x="${SP}" width="${W - SP}" height="${H}" fill="${base}"/>${furniture(ink)}`
  } else if (LINEN[id]) {
    const base = LINEN[id][1]
    ink = luminance(base) > 0.62 ? 'rgba(0,0,0,.28)' : 'rgba(255,255,255,.45)'
    defs +=
      `<filter id="${uid}-fx" x="0" y="0" width="${W}" height="${H}" filterUnits="userSpaceOnUse">` +
      `<feTurbulence type="fractalNoise" baseFrequency="0.9 0.12" numOctaves="2" seed="4" result="a"/>` +
      `<feColorMatrix in="a" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .9 -.28"/></filter>` +
      `<filter id="${uid}-fy" x="0" y="0" width="${W}" height="${H}" filterUnits="userSpaceOnUse">` +
      `<feTurbulence type="fractalNoise" baseFrequency="0.12 0.9" numOctaves="2" seed="9" result="a"/>` +
      `<feColorMatrix in="a" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 -.3"/></filter>`
    art =
      `<rect x="${SP}" width="${W - SP}" height="${H}" fill="${base}"/>` +
      `<rect x="${SP}" width="${W - SP}" height="${H}" filter="url(#${uid}-fx)" opacity=".22"/>` +
      `<rect x="${SP}" width="${W - SP}" height="${H}" filter="url(#${uid}-fy)" opacity=".28"/>` +
      `<rect x="${SP + 6}" y="32" width="${W - SP - 12}" height="46" rx="3" fill="${base}" opacity=".0"/>` +
      furniture(ink)
  } else if (GRADIENT[id]) {
    const [, a, b] = GRADIENT[id]
    ink = luminance(a) > 0.68 ? 'rgba(0,0,0,.28)' : 'rgba(255,255,255,.6)'
    defs += `<linearGradient id="${uid}-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
    art = `<rect x="${SP}" width="${W - SP}" height="${H}" fill="url(#${uid}-g)"/>${furniture(ink)}`
  } else if (PATTERN[id]) {
    const [, base, accent] = PATTERN[id]
    art = patternArt(id, base, accent)
  } else {
    return coverSvg(DEFAULT_COVER)
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="none">` +
    `<defs>${defs}</defs>` +
    `<path d="M0 0H${SP + 2}V${H}H0Z" fill="#F6F3EC"/>` +
    `<g clip-path="url(#${uid}-body)">${art}` +
    `<rect x="${SP}" width="3.5" height="${H}" fill="#000" opacity=".16"/>` +
    `<rect x="${W - 2.5}" width="2.5" height="${H}" fill="#fff" opacity=".28"/></g>` +
    `</svg>`
  )
}

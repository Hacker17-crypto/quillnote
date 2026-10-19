/**
 * Procedural paper templates. Every template is drawn in code as an SVG string,
 * at A4 / Letter / widescreen sizes, in portrait or landscape, in three paper colours
 * and three line-weight styles. Pure functions: usable from main (PDF export) and renderer.
 *
 * Note: <text> uses the Figtree family. Inline SVG in the renderer picks up the bundled
 * font; SVG used as an <img> will fall back to a system sans.
 */
import type { Orientation, PageSize, PaperColor, PaperSpec, PaperStyle } from './types'

// ───────────────────────── Catalogue ─────────────────────────
export type PaperGroupId = 'essentials' | 'writing' | 'planner' | 'music'

export interface PaperTemplate {
  id: string
  name: string
  group: PaperGroupId
}

export const PAPER_GROUPS: { id: PaperGroupId; name: string }[] = [
  { id: 'essentials', name: 'Essentials' },
  { id: 'writing', name: 'Writing papers' },
  { id: 'planner', name: 'Planner' },
  { id: 'music', name: 'Music' }
]

export const PAPER_TEMPLATES: PaperTemplate[] = [
  { id: 'blank', name: 'Blank', group: 'essentials' },
  { id: 'dotted', name: 'Dotted Paper', group: 'essentials' },
  { id: 'ruled-narrow', name: 'Ruled Narrow', group: 'essentials' },
  { id: 'ruled-wide', name: 'Ruled Wide', group: 'essentials' },
  { id: 'squared', name: 'Squared Paper', group: 'essentials' },
  { id: 'cornell', name: 'Cornell', group: 'writing' },
  { id: 'legal', name: 'Legal', group: 'writing' },
  { id: 'single-column', name: 'Single Column', group: 'writing' },
  { id: 'single-column-mix', name: 'Single Column Mix', group: 'writing' },
  { id: 'three-column', name: 'Three Column', group: 'writing' },
  { id: 'two-column', name: 'Two Column', group: 'writing' },
  { id: 'daily', name: 'Daily Planner', group: 'planner' },
  { id: 'weekly', name: 'Weekly Planner', group: 'planner' },
  { id: 'monthly', name: 'Monthly Planner', group: 'planner' },
  { id: 'todo', name: 'To-do List', group: 'planner' },
  { id: 'habit', name: 'Habit Tracker', group: 'planner' },
  { id: 'meeting', name: 'Meeting Notes', group: 'planner' },
  { id: 'staff', name: 'Staff Paper', group: 'music' },
  { id: 'guitar-tab', name: 'Guitar Tab', group: 'music' }
]

export function templateName(id: string): string {
  return PAPER_TEMPLATES.find((t) => t.id === id)?.name ?? 'Paper'
}

export const PAPER_COLORS: { id: PaperColor; name: string; swatch: string }[] = [
  { id: 'white', name: 'White Paper', swatch: '#FFFFFF' },
  { id: 'yellow', name: 'Yellow Paper', swatch: '#F8F7E9' },
  { id: 'dark', name: 'Dark Paper', swatch: '#26272B' }
]

export const PAPER_STYLES: { id: PaperStyle; name: string }[] = [
  { id: 'standard', name: 'Quillnote Standard' },
  { id: 'fine', name: 'Quillnote Fine' },
  { id: 'bold', name: 'Quillnote Bold' }
]

export const PAPER_SIZES: { id: PageSize; name: string; w: number; h: number }[] = [
  { id: 'a4', name: 'A4', w: 595, h: 842 },
  { id: 'letter', name: 'Letter', w: 612, h: 792 },
  { id: 'wide', name: 'Widescreen', w: 540, h: 960 }
]

export const PAPER_LANGUAGES: { id: string; name: string }[] = [
  { id: 'en-US', name: 'English (US)' },
  { id: 'en-GB', name: 'English (UK)' },
  { id: 'es', name: 'Español' },
  { id: 'fr', name: 'Français' },
  { id: 'de', name: 'Deutsch' },
  { id: 'it', name: 'Italiano' },
  { id: 'pt', name: 'Português' }
]

export const DEFAULT_PAPER: PaperSpec = {
  template: 'squared',
  color: 'yellow',
  size: 'a4',
  orientation: 'portrait',
  style: 'standard',
  lang: 'en-US'
}

/** Page size in points for a size + orientation. */
export function pageDims(size: PageSize, orientation: Orientation): { w: number; h: number } {
  const s = PAPER_SIZES.find((p) => p.id === size) ?? PAPER_SIZES[0]
  return orientation === 'portrait' ? { w: s.w, h: s.h } : { w: s.h, h: s.w }
}

// ───────────────────────── Colours & labels ─────────────────────────
interface Scheme {
  bg: string
  line: string
  strong: string
  accent: string
  text: string
  fill: string
}

const SCHEMES: Record<PaperColor, Scheme> = {
  white: { bg: '#FFFFFF', line: '#D7DCE6', strong: '#AEB6C5', accent: '#E58A92', text: '#7A8396', fill: '#F3F5F9' },
  yellow: { bg: '#F8F7E9', line: '#DEDDC9', strong: '#B9B7A0', accent: '#E3A0A0', text: '#85836D', fill: '#EFEEDA' },
  dark: { bg: '#26272B', line: '#3A3C43', strong: '#555964', accent: '#B85C66', text: '#8E929E', fill: '#2F3136' }
}

export function paperBackground(color: PaperColor): string {
  return SCHEMES[color].bg
}

const STYLE_WEIGHT: Record<PaperStyle, number> = { standard: 1, fine: 0.62, bold: 1.6 }

type LabelKey =
  | 'daily' | 'schedule' | 'priorities' | 'todo' | 'notes' | 'date' | 'weekOf' | 'month'
  | 'habitTracker' | 'habit' | 'meeting' | 'title' | 'attendees' | 'agenda' | 'actions'
  | 'cue' | 'summary'

const LABELS: Record<string, Record<LabelKey, string>> = {
  en: { daily: 'Daily', schedule: 'Schedule', priorities: 'Priorities', todo: 'To-do', notes: 'Notes', date: 'Date', weekOf: 'Week of', month: 'Month', habitTracker: 'Habit tracker', habit: 'Habit', meeting: 'Meeting notes', title: 'Title', attendees: 'Attendees', agenda: 'Agenda', actions: 'Action items', cue: 'Cues', summary: 'Summary' },
  es: { daily: 'Diario', schedule: 'Horario', priorities: 'Prioridades', todo: 'Tareas', notes: 'Notas', date: 'Fecha', weekOf: 'Semana del', month: 'Mes', habitTracker: 'Seguimiento de hábitos', habit: 'Hábito', meeting: 'Notas de reunión', title: 'Título', attendees: 'Asistentes', agenda: 'Agenda', actions: 'Acciones', cue: 'Pistas', summary: 'Resumen' },
  fr: { daily: 'Quotidien', schedule: 'Horaires', priorities: 'Priorités', todo: 'À faire', notes: 'Notes', date: 'Date', weekOf: 'Semaine du', month: 'Mois', habitTracker: 'Suivi des habitudes', habit: 'Habitude', meeting: 'Notes de réunion', title: 'Titre', attendees: 'Participants', agenda: 'Ordre du jour', actions: 'Actions', cue: 'Repères', summary: 'Résumé' },
  de: { daily: 'Tag', schedule: 'Zeitplan', priorities: 'Prioritäten', todo: 'Aufgaben', notes: 'Notizen', date: 'Datum', weekOf: 'Woche vom', month: 'Monat', habitTracker: 'Gewohnheiten', habit: 'Gewohnheit', meeting: 'Besprechungsnotizen', title: 'Titel', attendees: 'Teilnehmer', agenda: 'Agenda', actions: 'Maßnahmen', cue: 'Stichworte', summary: 'Zusammenfassung' },
  it: { daily: 'Giorno', schedule: 'Programma', priorities: 'Priorità', todo: 'Da fare', notes: 'Appunti', date: 'Data', weekOf: 'Settimana del', month: 'Mese', habitTracker: 'Tracker abitudini', habit: 'Abitudine', meeting: 'Note riunione', title: 'Titolo', attendees: 'Partecipanti', agenda: 'Ordine del giorno', actions: 'Azioni', cue: 'Spunti', summary: 'Riepilogo' },
  pt: { daily: 'Diário', schedule: 'Horário', priorities: 'Prioridades', todo: 'Tarefas', notes: 'Notas', date: 'Data', weekOf: 'Semana de', month: 'Mês', habitTracker: 'Hábitos', habit: 'Hábito', meeting: 'Notas de reunião', title: 'Título', attendees: 'Participantes', agenda: 'Pauta', actions: 'Ações', cue: 'Pistas', summary: 'Resumo' }
}

function labelsFor(lang: string): Record<LabelKey, string> {
  return LABELS[lang] ?? LABELS[lang.split('-')[0]] ?? LABELS.en
}

function weekdayNames(lang: string, style: 'long' | 'short'): string[] {
  const fmt = new Intl.DateTimeFormat(lang, { weekday: style })
  // 2024-01-07 is a Sunday
  const names = Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 7 + i)))
  const sundayFirst = lang === 'en-US'
  return sundayFirst ? names : [...names.slice(1), names[0]]
}

// ───────────────────────── Drawing helpers ─────────────────────────
const n = (v: number): string => String(Math.round(v * 100) / 100)

class Canvas {
  private body: string[] = []
  constructor(
    readonly w: number,
    readonly h: number,
    readonly c: Scheme,
    readonly k: number,
    readonly L: Record<LabelKey, string>,
    readonly lang: string
  ) {}

  /** Stroke an arbitrary path. */
  path(d: string, color: string, width = 0.7, extra = ''): void {
    if (!d) return
    this.body.push(
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(width * this.k)}" ${extra}/>`
    )
  }
  light(d: string, width = 0.7): void {
    this.path(d, this.c.line, width)
  }
  strong(d: string, width = 1): void {
    this.path(d, this.c.strong, width)
  }
  rect(x: number, y: number, w: number, h: number, opts: { r?: number; fill?: string; stroke?: string; sw?: number } = {}): void {
    this.body.push(
      `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${opts.r ?? 0}" fill="${opts.fill ?? 'none'}" stroke="${opts.stroke ?? 'none'}" stroke-width="${n((opts.sw ?? 1) * this.k)}"/>`
    )
  }
  text(s: string, x: number, y: number, size: number, opts: { weight?: number; anchor?: 'start' | 'middle' | 'end'; fill?: string; spacing?: number } = {}): void {
    const esc = s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    this.body.push(
      `<text x="${n(x)}" y="${n(y)}" font-family="Figtree, 'Segoe UI', Arial, sans-serif" font-size="${size}" font-weight="${opts.weight ?? 500}" text-anchor="${opts.anchor ?? 'start'}" fill="${opts.fill ?? this.c.text}"${opts.spacing ? ` letter-spacing="${opts.spacing}"` : ''}>${esc}</text>`
    )
  }
  circle(cx: number, cy: number, r: number, color: string, width = 0.9): void {
    this.body.push(
      `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="none" stroke="${color}" stroke-width="${n(width * this.k)}"/>`
    )
  }

  /** Horizontal rule lines between y0 and y1 every `step`, from x0 to x1. */
  hlines(x0: number, x1: number, y0: number, y1: number, step: number): string {
    let d = ''
    for (let y = y0; y <= y1 + 0.01; y += step) d += `M${n(x0)} ${n(y)}H${n(x1)}`
    return d
  }
  vlines(y0: number, y1: number, x0: number, x1: number, step: number): string {
    let d = ''
    for (let x = x0; x <= x1 + 0.01; x += step) d += `M${n(x)} ${n(y0)}V${n(y1)}`
    return d
  }
  /** Row of checkbox squares + lines for lists. */
  checklist(x: number, y: number, w: number, rows: number, step: number, round = false): void {
    let boxes = ''
    let lines = ''
    for (let i = 0; i < rows; i++) {
      const yy = y + i * step
      lines += `M${n(x + 18)} ${n(yy)}H${n(x + w)}`
      if (round) this.circle(x + 6, yy - 6, 4.2, this.c.strong, 0.8)
      else boxes += `M${n(x + 2)} ${n(yy - 10)}h8v8h-8z`
    }
    this.light(lines)
    if (boxes) this.strong(boxes, 0.8)
  }

  toSvg(width?: number, height?: number): string {
    const size = width && height ? ` width="${n(width)}pt" height="${n(height)}pt"` : ' width="100%" height="100%"'
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.w} ${this.h}"${size} preserveAspectRatio="xMidYMid meet" shape-rendering="geometricPrecision"><rect width="${this.w}" height="${this.h}" fill="${this.c.bg}"/>${this.body.join('')}</svg>`
  }
}

// ───────────────────────── Templates ─────────────────────────
type Draw = (g: Canvas) => void

function ruled(step: number, top = 56): Draw {
  return (g) => {
    const y0 = Math.ceil(top / step) * step
    g.light(g.hlines(0, g.w, y0, g.h - 28, step))
  }
}

const TEMPLATE_DRAW: Record<string, Draw> = {
  blank: () => {},

  dotted: (g) => {
    const step = 20
    let d = ''
    for (let y = 30; y < g.h - 20; y += step) for (let x = 30; x < g.w - 20; x += step) d += `M${x} ${y}h.01`
    g.path(d, g.c.strong, 1.5, 'stroke-linecap="round"')
  },

  'ruled-narrow': ruled(17),
  'ruled-wide': ruled(25, 60),

  squared: (g) => {
    const step = 14
    const x0 = (g.w % step) / 2
    const y0 = (g.h % step) / 2
    g.light(g.vlines(0, g.h, x0, g.w, step) + g.hlines(0, g.w, y0, g.h, step), 0.55)
  },

  cornell: (g) => {
    const cueX = Math.round(g.w * 0.27)
    const top = 76
    const sumY = g.h - Math.round(g.h * 0.17)
    g.light(g.hlines(cueX, g.w, top + 24, sumY - 4, 24))
    g.light(g.hlines(0, g.w, sumY + 24, g.h - 24, 24))
    g.strong(`M0 ${top}H${g.w}M${cueX} ${top}V${sumY}M0 ${sumY}H${g.w}`, 1.1)
    g.text(g.L.cue, 22, top - 14, 11, { weight: 600 })
    g.text(g.L.notes, cueX + 16, top - 14, 11, { weight: 600 })
    g.text(g.L.summary, 22, sumY + 18, 11, { weight: 600 })
  },

  legal: (g) => {
    g.light(g.hlines(0, g.w, 88, g.h - 28, 25))
    g.strong(`M0 62H${g.w}`, 1)
    g.path(`M84 0V${g.h}M88 0V${g.h}`, g.c.accent, 0.9)
  },

  'single-column': (g) => {
    const m = 48
    g.light(g.hlines(m, g.w - m, 76, g.h - 40, 18))
    g.strong(`M${m} 60H${g.w - m}`, 1)
    g.light(`M${m} 60V${g.h - 30}M${g.w - m} 60V${g.h - 30}`, 0.8)
  },

  'single-column-mix': (g) => {
    const m = 40
    const split = Math.round(g.h * 0.38)
    g.strong(`M${m} 62H${g.w - m}`, 1)
    // squared sketch zone, then ruled writing zone
    g.light(g.vlines(62, split, m, g.w - m, 14) + g.hlines(m, g.w - m, 62, split, 14), 0.5)
    g.strong(`M${m} ${split}H${g.w - m}`, 1)
    g.light(g.hlines(m, g.w - m, split + 22, g.h - 40, 20))
  },

  'two-column': (g) => columns(g, 2),
  'three-column': (g) => columns(g, 3),

  daily: (g) => {
    const m = 40
    const L = g.L
    g.text(L.daily, m, 62, 28, { weight: 700, fill: g.c.strong })
    g.text(L.date, g.w - 230, 60, 11, { weight: 600 })
    g.strong(`M${g.w - 200} 62H${g.w - m}`, 0.9)
    const split = Math.round(g.w * 0.56)
    const top = 100
    const bottom = g.h - 40
    // schedule: hourly rows
    g.text(L.schedule, m, top - 8, 11, { weight: 600 })
    const hours = 17
    const step = (bottom - top) / hours
    let rows = ''
    for (let i = 0; i <= hours; i++) rows += `M${m} ${n(top + i * step)}H${split - 14}`
    g.light(rows)
    for (let i = 0; i < hours; i++) g.text(`${6 + i}:00`, m, top + i * step + step * 0.62, 7.5, { fill: g.c.strong })
    g.light(`M${m + 30} ${top}V${bottom}`, 0.7)
    // right column
    const rx = split + 14
    const rw = g.w - m - rx
    g.text(L.priorities, rx, top - 8, 11, { weight: 600 })
    g.checklist(rx, top + 22, rw, 3, 26)
    const todoY = top + 22 + 3 * 26 + 30
    g.text(L.todo, rx, todoY - 8, 11, { weight: 600 })
    g.checklist(rx, todoY + 18, rw, 8, 24)
    const notesY = todoY + 18 + 8 * 24 + 26
    g.text(L.notes, rx, notesY - 8, 11, { weight: 600 })
    g.light(g.hlines(rx, rx + rw, notesY + 14, bottom, 22))
  },

  weekly: (g) => {
    const m = 36
    const L = g.L
    g.text(L.weekOf, m, 58, 22, { weight: 700, fill: g.c.strong })
    g.strong(`M${m + 128} 60H${m + 300}`, 0.9)
    const cols = g.w > g.h ? 4 : 2
    const rows = 8 / cols
    const top = 84
    const gap = 10
    const cw = (g.w - m * 2 - gap * (cols - 1)) / cols
    const ch = (g.h - top - 36 - gap * (rows - 1)) / rows
    const days = weekdayNames(g.lang, 'long')
    for (let i = 0; i < 8; i++) {
      const x = m + (i % cols) * (cw + gap)
      const y = top + Math.floor(i / cols) * (ch + gap)
      g.rect(x, y, cw, ch, { r: 6, stroke: g.c.strong, sw: 0.9 })
      g.text(i < 7 ? days[i] : L.notes, x + 10, y + 18, 11, { weight: 600 })
      g.light(g.hlines(x + 8, x + cw - 8, y + 40, y + ch - 8, 20))
    }
  },

  monthly: (g) => {
    const m = 36
    const L = g.L
    g.text(L.month, m, 58, 22, { weight: 700, fill: g.c.strong })
    g.strong(`M${m + 76} 60H${m + 260}`, 0.9)
    const top = 84
    const names = weekdayNames(g.lang, 'short')
    const cw = (g.w - m * 2) / 7
    const headH = 22
    const rows = 6
    const ch = (g.h - top - headH - 36) / rows
    names.forEach((nm, i) => g.text(nm, m + i * cw + cw / 2, top + 15, 10, { weight: 600, anchor: 'middle' }))
    g.rect(m, top, g.w - m * 2, headH + rows * ch, { stroke: g.c.strong, sw: 1 })
    g.strong(`M${m} ${top + headH}H${g.w - m}`, 1)
    g.light(g.vlines(top, top + headH + rows * ch, m + cw, g.w - m - cw / 2, cw), 0.9)
    g.light(g.hlines(m, g.w - m, top + headH + ch, top + headH + rows * ch - 1, ch), 0.9)
  },

  todo: (g) => {
    const m = 44
    g.text(g.L.todo, m, 64, 28, { weight: 700, fill: g.c.strong })
    g.text(g.L.date, g.w - 230, 60, 11, { weight: 600 })
    g.strong(`M${g.w - 200} 62H${g.w - m}`, 0.9)
    g.strong(`M${m} 84H${g.w - m}`, 1)
    const rows = Math.floor((g.h - 84 - 44) / 28)
    g.checklist(m, 84 + 28, g.w - m * 2, rows, 28, true)
  },

  habit: (g) => {
    const m = 36
    const L = g.L
    g.text(L.habitTracker, m, 58, 22, { weight: 700, fill: g.c.strong })
    g.text(L.month, g.w - 240, 56, 11, { weight: 600 })
    g.strong(`M${g.w - 200} 58H${g.w - m}`, 0.9)
    const top = 84
    const nameW = Math.round(g.w * 0.2)
    const dayW = (g.w - m * 2 - nameW) / 31
    const headH = 22
    const rowH = Math.min(30, (g.h - top - headH - 40) / 14)
    const rows = Math.floor((g.h - top - headH - 40) / rowH)
    const x0 = m + nameW
    g.rect(m, top, g.w - m * 2, headH + rows * rowH, { stroke: g.c.strong, sw: 1 })
    g.strong(`M${m} ${top + headH}H${g.w - m}M${x0} ${top}V${top + headH + rows * rowH}`, 1)
    g.text(L.habit, m + 8, top + 15, 10, { weight: 600 })
    for (let d = 0; d < 31; d++) g.text(String(d + 1), x0 + d * dayW + dayW / 2, top + 15, 6.5, { anchor: 'middle' })
    g.light(g.vlines(top, top + headH + rows * rowH, x0 + dayW, x0 + 30 * dayW + 0.1, dayW), 0.6)
    g.light(g.hlines(m, g.w - m, top + headH + rowH, top + headH + (rows - 1) * rowH + 0.1, rowH), 0.8)
  },

  meeting: (g) => {
    const m = 44
    const L = g.L
    g.text(L.meeting, m, 64, 26, { weight: 700, fill: g.c.strong })
    const fieldY = 100
    g.text(L.title, m, fieldY, 10, { weight: 600 })
    g.strong(`M${m + 48} ${fieldY + 2}H${g.w - m}`, 0.9)
    g.text(L.date, m, fieldY + 28, 10, { weight: 600 })
    g.strong(`M${m + 48} ${fieldY + 30}H${Math.round(g.w * 0.5)}`, 0.9)
    g.text(L.attendees, Math.round(g.w * 0.54), fieldY + 28, 10, { weight: 600 })
    g.strong(`M${Math.round(g.w * 0.54) + 62} ${fieldY + 30}H${g.w - m}`, 0.9)
    const agendaY = fieldY + 62
    g.text(L.agenda, m, agendaY, 11, { weight: 600 })
    g.rect(m, agendaY + 8, g.w - m * 2, 96, { r: 6, stroke: g.c.strong, sw: 0.9 })
    g.light(g.hlines(m + 10, g.w - m - 10, agendaY + 34, agendaY + 96, 22))
    const actionsH = 120
    const notesY = agendaY + 132
    g.text(L.notes, m, notesY, 11, { weight: 600 })
    g.light(g.hlines(m, g.w - m, notesY + 18, g.h - actionsH - 60, 21))
    const actY = g.h - actionsH - 32
    g.strong(`M${m} ${actY}H${g.w - m}`, 1)
    g.text(L.actions, m, actY + 20, 11, { weight: 600 })
    g.checklist(m, actY + 44, g.w - m * 2, 3, 24)
  },

  staff: (g) => {
    const m = 40
    const gap = 8
    const staffH = gap * 4
    const pitch = staffH + 46
    let y = 70
    let lines = ''
    let bars = ''
    while (y + staffH < g.h - 40) {
      for (let i = 0; i < 5; i++) lines += `M${m} ${n(y + i * gap)}H${g.w - m}`
      bars += `M${m} ${y}V${y + staffH}M${g.w - m} ${y}V${y + staffH}`
      y += pitch
    }
    g.strong(lines, 0.8)
    g.strong(bars, 1.1)
  },

  'guitar-tab': (g) => {
    const m = 44
    const gap = 9
    const tabH = gap * 5
    const pitch = tabH + 44
    let y = 72
    let lines = ''
    let bars = ''
    while (y + tabH < g.h - 40) {
      for (let i = 0; i < 6; i++) lines += `M${m} ${n(y + i * gap)}H${g.w - m}`
      bars += `M${m} ${y}V${y + tabH}M${g.w - m} ${y}V${y + tabH}`
      g.text('T', m - 12, y + 15, 11, { weight: 700, anchor: 'middle', fill: g.c.strong })
      g.text('A', m - 12, y + 29, 11, { weight: 700, anchor: 'middle', fill: g.c.strong })
      g.text('B', m - 12, y + 43, 11, { weight: 700, anchor: 'middle', fill: g.c.strong })
      y += pitch
    }
    g.strong(lines, 0.8)
    g.strong(bars, 1.1)
  }
}

function columns(g: Canvas, count: number): void {
  const m = 36
  const top = 62
  const bottom = g.h - 36
  const colW = (g.w - m * 2) / count
  g.strong(`M${m} ${top}H${g.w - m}`, 1)
  for (let i = 0; i < count; i++) {
    const x0 = m + i * colW + (i ? 8 : 0)
    const x1 = m + (i + 1) * colW - (i < count - 1 ? 8 : 0)
    g.light(g.hlines(x0, x1, top + 20, bottom, 20))
    if (i) g.strong(`M${m + i * colW} ${top}V${bottom}`, 1)
  }
}

// ───────────────────────── Public API ─────────────────────────
/** Build the SVG for one page of a paper template. `pt` renders at fixed point size (for PDF export). */
export function paperSvg(spec: PaperSpec, opts: { fixedPt?: boolean } = {}): string {
  const { w, h } = pageDims(spec.size, spec.orientation)
  const g = new Canvas(w, h, SCHEMES[spec.color], STYLE_WEIGHT[spec.style], labelsFor(spec.lang), spec.lang)
  ;(TEMPLATE_DRAW[spec.template] ?? TEMPLATE_DRAW.blank)(g)
  return opts.fixedPt ? g.toSvg(w, h) : g.toSvg()
}

/** Infinite-whiteboard background tile (dotted), used for whiteboard thumbnails and export. */
export function whiteboardSvg(w: number, h: number, color: PaperColor = 'white'): string {
  const c = SCHEMES[color]
  let d = ''
  for (let y = 24; y < h; y += 24) for (let x = 24; x < w; x += 24) d += `M${x} ${y}h.01`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}pt" height="${h}pt"><rect width="${w}" height="${h}" fill="${c.bg}"/><path d="${d}" stroke="${c.strong}" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>`
}

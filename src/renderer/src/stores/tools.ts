/** Editor tool state shared by every open document; persisted in settings.tools. */
import { create } from 'zustand'
import type { PenType } from '../features/editor/ink'

export type ToolId = 'lasso' | 'pen' | 'eraser' | 'text' | 'sticker' | 'image' | 'elements' | 'sticky' | 'laser'
export type PenKind = 'pen' | 'highlighter' | 'tape' | 'shape'
export type EraseFilter = 'pen' | 'highlighter' | 'tape' | 'shapes' | 'text' | 'images' | 'stickers'
export type LassoFilter = 'handwriting' | 'shapes' | 'text' | 'images' | 'stickers'

export interface Swatches {
  colors: string[]
  color: string
  widths: number[]
  /** Index into widths. */
  width: number
}

export interface ToolPrefs {
  tool: ToolId
  penKind: PenKind
  penType: PenType
  pen: Swatches & { sharpness: number; pressure: number; stabilization: number }
  highlighter: Swatches & { straight: boolean }
  tape: Swatches
  shape: Swatches & { fill: boolean; dash: boolean }
  eraser: { mode: 'standard' | 'precise' | 'stroke'; size: number; filters: Record<EraseFilter, boolean>; autoDeselect: boolean; tipSeen: boolean }
  lasso: { mode: 'free' | 'rect'; filters: Record<LassoFilter, boolean> }
  text: { font: 'sans' | 'serif' | 'mono' | 'hand'; size: number; color: string }
  sticky: { color: number }
  laser: { mode: 'dot' | 'trail'; color: string }
  ruler: boolean
  drawHold: boolean
  /** Snap moved objects to page centre lines and other objects' edges. */
  align: boolean
  recent: string[]
}

export const ERASER_SIZES = [5, 11, 22]

export const DEFAULT_TOOLS: ToolPrefs = {
  tool: 'pen',
  penKind: 'pen',
  penType: 'fountain',
  pen: { colors: ['#000000', '#0C8CF3', '#FFFFFF'], color: '#000000', widths: [1.1, 2, 3.4], width: 1, sharpness: 50, pressure: 50, stabilization: 0 },
  highlighter: { colors: ['#FFE24D', '#7BE495', '#FF9BD2'], color: '#FFE24D', widths: [8, 14, 22], width: 1, straight: false },
  tape: { colors: ['#8EC5FF', '#F7B267', '#B9A7F2'], color: '#8EC5FF', widths: [10, 18, 28], width: 1 },
  shape: { colors: ['#000000', '#0C8CF3', '#E5484D'], color: '#000000', widths: [1.1, 2, 3.4], width: 1, fill: false, dash: false },
  eraser: {
    mode: 'standard',
    size: 1,
    filters: { pen: true, highlighter: true, tape: true, shapes: true, text: false, images: false, stickers: false },
    autoDeselect: false,
    tipSeen: false
  },
  lasso: { mode: 'free', filters: { handwriting: true, shapes: true, text: true, images: true, stickers: true } },
  text: { font: 'sans', size: 16, color: '#1F2430' },
  sticky: { color: 0 },
  laser: { mode: 'trail', color: '#FF3B30' },
  ruler: false,
  drawHold: true,
  align: true,
  recent: []
}

interface ToolsState extends ToolPrefs {
  /** Tool to return to after a one-shot tool (image picker, auto-deselect eraser). */
  prevTool: ToolId
  setTool: (t: ToolId) => void
  setPenKind: (k: PenKind) => void
  patch: (p: Partial<ToolPrefs>) => void
  patchSwatch: (k: PenKind, p: Partial<Swatches> & Record<string, unknown>) => void
  addRecent: (color: string) => void
  hydrate: (raw: unknown) => void
}

function merge<T>(base: T, raw: unknown): T {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || base === null || typeof base !== 'object' || Array.isArray(base)) {
    return (raw !== undefined && typeof raw === typeof base && Array.isArray(raw) === Array.isArray(base) ? raw : base) as T
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const k of Object.keys(out)) out[k] = merge(out[k], (raw as Record<string, unknown>)[k])
  return out as T
}

export const useTools = create<ToolsState>((set, get) => ({
  ...DEFAULT_TOOLS,
  prevTool: 'pen',
  setTool: (tool) => set((s) => ({ tool, prevTool: s.tool === tool ? s.prevTool : s.tool })),
  setPenKind: (penKind) => set((s) => ({ penKind, tool: 'pen', prevTool: s.tool === 'pen' ? s.prevTool : s.tool })),
  patch: (p) => set(p),
  patchSwatch: (k, p) => set((s) => ({ [k]: { ...s[k], ...p } }) as Partial<ToolsState>),
  addRecent: (color) => set((s) => ({ recent: [color, ...s.recent.filter((c) => c.toLowerCase() !== color.toLowerCase())].slice(0, 12) })),
  hydrate: (raw) => {
    const merged = merge(DEFAULT_TOOLS, raw)
    // one-shot tools never come back as the starting tool
    if (merged.tool === 'image' || merged.tool === 'laser' || merged.tool === 'elements' || merged.tool === 'sticker') merged.tool = 'pen'
    set({ ...merged, prevTool: get().prevTool })
  }
}))

/** Current pen-ish swatch (colour + width) for the active pen kind. */
export function activeSwatch(s: ToolPrefs = useTools.getState()): Swatches {
  return s[s.penKind]
}

export function snapshotPrefs(s: ToolsState): ToolPrefs {
  const { tool, penKind, penType, pen, highlighter, tape, shape, eraser, lasso, text, sticky, laser, ruler, drawHold, align, recent } = s
  return { tool, penKind, penType, pen, highlighter, tape, shape, eraser, lasso, text, sticky, laser, ruler, drawHold, align, recent }
}

let saveTimer = 0
let hydrated = false
/** Load from settings once, then persist changes (debounced). */
export function initToolPersistence(raw: unknown): void {
  if (hydrated) return
  hydrated = true
  useTools.getState().hydrate(raw)
  useTools.subscribe((s) => {
    window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => void window.quill.settings.set({ tools: snapshotPrefs(s) }), 500)
  })
}

/** Colour picker popover: preset grid, or a custom saturation/brightness square + hue + opacity + hex. */
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { Popover, type PopoverAnchor, SegmentedControl } from '../../components/kit'
import { useTools } from '../../stores/tools'

export const PRESETS = [
  '#000000', '#434343', '#7A7A7A', '#B7B7B7', '#E5E5E5', '#FFFFFF',
  '#8B1A1A', '#E5484D', '#FF8A80', '#F76B15', '#FFB224', '#FFE24D',
  '#2B7A0B', '#30A46C', '#7BE495', '#0E7C86', '#12A594', '#7CE2E0',
  '#0B3D91', '#0C8CF3', '#8EC5FF', '#4C2889', '#8E4EC6', '#C9A7F2',
  '#8E1F5B', '#D6409F', '#FF9BD2', '#6E4A2E', '#A0755A', '#D9B99B'
]

interface Hsv {
  h: number
  s: number
  v: number
  a: number
}

function hexToHsv(hex: string): Hsv {
  const m = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex) ?? ['', '000000', 'ff']
  const n = parseInt(m[1], 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  let h = 0
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max, a: m[2] ? parseInt(m[2], 16) / 255 : 1 }
}

function hsvToHex({ h, s, v, a }: Hsv): string {
  const f = (n: number): number => {
    const k = (n + h / 60) % 6
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
  }
  const to = (x: number): string => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${to(f(5))}${to(f(3))}${to(f(1))}${a < 0.995 ? to(a) : ''}`.toUpperCase()
}

function Drag({ className, style, onPick, children }: { className: string; style?: React.CSSProperties; onPick: (fx: number, fy: number) => void; children?: React.ReactNode }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const at = (e: RPointerEvent): void => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    onPick(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)))
  }
  return (
    <div
      ref={ref}
      className={className}
      style={style}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        at(e)
      }}
      onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && at(e)}
    >
      {children}
    </div>
  )
}

interface ColorPickerProps {
  anchor: PopoverAnchor
  value: string
  onChange: (hex: string) => void
  onClose: () => void
  /** Allow transparency (fills, highlighter). */
  alpha?: boolean
  title?: string
}

export function ColorPicker({ anchor, value, onChange, onClose, alpha = false, title }: ColorPickerProps): JSX.Element {
  const [tab, setTab] = useState<'presets' | 'custom'>(PRESETS.includes(value.toUpperCase()) ? 'presets' : 'custom')
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value))
  const [hex, setHex] = useState(value.toUpperCase())
  const recent = useTools((s) => s.recent)
  useEffect(() => setHex(hsvToHex(hsv)), [hsv])

  const commit = (h: string): void => {
    onChange(h)
    useTools.getState().addRecent(h)
  }
  const update = (p: Partial<Hsv>): void => {
    const next = { ...hsv, ...p }
    setHsv(next)
    onChange(hsvToHex(next))
  }

  return (
    <Popover anchor={anchor} onClose={() => {
      useTools.getState().addRecent(hsvToHex(hsv))
      onClose()
    }} side="bottom" align="center" caret className="color-pop">
      {title && <div className="pop-title">{title}</div>}
      <SegmentedControl value={tab} onChange={setTab} options={[{ value: 'presets', label: 'Presets' }, { value: 'custom', label: 'Custom' }]} />
      {tab === 'presets' ? (
        <div className="cp-grid">
          {PRESETS.map((c) => (
            <button key={c} type="button" aria-label={c} className={`cp-swatch${c === value.toUpperCase() ? ' on' : ''}`} style={{ background: c }} onClick={() => commit(c)} />
          ))}
        </div>
      ) : (
        <div className="cp-custom">
          <Drag className="cp-sv" style={{ background: `hsl(${hsv.h} 100% 50%)` }} onPick={(fx, fy) => update({ s: fx, v: 1 - fy })}>
            <span className="cp-sv-knob" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hsvToHex({ ...hsv, a: 1 }) }} />
          </Drag>
          <Drag className="cp-hue" onPick={(fx) => update({ h: fx * 360 })}>
            <span className="cp-bar-knob" style={{ left: `${(hsv.h / 360) * 100}%` }} />
          </Drag>
          {alpha && (
            <Drag className="cp-alpha" style={{ ['--c' as string]: hsvToHex({ ...hsv, a: 1 }) }} onPick={(fx) => update({ a: Math.round(fx * 100) / 100 })}>
              <span className="cp-bar-knob" style={{ left: `${hsv.a * 100}%` }} />
            </Drag>
          )}
          <div className="cp-hex-row">
            <span className="cp-preview" style={{ background: hex }} />
            <input
              className="cp-hex"
              value={hex}
              spellCheck={false}
              onChange={(e) => setHex(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter') {
                  const v = e.currentTarget.value.trim().replace(/^([^#])/, '#$1')
                  if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(v)) {
                    setHsv(hexToHsv(v))
                    commit(v.toUpperCase())
                  }
                }
              }}
            />
          </div>
        </div>
      )}
      {recent.length > 0 && (
        <>
          <div className="cp-label">RECENT</div>
          <div className="cp-recent">
            {recent.slice(0, 10).map((c) => (
              <button key={c} type="button" aria-label={c} className="cp-swatch small" style={{ background: c }} onClick={() => {
                setHsv(hexToHsv(c))
                onChange(c)
              }} />
            ))}
          </div>
        </>
      )}
    </Popover>
  )
}

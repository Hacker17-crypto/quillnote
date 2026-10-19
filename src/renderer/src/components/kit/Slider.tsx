import { useRef, type KeyboardEvent, type PointerEvent } from 'react'

interface SliderProps {
  value: number
  min?: number
  max?: number
  step?: number
  /** Number of tick marks drawn along the track (0 = none). */
  ticks?: number
  onChange: (v: number) => void
  label?: string
}

/** Ticked slider: blue fill, white knob with a blue ring. */
export function Slider({ value, min = 0, max = 100, step = 1, ticks = 0, onChange, label }: SliderProps): JSX.Element {
  const track = useRef<HTMLDivElement>(null)
  const pct = ((value - min) / (max - min)) * 100

  const setFromX = (clientX: number): void => {
    const r = track.current?.getBoundingClientRect()
    if (!r) return
    const f = Math.max(0, Math.min(1, (clientX - r.left) / r.width))
    const raw = min + f * (max - min)
    const snapped = Math.round(raw / step) * step
    onChange(Math.max(min, Math.min(max, +snapped.toFixed(6))))
  }
  const onDown = (e: PointerEvent<HTMLDivElement>): void => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setFromX(e.clientX)
  }
  const onMove = (e: PointerEvent<HTMLDivElement>): void => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) setFromX(e.clientX)
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>): void => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? step : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -step : 0
    if (!d) return
    e.preventDefault()
    onChange(Math.max(min, Math.min(max, value + d)))
  }

  return (
    <div
      className="q-slider"
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onKeyDown={onKey}
    >
      <div className="q-slider-track" ref={track}>
        <div className="q-slider-fill" style={{ width: `${pct}%` }} />
        {ticks > 1 &&
          Array.from({ length: ticks }, (_, i) => <span key={i} className="q-slider-tick" style={{ left: `${(i / (ticks - 1)) * 100}%` }} />)}
        <div className="q-slider-knob" style={{ left: `${pct}%` }} />
      </div>
    </div>
  )
}

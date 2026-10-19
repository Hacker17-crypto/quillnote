/** Pen settings popover: live preview, pen type tiles, sliders and pen gestures. */
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Popover, Slider, Toggle, type PopoverAnchor } from '../../components/kit'
import { useTools } from '../../stores/tools'
import { useUi } from '../../stores/ui'
import { BallPenIcon, BrushPenIcon, FountainPenIcon } from './icons'
import { penOpts, pressureOutline, type PenType } from './ink'

const NAMES: Record<PenType, string> = { fountain: 'Fountain Pen', ball: 'Ball Pen', brush: 'Brush Pen' }

/** A fixed S-curve written with a pressure swell, used to preview pen settings. */
function previewPoints(): number[] {
  const pts: number[] = []
  for (let i = 0; i <= 60; i++) {
    const t = i / 60
    const x = 24 + t * 232
    // a soft tilde: dip, rise to a crest, fall away
    const y = 62 - Math.sin(Math.PI * (1.7 * t - 0.45)) * 34
    pts.push(x, y, 0.3 + 0.55 * Math.sin(t * Math.PI))
  }
  return pts
}
const PREVIEW = previewPoints()

export function PenSettings({ anchor, onClose }: { anchor: PopoverAnchor; onClose: () => void }): JSX.Element {
  const t = useTools()
  const gestures = useUi((s) => s.settings?.gestures)
  const [page, setPage] = useState<'main' | 'gestures'>('main')
  const d = useMemo(() => {
    const o = penOpts(t.penType, t.pen.sharpness, t.pen.pressure, t.pen.stabilization, false)
    return pressureOutline(PREVIEW, 7, o, true)
  }, [t.penType, t.pen.sharpness, t.pen.pressure, t.pen.stabilization])
  const g = { doubleTapEraser: true, scribbleErase: true, drawAndHold: true, circleLasso: false, ...gestures }
  const setGesture = (k: keyof typeof g, v: boolean): void => void useUi.getState().patchSettings({ gestures: { ...g, [k]: v } })

  return (
    <Popover anchor={anchor} onClose={onClose} side="bottom" align="center" caret className="pen-pop">
      {page === 'main' ? (
        <>
          <div className="pen-pop-title">{NAMES[t.penType]}</div>
          <svg className="pen-preview" viewBox="0 0 280 120" aria-hidden="true">
            <path d={d} fill="#fff" />
          </svg>
          <div className="pen-types">
            {(['fountain', 'ball', 'brush'] as PenType[]).map((p) => (
              <button key={p} type="button" className={`pen-type${t.penType === p ? ' on' : ''}`} onClick={() => t.patch({ penType: p })}>
                {p === 'fountain' ? <FountainPenIcon size={26} /> : p === 'ball' ? <BallPenIcon size={26} /> : <BrushPenIcon size={26} />}
                <span>{NAMES[p]}</span>
              </button>
            ))}
          </div>
          <div className="pen-sliders">
            <SliderRow label="TIP SHARPNESS" value={t.pen.sharpness} ticks={5} onChange={(v) => t.patchSwatch('pen', { sharpness: v })} />
            <SliderRow label="PRESSURE SENSITIVITY" value={t.pen.pressure} ticks={5} onChange={(v) => t.patchSwatch('pen', { pressure: v })} />
            <SliderRow label="STROKE STABILIZATION" value={t.pen.stabilization} ticks={0} onChange={(v) => t.patchSwatch('pen', { stabilization: v })} />
          </div>
          <div className="pop-section">SETTINGS</div>
          <div className="pop-row">
            <span>Draw and Hold</span>
            <Toggle checked={t.drawHold} onChange={(v) => t.patch({ drawHold: v })} label="Draw and Hold" />
          </div>
          <button type="button" className="pop-row link" onClick={() => setPage('gestures')}>
            <span>Pen Gestures</span>
            <ChevronRight size={18} />
          </button>
        </>
      ) : (
        <>
          <button type="button" className="pop-back" onClick={() => setPage('main')}>
            <ChevronLeft size={18} /> Pen Gestures
          </button>
          <div className="pop-row">
            <span>
              Scribble to erase
              <small>Scribble over writing to remove it</small>
            </span>
            <Toggle checked={g.scribbleErase} onChange={(v) => setGesture('scribbleErase', v)} label="Scribble to erase" />
          </div>
          <div className="pop-row">
            <span>
              Pen eraser switches tools
              <small>The eraser end or barrel button erases</small>
            </span>
            <Toggle checked={g.doubleTapEraser} onChange={(v) => setGesture('doubleTapEraser', v)} label="Pen eraser" />
          </div>
          <div className="pop-row">
            <span>
              Draw and hold for shapes
              <small>Hold at the end of a stroke to make it a perfect shape</small>
            </span>
            <Toggle checked={t.drawHold} onChange={(v) => t.patch({ drawHold: v })} label="Draw and hold" />
          </div>
        </>
      )}
    </Popover>
  )
}

function SliderRow({ label, value, ticks, onChange }: { label: string; value: number; ticks: number; onChange: (v: number) => void }): JSX.Element {
  return (
    <div className="slider-row">
      <div className="slider-row-head">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <Slider value={value} ticks={ticks} onChange={onChange} label={label} />
    </div>
  )
}

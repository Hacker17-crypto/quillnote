import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  label: ReactNode
  children: ReactNode
  side?: 'bottom' | 'top'
  delay?: number
}

/** Hover/focus tooltip. Wraps its child in an inline-flex span. */
export function Tooltip({ label, children, side = 'bottom', delay = 450 }: TooltipProps): JSX.Element {
  const host = useRef<HTMLSpanElement>(null)
  const timer = useRef<number>(0)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  const show = (): void => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const r = host.current?.getBoundingClientRect()
      if (r) setPos({ x: r.left + r.width / 2, y: side === 'bottom' ? r.bottom + 8 : r.top - 8 })
    }, delay)
  }
  const hide = (): void => {
    window.clearTimeout(timer.current)
    setPos(null)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <span ref={host} className="q-tip-host" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} onPointerDown={hide}>
      {children}
      {pos &&
        createPortal(
          <div role="tooltip" className={`q-tooltip ${side}`} style={{ left: pos.x, top: pos.y }}>
            {label}
          </div>,
          document.body
        )}
    </span>
  )
}

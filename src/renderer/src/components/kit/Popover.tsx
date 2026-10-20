import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type PopoverAnchor = HTMLElement | DOMRect | { x: number; y: number } | null
export type PopoverSide = 'bottom' | 'top' | 'right' | 'left'
export type PopoverAlign = 'start' | 'center' | 'end'

interface PopoverProps {
  anchor: PopoverAnchor
  onClose: () => void
  side?: PopoverSide
  align?: PopoverAlign
  /** Small caret (8px) pointing at the trigger. */
  caret?: boolean
  gap?: number
  className?: string
  style?: CSSProperties
  /** Elements that count as "inside" for outside-click detection (e.g. the trigger). */
  ignore?: (HTMLElement | null)[]
  children: ReactNode
}

function toRect(a: PopoverAnchor): DOMRect | null {
  if (!a) return null
  if (a instanceof HTMLElement) return a.getBoundingClientRect()
  if ('width' in a) return a
  return new DOMRect(a.x, a.y, 0, 0)
}

const MARGIN = 8

/**
 * Floating panel anchored to an element, rect or point. Flips to the opposite side when it would
 * overflow, clamps into the viewport, closes on outside press / Escape.
 */
export function Popover({
  anchor,
  onClose,
  side = 'bottom',
  align = 'start',
  caret = false,
  gap,
  className = '',
  style,
  ignore,
  children
}: PopoverProps): JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number; side: PopoverSide; caretX: number; caretY: number } | null>(null)
  const g = gap ?? (caret ? 12 : 6)

  useLayoutEffect(() => {
    const el = ref.current
    const r = toRect(anchor)
    if (!el || !r) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const vw = window.innerWidth
    const vh = window.innerHeight
    let s = side
    if (s === 'bottom' && r.bottom + g + h > vh - MARGIN && r.top - g - h > MARGIN) s = 'top'
    else if (s === 'top' && r.top - g - h < MARGIN && r.bottom + g + h < vh - MARGIN) s = 'bottom'
    else if (s === 'right' && r.right + g + w > vw - MARGIN && r.left - g - w > MARGIN) s = 'left'
    else if (s === 'left' && r.left - g - w < MARGIN && r.right + g + w < vw - MARGIN) s = 'right'

    let left: number
    let top: number
    if (s === 'bottom' || s === 'top') {
      left = align === 'start' ? r.left : align === 'end' ? r.right - w : r.left + r.width / 2 - w / 2
      top = s === 'bottom' ? r.bottom + g : r.top - g - h
    } else {
      top = align === 'start' ? r.top : align === 'end' ? r.bottom - h : r.top + r.height / 2 - h / 2
      left = s === 'right' ? r.right + g : r.left - g - w
    }
    left = Math.max(MARGIN, Math.min(left, vw - w - MARGIN))
    top = Math.max(MARGIN, Math.min(top, vh - h - MARGIN))
    const caretX = Math.max(16, Math.min(r.left + r.width / 2 - left, w - 16))
    const caretY = Math.max(16, Math.min(r.top + r.height / 2 - top, h - 16))
    setPos({ left, top, side: s, caretX, caretY })
  }, [anchor, side, align, g, children])

  // Inputs can't take focus while the popover is still hidden for measuring; focus once placed.
  const placed = pos !== null
  useEffect(() => {
    if (placed) ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true })
  }, [placed])

  useEffect(() => {
    const onDown = (e: PointerEvent): void => {
      const t = e.target as Node
      if (ref.current?.contains(t)) return
      if (ignore?.some((i) => i?.contains(t))) return
      onClose()
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    const onResize = (): void => onClose()
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', onResize)
    window.addEventListener('blur', onResize)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('blur', onResize)
    }
  }, [onClose, ignore])

  if (!anchor) return null
  const caretStyle: CSSProperties | undefined =
    caret && pos
      ? pos.side === 'bottom'
        ? { left: pos.caretX - 5, top: -5 }
        : pos.side === 'top'
          ? { left: pos.caretX - 5, bottom: -5 }
          : pos.side === 'right'
            ? { top: pos.caretY - 5, left: -5 }
            : { top: pos.caretY - 5, right: -5 }
      : undefined

  return createPortal(
    <div
      ref={ref}
      className={`q-popover ${className}`}
      data-side={pos?.side ?? side}
      style={{ ...style, left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}
    >
      {caret && <span className="q-popover-caret" style={caretStyle} />}
      {children}
    </div>,
    document.body
  )
}

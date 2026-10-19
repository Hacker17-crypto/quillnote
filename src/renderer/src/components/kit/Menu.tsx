import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { Popover, type PopoverAlign, type PopoverAnchor, type PopoverSide } from './Popover'
import { Badge, type BadgeKind } from './Badge'

interface MenuProps {
  anchor: PopoverAnchor
  onClose: () => void
  side?: PopoverSide
  align?: PopoverAlign
  width?: number
  caret?: boolean
  ignore?: (HTMLElement | null)[]
  className?: string
  children: ReactNode
}

/** Popover containing menu rows. Arrow keys move focus, Enter activates, Escape closes. */
export function Menu({ anchor, onClose, side, align, width = 240, caret, ignore, className = '', children }: MenuProps): JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [anchor])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? [])
    if (!items.length) return
    const i = items.indexOf(document.activeElement as HTMLElement)
    const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length
    items[i < 0 && e.key === 'ArrowUp' ? items.length - 1 : next].focus()
  }

  return (
    <Popover anchor={anchor} onClose={onClose} side={side} align={align} caret={caret} ignore={ignore} className={`q-menu ${className}`} style={{ width }}>
      <div ref={ref} role="menu" tabIndex={-1} className="q-menu-inner" onKeyDown={onKeyDown}>
        {children}
      </div>
    </Popover>
  )
}

interface MenuItemProps {
  icon?: ReactNode
  label: ReactNode
  badge?: BadgeKind
  /** Right-aligned hint, e.g. a shortcut or current value. */
  hint?: ReactNode
  danger?: boolean
  disabled?: boolean
  /** Checkmark state for radio/check style rows. */
  checked?: boolean
  onSelect?: () => void
}

export function MenuItem({ icon, label, badge, hint, danger, disabled, checked, onSelect }: MenuItemProps): JSX.Element {
  return (
    <button
      type="button"
      role="menuitem"
      aria-disabled={disabled || undefined}
      className={`q-menu-item${danger ? ' danger' : ''}${disabled ? ' disabled' : ''}`}
      onClick={() => {
        if (!disabled) onSelect?.()
      }}
    >
      <span className="q-menu-icon">{icon}</span>
      <span className="q-menu-label">{label}</span>
      {badge && <Badge kind={badge} />}
      {hint !== undefined && <span className="q-menu-hint">{hint}</span>}
      {checked && (
        <svg className="q-menu-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      )}
    </button>
  )
}

export function MenuSeparator(): JSX.Element {
  return <div role="separator" className="q-menu-sep" />
}

export function MenuLabel({ children }: { children: ReactNode }): JSX.Element {
  return <div className="q-menu-section">{children}</div>
}

export function MenuFooter({ children }: { children: ReactNode }): JSX.Element {
  return <div className="q-menu-footer">{children}</div>
}

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface DialogProps {
  open: boolean
  onClose: () => void
  width?: number
  height?: number
  /** Aria label for the dialog. */
  label: string
  className?: string
  style?: CSSProperties
  /** Click on the scrim closes the dialog (default true). */
  dismissOnScrim?: boolean
  children: ReactNode
}

/** Modal dialog (radius 18) over a dark scrim. Escape closes; focus returns to the opener. */
export function Dialog({ open, onClose, width = 420, height, label, className = '', style, dismissOnScrim = true, children }: DialogProps): JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      prev?.focus?.({ preventScroll: true })
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="q-scrim" onMouseDown={(e) => dismissOnScrim && e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`q-dialog ${className}`}
        style={{ width, height, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 32px)', ...style }}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

export function DialogFooter({ children }: { children: ReactNode }): JSX.Element {
  return <div className="q-dialog-footer">{children}</div>
}

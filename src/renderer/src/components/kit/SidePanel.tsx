import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface SidePanelProps {
  open: boolean
  onClose: () => void
  label: string
  side?: 'right' | 'left'
  width?: number
  /** Dark scrim behind the panel; editor panels set this false and dock instead. */
  scrim?: boolean
  children: ReactNode
}

/** Panel that slides in from an edge (200ms). Account panel = right, 300px. */
export function SidePanel({ open, onClose, label, side = 'right', width = 300, scrim = true, children }: SidePanelProps): JSX.Element | null {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className={`q-sidepanel-wrap${scrim ? ' scrim' : ''}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside role="complementary" aria-label={label} className={`q-sidepanel ${side}`} style={{ width }}>
        {children}
      </aside>
    </div>,
    document.body
  )
}

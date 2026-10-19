import { useEffect, useState } from 'react'
import { LogoMark } from './icons'

/** Windows caption row (frameless window). macOS uses the native traffic lights instead. */
export function TitleBar(): JSX.Element | null {
  const [maximized, setMaximized] = useState(false)
  useEffect(() => {
    void window.quill.win.isMaximized().then(setMaximized)
    return window.quill.win.onMaximizedChange(setMaximized)
  }, [])

  if (window.quill.platform === 'darwin') return null
  const w = window.quill.win
  return (
    <div className="caption drag" onDoubleClick={() => w.toggleMaximize()}>
      <div className="caption-title">
        <LogoMark size={13} />
        <span>Quillnote</span>
      </div>
      <div className="caption-controls no-drag" onDoubleClick={(e) => e.stopPropagation()}>
        <button type="button" aria-label="Minimize" onClick={() => w.minimize()}>
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 5.5h10" stroke="currentColor" strokeWidth="1" /></svg>
        </button>
        <button type="button" aria-label={maximized ? 'Restore' : 'Maximize'} onClick={() => w.toggleMaximize()}>
          {maximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1"><rect x="0.5" y="2.5" width="7" height="7" /><path d="M2.5 2.5v-2h7v7h-2" /></svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1"><rect x="0.5" y="0.5" width="9" height="9" /></svg>
          )}
        </button>
        <button type="button" className="close" aria-label="Close" onClick={() => w.close()}>
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0l10 10M10 0L0 10" stroke="currentColor" strokeWidth="1" /></svg>
        </button>
      </div>
    </div>
  )
}

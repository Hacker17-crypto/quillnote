import { House, X } from 'lucide-react'
import { useTabs } from '../stores/tabs'

/** Black strip: Home chip, then one tab per open document. */
export function TabStrip(): JSX.Element {
  const { tabs, active, activate, close } = useTabs()
  const home = active === 'home'
  return (
    <div className={`tabstrip drag${home ? '' : ' editing'}${window.quill.platform === 'darwin' ? ' mac' : ''}`}>
      <button type="button" className={`tab-home no-drag${home ? ' on' : ''}`} aria-label="Home" onClick={() => activate('home')}>
        <House size={19} strokeWidth={1.7} />
      </button>
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          tabIndex={0}
          className={`tab no-drag${active === t.id ? ' on' : ''}${home ? ' dim' : ''}`}
          onClick={() => activate(t.id)}
          onAuxClick={(e) => e.button === 1 && close(t.id)}
          onKeyDown={(e) => e.key === 'Enter' && activate(t.id)}
        >
          <span className="tab-title">{t.title}</span>
          <button
            type="button"
            className="tab-x"
            aria-label={`Close ${t.title}`}
            onClick={(e) => {
              e.stopPropagation()
              close(t.id)
            }}
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}

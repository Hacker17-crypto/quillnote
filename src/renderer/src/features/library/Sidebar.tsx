import { Folder, Store, Trash2, Users } from 'lucide-react'
import { FavoritesIcon, FolderFilledIcon, GiftHandIcon } from '../../components/icons'
import { useUi, type NavId } from '../../stores/ui'

interface NavRow {
  id: NavId
  label: string
  icon: JSX.Element
  activeIcon?: JSX.Element
  caption?: JSX.Element
}

const ROWS: NavRow[] = [
  { id: 'documents', label: 'Documents', icon: <Folder size={22} strokeWidth={1.6} />, activeIcon: <FolderFilledIcon size={22} /> },
  { id: 'favorites', label: 'Favorites', icon: <FavoritesIcon size={22} strokeWidth={1.6} /> },
  { id: 'shared', label: 'Shared', icon: <Users size={22} strokeWidth={1.6} /> },
  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: <Store size={22} strokeWidth={1.6} />,
    caption: (
      <span className="nav-caption">
        <GiftHandIcon size={14} /> 50+ Items for you
      </span>
    )
  }
]

export function Sidebar(): JSX.Element {
  const nav = useUi((s) => s.nav)
  const setNav = useUi((s) => s.setNav)

  const row = (r: NavRow): JSX.Element => {
    const on = nav === r.id
    return (
      <button key={r.id} type="button" className={`nav-row${on ? ' on' : ''}${r.caption ? ' tall' : ''}`} onClick={() => setNav(r.id)} aria-current={on ? 'page' : undefined}>
        <span className="nav-icon">{on && r.activeIcon ? r.activeIcon : r.icon}</span>
        <span className="nav-text">
          <span className="nav-label">{r.label}</span>
          {r.caption}
        </span>
      </button>
    )
  }

  return (
    <aside className="lib-sidebar">
      <div className="wordmark">Quillnote</div>
      <nav className="nav-list">
        {ROWS.map(row)}
        <div className="nav-divider" />
        {row({ id: 'trash', label: 'Trash', icon: <Trash2 size={22} strokeWidth={1.6} /> })}
      </nav>
    </aside>
  )
}

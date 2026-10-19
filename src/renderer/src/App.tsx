import { useEffect, useState } from 'react'
import { TabStrip } from './components/TabStrip'
import { TitleBar } from './components/TitleBar'
import { Toasts } from './components/Toasts'
import { EditorPlaceholder } from './features/editor/EditorPlaceholder'
import { DialogHost } from './features/library/Dialogs'
import { LibraryPage } from './features/library/LibraryPage'
import { Sidebar } from './features/library/Sidebar'
import { KitPage } from './features/kit/KitPage'
import { useLibrary } from './stores/library'
import { useTabs } from './stores/tabs'
import { useUi } from './stores/ui'

function useRoute(): string {
  const [route, setRoute] = useState(() => window.location.hash.replace(/^#/, '') || '/')
  useEffect(() => {
    const on = (): void => setRoute(window.location.hash.replace(/^#/, '') || '/')
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

/** Resolve the Appearance setting into data-theme on <html>. */
function useTheme(): void {
  const theme = useUi((s) => s.settings?.theme ?? 'dark')
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (): void => {
      const t = theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme
      document.documentElement.dataset.theme = t
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

function Shell(): JSX.Element {
  const active = useTabs((s) => s.active)
  const items = useLibrary((s) => s.items)

  // Close tabs whose document was trashed or deleted.
  useEffect(() => {
    useTabs.getState().prune(new Set(items.filter((i) => i.trashedAt === null).map((i) => i.id)))
    for (const t of useTabs.getState().tabs) {
      const it = items.find((i) => i.id === t.id)
      if (it && it.title !== t.title) useTabs.getState().retitle(t.id, it.title)
    }
  }, [items])

  return (
    <>
      <div className="lib-layout" hidden={active !== 'home'}>
        <Sidebar />
        <LibraryPage />
      </div>
      {active !== 'home' && <EditorPlaceholder id={active} />}
    </>
  )
}

export function App(): JSX.Element {
  const route = useRoute()
  const ready = useUi((s) => s.settings !== null)
  useTheme()

  useEffect(() => {
    void window.quill.settings.get().then(useUi.getState().setSettings)
    void useLibrary.getState().load()
  }, [])

  if (route.startsWith('/kit')) {
    return (
      <div className="app">
        <TitleBar />
        <KitPage />
        <Toasts />
      </div>
    )
  }

  return (
    <div className="app">
      <TitleBar />
      <TabStrip />
      <div className="app-main">{ready && <Shell />}</div>
      <DialogHost />
      <Toasts />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { TabStrip } from './components/TabStrip'
import { TitleBar } from './components/TitleBar'
import { Toasts } from './components/Toasts'
import { Editor } from './features/editor/Editor'
import { StudyOverlay } from './features/editor/AiPanel'
import { laser } from './features/editor/laser'
import { useEditor } from './stores/editor'
import { initToolPersistence } from './stores/tools'
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
  const tabs = useTabs((s) => s.tabs)
  const items = useLibrary((s) => s.items)

  // Close tabs whose document was trashed or deleted.
  useEffect(() => {
    useTabs.getState().prune(new Set(items.filter((i) => i.trashedAt === null).map((i) => i.id)))
    for (const t of useTabs.getState().tabs) {
      const it = items.find((i) => i.id === t.id)
      if (it && it.title !== t.title) useTabs.getState().retitle(t.id, it.title)
    }
  }, [items])

  // Sessions whose tab went away (closed, or the document was trashed) are saved and released.
  useEffect(() => {
    const open = new Set(tabs.map((t) => t.id))
    for (const id of Object.keys(useEditor.getState().sessions)) if (!open.has(id)) void useEditor.getState().close(id)
  }, [tabs])

  return (
    <>
      <div className="lib-layout" hidden={active !== 'home'}>
        <Sidebar />
        <LibraryPage />
      </div>
      {tabs.map((t) => (
        <div key={t.id} className="editor-host" hidden={active !== t.id}>
          <Editor docId={t.id} active={active === t.id} />
        </div>
      ))}
    </>
  )
}

export function App(): JSX.Element {
  const route = useRoute()
  const ready = useUi((s) => s.settings !== null)
  useTheme()

  useEffect(() => {
    void window.quill.settings.get().then((s) => {
      useUi.getState().setSettings(s)
      initToolPersistence(s.tools)
    })
    void useLibrary.getState().load()
    // flush unsaved edits before the window closes
    window.quill.app.onBeforeClose(() => useEditor.getState().flushAll())
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
      <StudyOverlay />
      <canvas ref={laser.attach} className="laser-canvas" />
      <Toasts />
    </div>
  )
}

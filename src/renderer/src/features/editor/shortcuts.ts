/** Editor keyboard shortcuts (Ctrl on Windows, Cmd on macOS). Active only for the visible tab. */
import { useEffect } from 'react'
import { session, useEditor } from '../../stores/editor'
import { useTabs } from '../../stores/tabs'
import { useTools } from '../../stores/tools'
import { copySelection, cutSelection, deleteSelection, duplicateSelection, goToPage, paste, selectAll } from './actions'
import { printDoc } from './exporting'
import { zoomBy } from './views'

const typing = (t: EventTarget | null): boolean => {
  const el = t as HTMLElement | null
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
}

export function useEditorShortcuts(docId: string, active: boolean): void {
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent): void => {
      const s = session(docId)
      if (!s) return
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      const ed = useEditor.getState()
      const tools = useTools.getState()
      const isText = s.doc.kind === 'text'

      if (key === 'escape') {
        if (document.querySelector('.q-popover, .q-scrim')) return
        if (s.editing) ed.view(docId, { editing: null })
        else if (s.selection) ed.view(docId, { selection: null })
        else if (s.panel) ed.view(docId, { panel: null })
        return
      }
      // app-level shortcuts that work even while typing
      if (mod && key === 'w') {
        e.preventDefault()
        void ed.close(docId).then(() => useTabs.getState().close(docId))
        return
      }
      if (mod && key === 'tab') {
        e.preventDefault()
        const { tabs, activate } = useTabs.getState()
        const ids = ['home', ...tabs.map((t) => t.id)]
        const i = ids.indexOf(docId)
        activate(ids[(i + (e.shiftKey ? -1 : 1) + ids.length) % ids.length])
        return
      }
      if (mod && key === 's') {
        e.preventDefault()
        void ed.saveNow(docId)
        return
      }
      if (mod && key === 'p') {
        e.preventDefault()
        void printDoc(docId)
        return
      }
      if (mod && key === 'f') {
        e.preventDefault()
        ed.view(docId, { panel: 'search' })
        return
      }
      if (mod && e.shiftKey && key === 'a') {
        e.preventDefault()
        ed.view(docId, { panel: s.panel === 'ai' ? null : 'ai' })
        return
      }
      if (typing(e.target)) return
      if (isText) return

      if (mod && (key === 'z' || key === 'y')) {
        e.preventDefault()
        if (key === 'y' || e.shiftKey) ed.redo(docId)
        else ed.undo(docId)
        return
      }
      if (mod && (key === '=' || key === '+')) {
        e.preventDefault()
        zoomBy(docId, 1.2)
        return
      }
      if (mod && key === '-') {
        e.preventDefault()
        zoomBy(docId, 1 / 1.2)
        return
      }
      if (mod && key === '0') {
        e.preventDefault()
        ed.view(docId, { zoom: 0 })
        return
      }
      if (s.readOnly) {
        if (key === 'pagedown' || key === 'arrowright') goToPage(docId, Math.min(s.doc.pages.length - 1, s.page + 1))
        if (key === 'pageup' || key === 'arrowleft') goToPage(docId, Math.max(0, s.page - 1))
        return
      }
      if (mod && key === 'c') return void (s.selection && (e.preventDefault(), copySelection(docId)))
      if (mod && key === 'x') return void (s.selection && (e.preventDefault(), cutSelection(docId)))
      if (mod && key === 'v') {
        e.preventDefault()
        void paste(docId)
        return
      }
      if (mod && key === 'd') {
        e.preventDefault()
        duplicateSelection(docId)
        return
      }
      if (mod && key === 'a') {
        e.preventDefault()
        selectAll(docId)
        return
      }
      if ((key === 'delete' || key === 'backspace') && s.selection) {
        e.preventDefault()
        deleteSelection(docId)
        return
      }
      if (key === 'pagedown') return goToPage(docId, Math.min(s.doc.pages.length - 1, s.page + 1))
      if (key === 'pageup') return goToPage(docId, Math.max(0, s.page - 1))
      if (mod || e.altKey) return
      const map: Record<string, () => void> = {
        p: () => tools.setPenKind('pen'),
        h: () => tools.setPenKind('highlighter'),
        s: () => tools.setPenKind('shape'),
        e: () => tools.setTool('eraser'),
        l: () => tools.setTool('lasso'),
        t: () => tools.setTool('text')
      }
      if (map[key]) {
        map[key]()
        if (key !== 'l') ed.view(docId, { selection: null })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [docId, active])
}

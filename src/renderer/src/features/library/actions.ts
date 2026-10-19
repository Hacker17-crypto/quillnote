import type { DocKind, LibraryItem } from '@shared/types'
import { useLibrary } from '../../stores/library'
import { useTabs } from '../../stores/tabs'
import { useUi } from '../../stores/ui'

/** Where new items go: the open folder in Documents, otherwise the library root. */
export function currentParent(): string | null {
  const { nav, folderId } = useUi.getState()
  return nav === 'documents' ? folderId : null
}

export function openItem(item: LibraryItem): void {
  if (item.trashedAt !== null) return
  if (item.type === 'folder') {
    useUi.getState().setNav('documents')
    useUi.getState().openFolder(item.id)
    return
  }
  useTabs.getState().open(item.id, item.title)
}

export function openById(id: string | undefined): void {
  if (!id) return
  const item = useLibrary.getState().items.find((i) => i.id === id)
  if (item) openItem(item)
}

/** Create a document of `kind` with defaults and open it (Quick note, Whiteboard, Text Document). */
export async function createAndOpen(kind: DocKind): Promise<void> {
  const settings = useUi.getState().settings
  const id = await useLibrary.getState().createDoc({
    kind,
    parentId: currentParent(),
    paper: kind === 'quick' ? settings?.defaultPaper : undefined
  })
  openById(id)
}

export async function importFiles(): Promise<void> {
  useLibrary.getState().applyImport(await window.quill.library.pickImport(currentParent(), 'files'))
}

export async function importImages(): Promise<void> {
  useLibrary.getState().applyImport(await window.quill.library.pickImport(currentParent(), 'images'))
}

export async function importFromFolder(hint?: string): Promise<void> {
  useLibrary.getState().applyImport(await window.quill.library.importFolder(currentParent(), hint))
}

export async function exportAs(item: LibraryItem, format: 'pdf' | 'quill'): Promise<void> {
  const ui = useUi.getState()
  const res = format === 'pdf' ? await window.quill.library.exportPdf(item.id) : await window.quill.library.exportQuill(item.id)
  if (res.ok) ui.toast(`Exported ${item.title}`, res.path ? { label: 'Show', run: () => window.quill.library.showInFolder(item.id) } : undefined)
  else if (res.error) ui.toast(res.error)
}

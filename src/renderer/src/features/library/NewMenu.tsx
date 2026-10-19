import { Cloud, Download, FileText, Folder, HardDrive, Image, Notebook, SquarePen } from 'lucide-react'
import { Menu, MenuFooter, MenuItem, MenuSeparator } from '../../components/kit'
import { WhiteboardIcon } from '../../components/icons'
import { useUi } from '../../stores/ui'
import { createAndOpen, importFiles, importFromFolder, importImages } from './actions'

interface NewMenuProps {
  anchor: HTMLElement
  onClose: () => void
}

const ICON = { size: 18, strokeWidth: 1.7 }

export function NewMenu({ anchor, onClose }: NewMenuProps): JSX.Element {
  const openDialog = useUi((s) => s.openDialog)
  const pick = (fn: () => void) => (): void => {
    onClose()
    fn()
  }
  return (
    <Menu anchor={anchor} onClose={onClose} align="end" width={180} ignore={[anchor]}>
      <MenuItem icon={<Notebook {...ICON} />} label="Notebook" onSelect={pick(() => openDialog({ kind: 'newNotebook' }))} />
      <MenuItem icon={<FileText {...ICON} />} label="Text Document" badge="beta" onSelect={pick(() => void createAndOpen('text'))} />
      <MenuItem icon={<WhiteboardIcon size={18} strokeWidth={1.7} />} label="Whiteboard" badge="new" onSelect={pick(() => void createAndOpen('whiteboard'))} />
      <MenuItem icon={<SquarePen {...ICON} />} label="Quick note" onSelect={pick(() => void createAndOpen('quick'))} />
      <MenuItem icon={<Image {...ICON} />} label="Image" onSelect={pick(() => void importImages())} />
      <MenuItem icon={<Folder {...ICON} />} label="Folder" onSelect={pick(() => openDialog({ kind: 'newFolder' }))} />
      <MenuSeparator />
      <MenuItem icon={<Download {...ICON} />} label="Import" onSelect={pick(() => void importFiles())} />
      <MenuItem icon={<Cloud {...ICON} />} label="Google Drive folder" onSelect={pick(() => void importFromFolder('google'))} />
      <MenuItem icon={<Cloud {...ICON} />} label="OneDrive folder" onSelect={pick(() => void importFromFolder('onedrive'))} />
      <MenuItem icon={<Cloud {...ICON} />} label="Dropbox folder" onSelect={pick(() => void importFromFolder('dropbox'))} />
      <MenuItem icon={<HardDrive {...ICON} />} label="Other folder…" onSelect={pick(() => void importFromFolder())} />
      <MenuSeparator />
      <MenuFooter>Tip: Double-click “+ New” button to create a Quick note</MenuFooter>
    </Menu>
  )
}

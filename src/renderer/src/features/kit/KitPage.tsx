import { useState, type ReactNode } from 'react'
import { Copy, Heart, Pencil, Plus, Settings, Trash2 } from 'lucide-react'
import { Thumbnail } from '../../components/Thumbnail'
import {
  Badge,
  Button,
  Dialog,
  DialogFooter,
  EmptyState,
  IconButton,
  Menu,
  MenuItem,
  MenuSeparator,
  Popover,
  SegmentedControl,
  SidePanel,
  Slider,
  Toggle,
  Tooltip
} from '../../components/kit'
import { DEFAULT_PAPER } from '@shared/paper'
import { useUi } from '../../stores/ui'

function Block({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <section className="kit-block">
      <h3>{title}</h3>
      <div className="kit-row">{children}</div>
    </section>
  )
}

/** Dev-only component gallery at `#/kit`. */
export function KitPage(): JSX.Element {
  const [menu, setMenu] = useState<HTMLElement | null>(null)
  const [pop, setPop] = useState<HTMLElement | null>(null)
  const [dialog, setDialog] = useState(false)
  const [panel, setPanel] = useState(false)
  const [on, setOn] = useState(true)
  const [val, setVal] = useState(40)
  const [seg, setSeg] = useState<'before' | 'after' | 'last'>('after')
  const toast = useUi((s) => s.toast)

  return (
    <div className="kit-page">
      <h1>Quillnote component kit</h1>
      <Block title="Button">
        <Button variant="primary" icon={<Plus size={18} />}>New</Button>
        <Button variant="outline">Date</Button>
        <Button variant="ghost">Cancel</Button>
        <Button variant="danger">Move to Trash</Button>
        <Button variant="primary" disabled>Disabled</Button>
        <IconButton label="Settings"><Settings size={20} /></IconButton>
        <IconButton label="Active" active><Pencil size={20} /></IconButton>
      </Block>
      <Block title="Menu · Popover">
        <Button variant="outline" onClick={(e) => setMenu(e.currentTarget)}>Open menu</Button>
        <Button variant="outline" onClick={(e) => setPop(e.currentTarget)}>Open popover</Button>
        {menu && (
          <Menu anchor={menu} onClose={() => setMenu(null)} ignore={[menu]}>
            <MenuItem icon={<Pencil size={18} />} label="Rename" />
            <MenuItem icon={<Copy size={18} />} label="Duplicate" hint="Ctrl+D" />
            <MenuItem icon={<Heart size={18} />} label="With badge" badge="new" />
            <MenuItem label="Beta feature" badge="beta" />
            <MenuSeparator />
            <MenuItem icon={<Trash2 size={18} />} label="Move to Trash" danger />
          </Menu>
        )}
        {pop && (
          <Popover anchor={pop} onClose={() => setPop(null)} caret ignore={[pop]} style={{ width: 240, padding: 14 }}>
            <strong>Popover with caret</strong>
            <p style={{ margin: '6px 0 0', color: 'var(--text-2)', fontSize: 13 }}>Anchored to its trigger, flips when out of space.</p>
          </Popover>
        )}
      </Block>
      <Block title="Toggle">
        <Toggle checked={on} onChange={setOn} label="Demo" />
        <Toggle checked={!on} onChange={(v) => setOn(!v)} label="Demo 2" />
        <Toggle checked disabled onChange={() => undefined} label="Disabled" />
      </Block>
      <Block title="Slider">
        <div style={{ width: 280 }}><Slider value={val} onChange={setVal} ticks={11} label="Demo" /></div>
        <span>{val}</span>
      </Block>
      <Block title="Segmented">
        <SegmentedControl value={seg} onChange={setSeg} options={[{ value: 'before', label: 'Before' }, { value: 'after', label: 'After' }, { value: 'last', label: 'Last page' }]} />
      </Block>
      <Block title="Badge">
        <Badge kind="new" />
        <Badge kind="beta" />
      </Block>
      <Block title="Dialog · SidePanel · Tooltip · Toast">
        <Button variant="outline" onClick={() => setDialog(true)}>Open dialog</Button>
        <Button variant="outline" onClick={() => setPanel(true)}>Open side panel</Button>
        <Tooltip label="I am a tooltip"><Button variant="outline">Hover me</Button></Tooltip>
        <Button variant="outline" onClick={() => toast('Moved 1 item to Trash', { label: 'Undo', run: () => undefined })}>Show toast</Button>
      </Block>
      <Block title="Thumbnail">
        <Thumbnail id="a" type="notebook" cover="simple" paper={DEFAULT_PAPER} thumbAsset={null} />
        <Thumbnail id="b" type="notebook" cover="ocean" paper={DEFAULT_PAPER} thumbAsset={null} />
        <Thumbnail id="c" type="whiteboard" cover={null} paper={null} thumbAsset={null} />
        <Thumbnail id="d" type="quick" cover={null} paper={DEFAULT_PAPER} thumbAsset={null} />
        <Thumbnail id="e" type="folder" cover={null} paper={null} thumbAsset={null} />
      </Block>
      <Block title="EmptyState">
        <div style={{ width: 460, height: 300, background: 'var(--surface-2)', borderRadius: 12 }}>
          <EmptyState art="favorites" title="Find things quicker with Favorites" caption="Click ☆ to add documents or folders, or bookmark a page with 🔖" />
        </div>
      </Block>

      <Dialog open={dialog} onClose={() => setDialog(false)} label="Demo dialog" width={380}>
        <div className="dlg-pad">
          <h2 className="dlg-h">Dialog</h2>
          <p className="dlg-p">Radius 18, scrim, Escape to close.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" className="dlg-btn" onClick={() => setDialog(false)}>Cancel</Button>
          <Button variant="primary" className="dlg-btn" onClick={() => setDialog(false)}>OK</Button>
        </DialogFooter>
      </Dialog>
      <SidePanel open={panel} onClose={() => setPanel(false)} label="Demo panel">
        <div style={{ padding: 20 }}>
          <h2 style={{ marginTop: 0 }}>Side panel</h2>
          <p style={{ color: 'var(--text-2)' }}>Slides in from the right, 300px wide.</p>
        </div>
      </SidePanel>
    </div>
  )
}

import { useMemo, useRef, useState } from 'react'
import { ChevronDown, FileText, RectangleHorizontal, RectangleVertical } from 'lucide-react'
import { COVER_GROUPS, COVERS, DEFAULT_COVER, coverName, coverSvg } from '@shared/covers'
import {
  PAPER_COLORS,
  PAPER_GROUPS,
  PAPER_LANGUAGES,
  PAPER_STYLES,
  PAPER_TEMPLATES,
  templateName
} from '@shared/paper'
import type { PaperColor, PaperSpec } from '@shared/types'
import { Button, Dialog, DialogFooter, Menu, MenuItem, SegmentedControl } from '../../components/kit'
import { useLibrary } from '../../stores/library'
import { useUi } from '../../stores/ui'
import { openById, currentParent } from './actions'
import { CoverTile, PaperPreview, PaperTile } from './PaperTile'

type PillId = 'style' | 'color' | 'lang'

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  const [open, setOpen] = useState(true)
  return (
    <section className="nb-section">
      <button type="button" className="nb-section-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className={`nb-tri${open ? '' : ' closed'}`} />
        {title}
      </button>
      {open && <div className="nb-row">{children}</div>}
    </section>
  )
}

export function NewNotebookDialog(): JSX.Element {
  const settings = useUi((s) => s.settings)
  const closeDialog = useUi((s) => s.closeDialog)
  const defaults = settings?.defaultPaper
  const [title, setTitle] = useState('')
  const [cover, setCover] = useState(settings?.defaultCover ?? DEFAULT_COVER)
  const [paper, setPaper] = useState<PaperSpec>(
    defaults ?? { template: 'squared', color: 'yellow', size: 'a4', orientation: 'portrait', style: 'standard', lang: 'en-US' }
  )
  const [pane, setPane] = useState<'paper' | 'cover'>('paper')
  const [pill, setPill] = useState<{ id: PillId; el: HTMLElement } | null>(null)
  const creating = useRef(false)

  const patch = (p: Partial<PaperSpec>): void => setPaper((cur) => ({ ...cur, ...p }))
  const colorName = PAPER_COLORS.find((c) => c.id === paper.color)?.name ?? 'Paper'
  const langName = PAPER_LANGUAGES.find((l) => l.id === paper.lang)?.name ?? paper.lang
  const styleName = PAPER_STYLES.find((s) => s.id === paper.style)?.name ?? ''
  const coverHtml = useMemo(() => coverSvg(cover), [cover])

  const create = async (): Promise<void> => {
    if (creating.current) return
    creating.current = true
    const id = await useLibrary.getState().createDoc({ kind: 'notebook', title: title.trim() || undefined, parentId: currentParent(), cover, paper })
    closeDialog()
    openById(id)
    // Remember the choice as the new default for next time.
    void useUi.getState().patchSettings({ defaultPaper: paper, defaultCover: cover })
  }

  const pillBtn = (id: PillId, label: string, icon?: JSX.Element): JSX.Element => (
    <button type="button" className={`nb-pill${pill?.id === id ? ' open' : ''}`} onClick={(e) => setPill(pill?.id === id ? null : { id, el: e.currentTarget })} aria-haspopup="menu">
      {icon}
      {label}
      <ChevronDown size={14} />
    </button>
  )

  return (
    <Dialog open onClose={closeDialog} label="New Notebook" width={793} height={660} className="nb-dialog">
      <div className="nb-body">
        <div className="nb-left">
          <label className="nb-label" htmlFor="nb-title">Title</label>
          <input
            id="nb-title"
            className="nb-title-input"
            placeholder="Untitled Notebook"
            value={title}
            autoFocus
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void create()}
          />
          <div className="nb-label">Cover</div>
          <button type="button" className={`nb-cover${pane === 'cover' ? ' on' : ''}`} onClick={() => setPane('cover')} aria-label="Choose cover">
            <span className="nb-cover-art" dangerouslySetInnerHTML={{ __html: coverHtml }} />
            <span className="nb-cover-name">{coverName(cover)}</span>
          </button>
          <div className="nb-label">Paper</div>
          <button type="button" className={`nb-paper${pane === 'paper' ? ' on' : ''}`} onClick={() => setPane('paper')} aria-label="Choose paper">
            <PaperPreview spec={{ ...paper, size: 'a4', orientation: 'portrait' }} w={97} h={127} />
            <span className="nb-paper-name">{templateName(paper.template)}</span>
          </button>
        </div>

        <div className="nb-right">
          <div className="nb-pills">
            {pillBtn('style', styleName, <FileText size={18} strokeWidth={1.6} />)}
            {pillBtn('color', colorName)}
            {pillBtn('lang', langName)}
            <SegmentedControl
              variant="icons"
              ariaLabel="Orientation"
              value={paper.orientation}
              onChange={(orientation) => patch({ orientation })}
              options={[
                { value: 'portrait', icon: <RectangleVertical size={17} />, title: 'Portrait' },
                { value: 'landscape', icon: <RectangleHorizontal size={17} />, title: 'Landscape' }
              ]}
            />
          </div>
          <div className="nb-scroll">
            {pane === 'paper'
              ? PAPER_GROUPS.map((g) => (
                  <Section key={g.id} title={g.name}>
                    {PAPER_TEMPLATES.filter((t) => t.group === g.id).map((t) => (
                      <PaperTile key={t.id} name={t.name} spec={{ ...paper, template: t.id }} selected={paper.template === t.id} onSelect={() => patch({ template: t.id })} />
                    ))}
                  </Section>
                ))
              : COVER_GROUPS.map((g) => (
                  <Section key={g.id} title={g.name}>
                    {COVERS.filter((c) => c.group === g.id).map((c) => (
                      <CoverTile key={c.id} id={c.id} name={c.name} selected={cover === c.id} onSelect={() => setCover(c.id)} />
                    ))}
                  </Section>
                ))}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" className="dlg-btn" onClick={closeDialog}>Cancel</Button>
        <Button variant="primary" className="dlg-btn" onClick={() => void create()}>Create Notebook</Button>
      </DialogFooter>

      {pill?.id === 'style' && (
        <Menu anchor={pill.el} onClose={() => setPill(null)} width={200} ignore={[pill.el]}>
          {PAPER_STYLES.map((s) => (
            <MenuItem key={s.id} label={s.name} checked={paper.style === s.id} onSelect={() => { patch({ style: s.id }); setPill(null) }} />
          ))}
        </Menu>
      )}
      {pill?.id === 'color' && (
        <Menu anchor={pill.el} onClose={() => setPill(null)} width={180} ignore={[pill.el]}>
          {PAPER_COLORS.map((c) => (
            <MenuItem
              key={c.id}
              icon={<span className="swatch" style={{ background: c.swatch }} />}
              label={c.name}
              checked={paper.color === c.id}
              onSelect={() => { patch({ color: c.id as PaperColor }); setPill(null) }}
            />
          ))}
        </Menu>
      )}
      {pill?.id === 'lang' && (
        <Menu anchor={pill.el} onClose={() => setPill(null)} width={180} ignore={[pill.el]}>
          {PAPER_LANGUAGES.map((l) => (
            <MenuItem key={l.id} label={l.name} checked={paper.lang === l.id} onSelect={() => { patch({ lang: l.id }); setPill(null) }} />
          ))}
        </Menu>
      )}
    </Dialog>
  )
}

/** Stickers & GIFs popover and the Elements library popover. */
import { useEffect, useMemo, useState } from 'react'
import { Clock, Trash2 } from 'lucide-react'
import type { ElementCollection, ElementItem } from '@shared/api'
import type { PageObject } from '@shared/types'
import { Popover, SegmentedControl, type PopoverAnchor } from '../../components/kit'
import { useUi } from '../../stores/ui'
import { insertObjects, insertSticker } from './actions'
import { overlaySvg, svgDataUrl } from './render'
import { GIF_STICKERS, STARTER_ELEMENTS, STICKER_PACKS, type StickerDef } from './stickers'
import { marketStickers } from '../library/marketplace'

const RECENT_KEY = 'qn-recent-stickers'
const NONE: string[] = []

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function StickersPopover({ docId, anchor, onClose }: { docId: string; anchor: PopoverAnchor; onClose: () => void }): JSX.Element {
  const [tab, setTab] = useState<'stickers' | 'gifs'>('stickers')
  const owned = useUi((s) => s.settings?.owned ?? NONE)
  const packs = useMemo(() => [...STICKER_PACKS, ...marketStickers(owned)], [owned])
  const [pack, setPack] = useState<string>(() => (readRecent().length ? 'recent' : packs[0].id))
  const all = useMemo(() => [...packs.flatMap((p) => p.items), ...GIF_STICKERS], [packs])
  const recent = readRecent()
    .map((id) => all.find((s) => s.id === id))
    .filter(Boolean) as StickerDef[]
  const items = tab === 'gifs' ? GIF_STICKERS : pack === 'recent' ? recent : packs.find((p) => p.id === pack)?.items ?? []

  const place = (s: StickerDef): void => {
    insertSticker(docId, s.svg, s.w, s.h)
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify([s.id, ...readRecent().filter((x) => x !== s.id)].slice(0, 18)))
    } catch {
      /* storage unavailable */
    }
    onClose()
  }

  return (
    <Popover anchor={anchor} onClose={onClose} side="bottom" align="center" caret className="sticker-pop">
      <SegmentedControl value={tab} onChange={setTab} options={[{ value: 'stickers', label: 'Stickers' }, { value: 'gifs', label: 'GIFs' }]} />
      {tab === 'stickers' && (
        <div className="sticker-cats">
          <button type="button" title="Recent" className={`sticker-cat${pack === 'recent' ? ' on' : ''}`} onClick={() => setPack('recent')}>
            <Clock size={18} />
          </button>
          {packs.map((p) => (
            <button key={p.id} type="button" title={p.name} className={`sticker-cat${pack === p.id ? ' on' : ''}`} onClick={() => setPack(p.id)}>
              {p.icon}
            </button>
          ))}
        </div>
      )}
      <div className="sticker-head">{tab === 'gifs' ? 'Animated' : pack === 'recent' ? 'Recently used' : packs.find((p) => p.id === pack)?.name}</div>
      <div className="sticker-grid">
        {items.length === 0 && <div className="sticker-empty">Stickers you use will show up here.</div>}
        {items.map((s) => (
          <button key={s.id} type="button" className="sticker-item" title={s.name} onClick={() => place(s)} draggable onDragStart={(e) => e.dataTransfer.setData('application/x-qn-sticker', JSON.stringify(s))}>
            <img src={svgDataUrl(s.svg)} alt={s.name} draggable={false} />
          </button>
        ))}
      </div>
    </Popover>
  )
}

function ElementPreview({ item }: { item: ElementItem }): JSX.Element {
  const html = useMemo(() => overlaySvg({ objects: item.objects as PageObject[] }, '', { x: -4, y: -4, w: item.w + 8, h: item.h + 8 }), [item])
  return <span className="el-preview" dangerouslySetInnerHTML={{ __html: html.replace('<svg ', '<svg preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%" ') }} />
}

export function ElementsPopover({ docId, anchor, onClose }: { docId: string; anchor: PopoverAnchor; onClose: () => void }): JSX.Element {
  const [mine, setMine] = useState<ElementCollection[]>([])
  const [col, setCol] = useState<string>('')
  useEffect(() => {
    void window.quill.elements.get().then((c) => {
      setMine(c)
      setCol((cur) => cur || (c.find((x) => x.items.length)?.id ?? STARTER_ELEMENTS[0].id))
    })
  }, [])
  const all = [...mine, ...STARTER_ELEMENTS]
  const current = all.find((c) => c.id === col) ?? STARTER_ELEMENTS[0]
  const isMine = mine.some((c) => c.id === current.id)
  const remove = (itemId: string): void => {
    const next = mine.map((c) => (c.id === current.id ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c))
    setMine(next)
    void window.quill.elements.set(next)
  }
  return (
    <Popover anchor={anchor} onClose={onClose} side="bottom" align="center" caret className="sticker-pop elements-pop">
      <div className="pen-pop-title">Elements</div>
      <div className="el-cols">
        {all.map((c) => (
          <button key={c.id} type="button" className={`el-col${c.id === current.id ? ' on' : ''}`} onClick={() => setCol(c.id)}>
            {c.name}
            <span>{c.items.length}</span>
          </button>
        ))}
      </div>
      <div className="sticker-grid el-grid">
        {current.items.length === 0 && <div className="sticker-empty">Select something with the lasso and choose “Add to Elements” to save it here.</div>}
        {current.items.map((it) => (
          <div key={it.id} className="el-item">
            <button type="button" className="sticker-item" title={it.name} onClick={() => {
              insertObjects(docId, it.objects as PageObject[], it.w, it.h)
              onClose()
            }}>
              <ElementPreview item={it} />
            </button>
            {isMine && (
              <button type="button" className="el-del" aria-label="Remove element" onClick={() => remove(it.id)}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
    </Popover>
  )
}

/** Save the current lasso selection into the user's Elements library. */
export async function addToElements(objects: PageObject[], name: string): Promise<void> {
  const xs = objects.map((o) => o)
  const { unionBounds, translate } = await import('./geometry')
  const b = unionBounds(xs)
  if (!b) return
  const norm = xs.map((o) => translate(o, -b.x, -b.y))
  const cols = await window.quill.elements.get()
  const mine = cols.find((c) => c.id === 'mine') ?? { id: 'mine', name: 'My Elements', items: [] }
  const item: ElementItem = { id: crypto.randomUUID(), name, objects: norm, w: b.w, h: b.h }
  const next = [{ ...mine, items: [item, ...mine.items] }, ...cols.filter((c) => c.id !== 'mine')]
  await window.quill.elements.set(next)
  useUi.getState().toast('Added to Elements')
}

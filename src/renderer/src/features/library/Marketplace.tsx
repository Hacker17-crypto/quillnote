/** Marketplace: original planners, templates, covers and sticker packs — all free. */
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react'
import { coverSvg } from '@shared/covers'
import { DEFAULT_PAPER } from '@shared/paper'
import { useLibrary } from '../../stores/library'
import { useUi } from '../../stores/ui'
import { svgDataUrl } from '../editor/render'
import { PaperPreview } from './PaperTile'
import { openById } from './actions'
import { MARKET, type MarketCategory, type MarketItem } from './marketCatalog'

type Tab = MarketCategory | 'saved'
const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'work', label: 'Work' },
  { id: 'study', label: 'Study' },
  { id: 'life', label: 'Life' }
]

function Preview({ item, big }: { item: MarketItem; big?: boolean }): JSX.Element {
  const h = big ? 200 : 132
  if (item.paper) return <span className="mk-prev paper"><PaperPreview spec={item.paper} w={big ? 280 : 150} h={h - 16} /></span>
  if (item.cover) return <span className="mk-prev cover" dangerouslySetInnerHTML={{ __html: coverSvg(item.cover) }} />
  return (
    <span className="mk-prev stickers">
      {(item.stickers ?? []).slice(0, big ? 6 : 4).map((s) => (
        <img key={s.id} src={svgDataUrl(s.svg)} alt="" />
      ))}
    </span>
  )
}

function useMarket(): { owned: Set<string>; liked: Set<string>; get: (m: MarketItem) => void; like: (m: MarketItem) => void } {
  const settings = useUi((s) => s.settings)
  const owned = new Set(settings?.owned ?? [])
  const liked = new Set(settings?.liked ?? [])
  const patch = useUi((s) => s.patchSettings)
  const get = (m: MarketItem): void => {
    if (!owned.has(m.id)) void patch({ owned: [...owned, m.id] })
    if (m.kind === 'stickers') {
      useUi.getState().toast(`${m.title} added — find it in Stickers & GIFs`)
      return
    }
    // planners, templates and covers become a new notebook right away
    void useLibrary
      .getState()
      .createDoc({
        kind: 'notebook',
        title: m.kind === 'cover' ? undefined : m.title,
        parentId: null,
        cover: m.cover ?? settings?.defaultCover ?? 'simple',
        paper: m.paper ?? settings?.defaultPaper ?? DEFAULT_PAPER
      })
      .then(openById)
  }
  const like = (m: MarketItem): void => void patch({ liked: liked.has(m.id) ? [...liked].filter((x) => x !== m.id) : [...liked, m.id] })
  return { owned, liked, get, like }
}

function Card({ item }: { item: MarketItem }): JSX.Element {
  const { owned, liked, get, like } = useMarket()
  const have = owned.has(item.id)
  return (
    <div className="mk-card">
      <Preview item={item} />
      <span className="mk-creator">{item.creator}</span>
      <span className="mk-title">{item.title}</span>
      <span className="mk-meta">
        <span className="mk-tags">{item.tags.join(' · ')}</span>
        <button type="button" className={`mk-heart${liked.has(item.id) ? ' on' : ''}`} onClick={() => like(item)} aria-label="Save">
          <Heart size={13} fill={liked.has(item.id) ? 'currentColor' : 'none'} /> {(item.likes + (liked.has(item.id) ? 1 : 0)).toLocaleString()}
        </button>
      </span>
      <button type="button" className={`mk-get${have ? ' have' : ''}`} onClick={() => get(item)}>
        {have ? (item.kind === 'stickers' ? 'Added' : 'Use') : 'Get'}
      </button>
    </div>
  )
}

function Row({ title, items }: { title: string; items: MarketItem[] }): JSX.Element | null {
  if (!items.length) return null
  return (
    <section className="mk-row">
      <h3>{title}</h3>
      <div className="mk-strip">{items.map((m) => <Card key={m.id} item={m} />)}</div>
    </section>
  )
}

export function Marketplace(): JSX.Element {
  const [tab, setTab] = useState<Tab>('home')
  const [loading, setLoading] = useState(true)
  const [hero, setHero] = useState(0)
  const { liked, get } = useMarket()
  const featured = useMemo(() => MARKET.filter((m) => m.isNew), [])

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 650)
    return () => window.clearTimeout(t)
  }, [])
  useEffect(() => {
    const t = window.setInterval(() => setHero((h) => (h + 1) % featured.length), 6000)
    return () => window.clearInterval(t)
  }, [featured.length])

  const tabs = (
    <div className="mk-tabs">
      {TABS.map((t) => (
        <button key={t.id} type="button" className={`mk-tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
          {t.label}
        </button>
      ))}
      <button type="button" className={`mk-tab saved${tab === 'saved' ? ' on' : ''}`} onClick={() => setTab('saved')}>
        <Heart size={14} /> Saved
      </button>
    </div>
  )

  if (loading)
    return (
      <div className="mk">
        {tabs}
        <div className="mk-skel hero" />
        <div className="mk-skel-row">{Array.from({ length: 5 }, (_, i) => <div key={i} className="mk-skel card" />)}</div>
        <div className="mk-skel-row">{Array.from({ length: 5 }, (_, i) => <div key={i} className="mk-skel card" />)}</div>
      </div>
    )

  if (tab !== 'home') {
    const items = tab === 'saved' ? MARKET.filter((m) => liked.has(m.id)) : MARKET.filter((m) => m.cats.includes(tab))
    return (
      <div className="mk">
        {tabs}
        {items.length ? (
          <div className="mk-grid">{items.map((m) => <Card key={m.id} item={m} />)}</div>
        ) : (
          <p className="panel-empty">Tap ♡ on anything you like to save it here.</p>
        )}
      </div>
    )
  }

  const h = featured[hero]
  return (
    <div className="mk">
      {tabs}
      <div className="mk-hero" style={{ background: `linear-gradient(120deg, ${h.tint}, #1f2e58)` }}>
        <div className="mk-hero-text">
          <span className="mk-badge">NEW</span>
          <h2>{h.title}</h2>
          <p>{h.tags.join(' · ')} — free, by {h.creator}</p>
          <button type="button" className="mk-get big" onClick={() => get(h)}>Get it free</button>
        </div>
        <div className="mk-hero-art">
          <Preview item={h} big />
        </div>
        <button type="button" className="mk-hero-nav left" aria-label="Previous" onClick={() => setHero((hero - 1 + featured.length) % featured.length)}>
          <ChevronLeft size={20} />
        </button>
        <button type="button" className="mk-hero-nav right" aria-label="Next" onClick={() => setHero((hero + 1) % featured.length)}>
          <ChevronRight size={20} />
        </button>
        <div className="mk-dots">{featured.map((f, i) => <span key={f.id} className={i === hero ? 'on' : ''} />)}</div>
      </div>
      <Row title="Planners for 2027" items={MARKET.filter((m) => m.kind === 'planner')} />
      <div className="mk-banner">
        <div>
          <h3>Study smarter with Cornell notes</h3>
          <p>Cue column, notes and a summary box on every page.</p>
        </div>
        <button type="button" className="mk-get big" onClick={() => get(MARKET.find((m) => m.id === 'mk-cornell') as MarketItem)}>Start a notebook</button>
      </div>
      <Row title="New in" items={MARKET.filter((m) => m.isNew || m.kind === 'template').slice(0, 10)} />
      <Row title="Stickers" items={MARKET.filter((m) => m.kind === 'stickers')} />
      <Row title="Covers" items={MARKET.filter((m) => m.kind === 'cover')} />
    </div>
  )
}

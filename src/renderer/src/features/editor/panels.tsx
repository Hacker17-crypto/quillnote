/** Left side panels: Pages (grid / list / bookmarks / outline), Search, Recordings. */
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Bookmark, BookmarkCheck, ChevronDown, Copy, LayoutGrid, List, ListTree, MoreHorizontal, Pause, Play, Plus, RotateCw, Sparkles, Trash2, X, Loader2, Mic } from 'lucide-react'
import type { PageData } from '@shared/types'
import { EmptyState, Menu, MenuItem, MenuSeparator } from '../../components/kit'
import { session, useEditor, useSession, type DocSession, type SearchHit } from '../../stores/editor'
import { useUi } from '../../stores/ui'
import { addPage, deletePage, duplicatePage, goToPage, movePage, patchPage, rotatePage, toggleBookmark } from './actions'
import { PageBackground } from './PageSurface'
import { overlaySvg, assetUrl } from './render'
import { pageText } from './exporting'
import { pdfText, loadPdf } from './pdf'
import { ask, parseJson } from './ai'
import { deleteRecording, formatDuration, patchRecording, summarizeRecording, useAudioJobs } from './audio'
import { mdToHtml } from './markdown'

function PanelHead({ title, docId, children }: { title: string; docId: string; children?: React.ReactNode }): JSX.Element {
  return (
    <div className="panel-head">
      <span className="panel-title">{title}</span>
      <span className="panel-head-extra">{children}</span>
      <button type="button" className="panel-x" aria-label="Close panel" onClick={() => useEditor.getState().view(docId, { panel: null })}>
        <X size={20} />
      </button>
    </div>
  )
}

// ───────────────────────── Pages ─────────────────────────
export const PageThumb = memo(function PageThumb({ docId, page, width }: { docId: string; page: PageData; width: number }): JSX.Element {
  const h = (page.height / page.width) * width
  const overlay = useMemo(
    () => overlaySvg(page, docId, { x: 0, y: 0, w: page.width, h: page.height }).replace('<svg ', '<svg style="position:absolute;inset:0;width:100%;height:100%" '),
    [page, docId]
  )
  return (
    <div className="thumb" style={{ width, height: h }}>
      <PageBackground docId={docId} page={page} width={width} />
      <div className="thumb-ink" dangerouslySetInnerHTML={{ __html: overlay }} />
    </div>
  )
})

type PagesTab = 'grid' | 'list' | 'bookmarks' | 'outline'

export function PagesPanel({ docId }: { docId: string }): JSX.Element {
  const pages = useSession(docId, (s) => s.doc.pages)
  const current = useSession(docId, (s) => s.page)
  const isPdf = useSession(docId, (s) => s.doc.kind === 'pdf')
  const [tab, setTab] = useState<PagesTab>('grid')
  const [menu, setMenu] = useState<{ index: number; anchor: HTMLElement } | null>(null)
  const [drag, setDrag] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.querySelector(`[data-thumb="${current}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [current, tab])

  const shown = tab === 'bookmarks' ? pages.map((p, i) => [p, i] as const).filter(([p]) => p.bookmarked) : pages.map((p, i) => [p, i] as const)

  return (
    <div className="side-panel">
      <PanelHead title="Pages" docId={docId} />
      <div className="pages-tabs">
        {([['grid', <LayoutGrid key="g" size={17} />, 'Grid'], ['list', <List key="l" size={17} />, 'List'], ['bookmarks', <Bookmark key="b" size={17} />, 'Bookmarks'], ['outline', <ListTree key="o" size={17} />, 'Outline']] as const).map(([id, icon, label]) => (
          <button key={id} type="button" title={label} className={`pages-tab${tab === id ? ' on' : ''}`} onClick={() => setTab(id)}>
            {icon}
          </button>
        ))}
      </div>
      {tab === 'outline' ? (
        <OutlineList docId={docId} isPdf={isPdf} />
      ) : (
        <div ref={listRef} className={`pages-list ${tab === 'list' ? 'rows' : 'grid'}`}>
          {shown.length === 0 && <p className="panel-empty">{tab === 'bookmarks' ? 'Bookmarked pages show up here. Use More › Bookmark Page.' : 'No pages'}</p>}
          {shown.map(([p, i]) => (
            <div
              key={p.id}
              data-thumb={i}
              className={`page-item${i === current ? ' on' : ''}${over === i && drag !== null && drag !== i ? ' drop' : ''}`}
              draggable={tab !== 'bookmarks'}
              onDragStart={() => setDrag(i)}
              onDragEnd={() => {
                setDrag(null)
                setOver(null)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(i)
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (drag !== null) movePage(docId, drag, i)
                setDrag(null)
                setOver(null)
              }}
              onClick={() => goToPage(docId, i)}
              onContextMenu={(e) => {
                e.preventDefault()
                setMenu({ index: i, anchor: e.currentTarget })
              }}
            >
              <div className="page-item-thumb">
                <PageThumb docId={docId} page={p} width={tab === 'list' ? 56 : 112} />
                {p.bookmarked && <BookmarkCheck size={16} className="page-bm" />}
              </div>
              <div className="page-item-foot">
                <span className="page-num">{p.outlineTitle && tab === 'list' ? p.outlineTitle : i + 1}</span>
                <button
                  type="button"
                  className="page-more"
                  aria-label="Page options"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenu({ index: i, anchor: e.currentTarget })
                  }}
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>
            </div>
          ))}
          {tab !== 'bookmarks' && (
            <button type="button" className="page-item add" onClick={() => addPage(docId, 'last')}>
              <span className="page-add-box">
                <Plus size={22} />
              </span>
              <span className="page-num">Add page</span>
            </button>
          )}
        </div>
      )}
      {menu && (
        <Menu anchor={menu.anchor} onClose={() => setMenu(null)} width={220} side="right">
          <MenuItem icon={<Copy size={17} />} label="Duplicate" onSelect={() => { duplicatePage(docId, menu.index); setMenu(null) }} />
          <MenuItem icon={pages[menu.index]?.bookmarked ? <BookmarkCheck size={17} /> : <Bookmark size={17} />} label={pages[menu.index]?.bookmarked ? 'Remove bookmark' : 'Bookmark'} onSelect={() => { toggleBookmark(docId, menu.index); setMenu(null) }} />
          <MenuItem icon={<RotateCw size={17} />} label="Rotate right" onSelect={() => { rotatePage(docId, menu.index, 1); setMenu(null) }} />
          <MenuItem icon={<Plus size={17} />} label="Add page after" onSelect={() => { goToPage(docId, menu.index); setTimeout(() => addPage(docId, 'after'), 0); setMenu(null) }} />
          <MenuSeparator />
          <MenuItem icon={<Trash2 size={17} />} label="Delete page" danger onSelect={() => { deletePage(docId, menu.index); setMenu(null) }} />
        </Menu>
      )}
    </div>
  )
}

interface PdfOutlineItem {
  title: string
  page: number
  depth: number
}

function OutlineList({ docId, isPdf }: { docId: string; isPdf: boolean }): JSX.Element {
  const pages = useSession(docId, (s) => s.doc.pages)
  const [pdf, setPdf] = useState<PdfOutlineItem[]>([])
  const [editing, setEditing] = useState<number | null>(null)
  useEffect(() => {
    if (!isPdf) return
    let live = true
    void (async () => {
      const doc = await loadPdf(docId)
      const items = (await doc.getOutline()) ?? []
      const out: PdfOutlineItem[] = []
      const walk = async (list: typeof items, depth: number): Promise<void> => {
        for (const it of list) {
          let page = -1
          try {
            const dest = typeof it.dest === 'string' ? await doc.getDestination(it.dest) : it.dest
            if (dest?.[0]) page = await doc.getPageIndex(dest[0])
          } catch {
            /* unresolved */
          }
          out.push({ title: it.title, page, depth })
          if (it.items?.length) await walk(it.items, depth + 1)
        }
      }
      await walk(items, 0)
      if (live) setPdf(out)
    })().catch(() => undefined)
    return () => {
      live = false
    }
  }, [docId, isPdf])
  const own = pages.map((p, i) => [p, i] as const).filter(([p]) => p.outlineTitle)
  return (
    <div className="outline-list">
      {own.length === 0 && pdf.length === 0 && <p className="panel-empty">Add pages to the outline from More › Add page to Outline. PDF bookmarks appear here too.</p>}
      {own.map(([p, i]) =>
        editing === i ? (
          <input
            key={p.id}
            autoFocus
            className="q-input outline-input"
            defaultValue={p.outlineTitle}
            onBlur={(e) => {
              patchPage(docId, i, (pg) => ({ ...pg, outlineTitle: e.target.value.trim() || undefined }), false)
              setEditing(null)
            }}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur()
            }}
          />
        ) : (
          <button key={p.id} type="button" className="outline-row" onClick={() => goToPage(docId, i)} onDoubleClick={() => setEditing(i)} title="Double-click to rename">
            <span>{p.outlineTitle}</span>
            <span className="dim">{i + 1}</span>
          </button>
        )
      )}
      {pdf.length > 0 && <div className="pop-section">PDF OUTLINE</div>}
      {pdf.map((it, k) => {
        const target = pages.findIndex((p) => p.background?.type === 'pdf' && (p.background.asset ?? 'source.pdf') === 'source.pdf' && p.background.pdfPage === it.page)
        return (
          <button key={k} type="button" className="outline-row" style={{ paddingLeft: 12 + it.depth * 14 }} disabled={target < 0} onClick={() => goToPage(docId, target)}>
            <span>{it.title}</span>
            <span className="dim">{target >= 0 ? target + 1 : ''}</span>
          </button>
        )
      })}
    </div>
  )
}

// ───────────────────────── Search ─────────────────────────
type Filter = 'all' | 'handwriting' | 'typed' | 'pdf'
interface Result {
  page: number
  kind: Exclude<Filter, 'all'>
  snippet: string
  rects: SearchHit['rects']
}

function snippetAround(text: string, q: string): string {
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return text.slice(0, 120)
  const start = Math.max(0, i - 50)
  return (start ? '…' : '') + text.slice(start, i + q.length + 70).replace(/\s+/g, ' ') + (i + q.length + 70 < text.length ? '…' : '')
}

function Highlight({ text, q }: { text: string; q: string }): JSX.Element {
  if (!q) return <>{text}</>
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'))
  return <>{parts.map((p, i) => (p.toLowerCase() === q.toLowerCase() ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>))}</>
}

export function SearchPanel({ docId }: { docId: string }): JSX.Element {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [filterMenu, setFilterMenu] = useState<HTMLElement | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [busy, setBusy] = useState(false)
  const [ai, setAi] = useState<{ page: number; why: string }[] | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const pages = useSession(docId, (s) => s.doc.pages)
  const isText = useSession(docId, (s) => s.doc.kind === 'text')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    return () => useEditor.getState().view(docId, { hits: [] })
  }, [docId])

  useEffect(() => {
    const query = q.trim()
    setAi(null)
    if (!query) {
      setResults([])
      useEditor.getState().view(docId, { hits: [] })
      return
    }
    let live = true
    setBusy(true)
    const t = window.setTimeout(async () => {
      const s = session(docId)
      if (!s) return
      const out: Result[] = []
      const lq = query.toLowerCase()
      if (isText) {
        const { htmlText } = await import('./markdown')
        const txt = htmlText(s.doc.text?.html ?? '')
        let from = 0
        let n = 0
        while ((from = txt.toLowerCase().indexOf(lq, from)) >= 0 && n < 50) {
          out.push({ page: 0, kind: 'typed', snippet: snippetAround(txt.slice(Math.max(0, from - 60)), query), rects: [] })
          from += lq.length
          n++
        }
      }
      for (const [i, p] of s.doc.pages.entries()) {
        if (isText) break
        for (const o of p.objects) {
          const txt = o.type === 'text' ? (await import('./markdown')).htmlText(o.html) : o.type === 'sticky' ? o.text : ''
          if (txt && txt.toLowerCase().includes(lq) && (o.type === 'text' || o.type === 'sticky')) out.push({ page: i, kind: 'typed', snippet: snippetAround(txt, query), rects: [{ x: o.x, y: o.y, w: o.w, h: o.h }] })
        }
        if (p.ocrText?.toLowerCase().includes(lq)) out.push({ page: i, kind: 'handwriting', snippet: snippetAround(p.ocrText, query), rects: [] })
        if (p.background?.type === 'pdf') {
          const items = await pdfText(docId, p.background.asset, p.background.pdfPage ?? 0).catch(() => [])
          const hits = items.filter((it) => it.str.toLowerCase().includes(lq))
          if (hits.length) {
            const rects = hits.map((it) => {
              // narrow the rectangle to the matching characters
              const at = it.str.toLowerCase().indexOf(lq)
              const cw = it.w / Math.max(1, it.str.length)
              return { x: it.x + at * cw, y: it.y, w: Math.max(cw * lq.length, 4), h: it.h }
            })
            out.push({ page: i, kind: 'pdf', snippet: snippetAround(hits.map((h) => h.str).join(' … '), query), rects })
          }
        }
      }
      if (!live) return
      setResults(out)
      setBusy(false)
      useEditor.getState().view(docId, { hits: out.map((r) => ({ page: r.page, rects: r.rects })) })
    }, 220)
    return () => {
      live = false
      window.clearTimeout(t)
    }
  }, [q, pages, docId, isText])

  const shown = results.filter((r) => filter === 'all' || r.kind === filter)
  const FILTERS: Record<Filter, string> = { all: 'All Results', handwriting: 'Handwriting', typed: 'Typed text', pdf: 'PDF text' }

  const smart = async (): Promise<void> => {
    const s = session(docId)
    if (!s || !q.trim()) return
    setAiBusy(true)
    try {
      const lines: string[] = []
      for (const [i, p] of s.doc.pages.entries()) {
        const t = (await pageText(s.doc, p)).replace(/\s+/g, ' ').slice(0, 1500)
        if (t) lines.push(`${i + 1}: ${t}`)
      }
      if (!lines.length) {
        useUi.getState().toast('Nothing searchable yet — recognise handwriting first (More › Recognise handwriting)')
        return
      }
      const res = parseJson<{ results: { page: number; why: string }[] }>(await ask({ kind: 'search', prompt: q.trim(), text: lines.join('\n') }).promise)
      setAi((res?.results ?? []).filter((r) => r.page >= 1 && r.page <= s.doc.pages.length))
    } catch (e) {
      useUi.getState().toast(`AI search: ${e instanceof Error ? e.message : 'failed'}`)
    } finally {
      setAiBusy(false)
    }
  }

  return (
    <div className="side-panel">
      <PanelHead title="Search" docId={docId} />
      <div className="search-box">
        <input
          ref={inputRef}
          className="q-input search-input"
          value={q}
          placeholder="Search in this document"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Enter' && shown[0]) goToPage(docId, shown[0].page)
          }}
        />
        {q && (
          <button type="button" className="search-clear" aria-label="Clear" onClick={() => setQ('')}>
            <X size={15} />
          </button>
        )}
      </div>
      <div className="search-filter-row">
        <button type="button" className="search-filter" onClick={(e) => setFilterMenu(e.currentTarget)}>
          {FILTERS[filter]} <ChevronDown size={14} />
        </button>
        {q.trim() && (
          <button type="button" className="search-ai" onClick={() => void smart()} disabled={aiBusy}>
            {aiBusy ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />} Ask AI
          </button>
        )}
      </div>
      {filterMenu && (
        <Menu anchor={filterMenu} onClose={() => setFilterMenu(null)} width={200}>
          {(Object.keys(FILTERS) as Filter[]).map((f) => (
            <MenuItem key={f} label={FILTERS[f]} checked={filter === f} onSelect={() => { setFilter(f); setFilterMenu(null) }} />
          ))}
        </Menu>
      )}
      <div className="search-results">
        {ai && (
          <div className="ai-results">
            <div className="pop-section">AI MATCHES</div>
            {ai.length === 0 && <p className="panel-empty">No pages matched.</p>}
            {ai.map((r) => (
              <button key={r.page} type="button" className="result" onClick={() => goToPage(docId, r.page - 1)}>
                <span className="result-page">Page {r.page}</span>
                <span className="result-snippet">{r.why}</span>
              </button>
            ))}
          </div>
        )}
        {!q.trim() ? (
          <EmptyState art="search" title="Find everything you need" caption="Search handwritten notes, typed notes, and PDF text inside this document." />
        ) : busy && !results.length ? (
          <p className="panel-empty">Searching…</p>
        ) : shown.length === 0 ? (
          <p className="panel-empty">No results for “{q}”. Handwriting becomes searchable after More › Recognise handwriting.</p>
        ) : (
          shown.map((r, i) => (
            <button
              key={i}
              type="button"
              className="result"
              onClick={() => useEditor.getState().view(docId, { jump: { page: r.page, y: r.rects[0]?.y, nonce: Date.now() } })}
            >
              <span className="result-page">
                {isText ? 'Match' : `Page ${r.page + 1}`} · <span className="dim">{FILTERS[r.kind]}</span>
              </span>
              <span className="result-snippet">
                <Highlight text={r.snippet} q={q.trim()} />
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

// ───────────────────────── Recordings ─────────────────────────
const NO_RECS: NonNullable<DocSession['doc']['recordings']> = []
export function RecordingsPanel({ docId }: { docId: string }): JSX.Element {
  const recs = useSession(docId, (s) => s.doc.recordings ?? NO_RECS)
  const recording = useSession(docId, (s) => !!s.recording)
  const jobs = useAudioJobs((s) => s.jobs)
  const [open, setOpen] = useState<string | null>(recs[recs.length - 1]?.id ?? null)
  const [playing, setPlaying] = useState<string | null>(null)
  const [time, setTime] = useState(0)
  const audio = useRef<HTMLAudioElement | null>(null)
  const urls = useRef(new Map<string, string>())

  useEffect(
    () => () => {
      audio.current?.pause()
      urls.current.forEach((u) => URL.revokeObjectURL(u))
      useEditor.getState().view(docId, { playback: null })
    },
    [docId]
  )

  const play = async (id: string, asset: string): Promise<void> => {
    if (playing === id) {
      audio.current?.pause()
      setPlaying(null)
      return
    }
    audio.current?.pause()
    let url = urls.current.get(id)
    if (!url) {
      // load fully so seeking works regardless of the protocol's range support
      url = URL.createObjectURL(await (await fetch(assetUrl(docId, asset))).blob())
      urls.current.set(id, url)
    }
    const a = new Audio(url)
    audio.current = a
    a.ontimeupdate = () => {
      setTime(a.currentTime * 1000)
      useEditor.getState().view(docId, { playback: { rec: id, t: a.currentTime * 1000 } })
    }
    a.onended = () => {
      setPlaying(null)
      useEditor.getState().view(docId, { playback: null })
    }
    setOpen(id)
    setPlaying(id)
    await a.play()
  }

  return (
    <div className="side-panel">
      <PanelHead title="Recordings" docId={docId} />
      <div className="rec-list">
        {recs.length === 0 && (
          <div className="panel-empty center">
            <Mic size={28} />
            <p>{recording ? 'Recording… stop it to see it here.' : 'Use Audio ▾ › Record & Summarize. Notes you write while recording replay in sync with the audio.'}</p>
          </div>
        )}
        {[...recs].reverse().map((r) => {
          const job = jobs[r.id]
          const isOpen = open === r.id
          return (
            <div key={r.id} className={`rec${isOpen ? ' open' : ''}`}>
              <div className="rec-row">
                <button type="button" className="rec-play" aria-label={playing === r.id ? 'Pause' : 'Play'} onClick={() => void play(r.id, r.asset)}>
                  {playing === r.id ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <input
                  className="rec-title"
                  defaultValue={r.title}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== r.title && patchRecording(docId, r.id, { title: e.target.value.trim() })}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  }}
                />
                <span className="rec-time">{formatDuration(r.duration)}</span>
                <button type="button" className="rec-more" aria-label="Toggle details" onClick={() => setOpen(isOpen ? null : r.id)}>
                  <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : undefined }} />
                </button>
              </div>
              {playing === r.id || (audio.current && open === r.id && time > 0) ? (
                <input
                  type="range"
                  className="rec-seek"
                  min={0}
                  max={r.duration}
                  value={Math.min(time, r.duration)}
                  onChange={(e) => {
                    if (audio.current) audio.current.currentTime = Number(e.target.value) / 1000
                    setTime(Number(e.target.value))
                  }}
                />
              ) : null}
              {isOpen && (
                <div className="rec-body">
                  <div className="rec-meta">{new Date(r.createdAt).toLocaleString()}</div>
                  {job && job.stage !== 'error' && (
                    <div className="rec-job">
                      <Loader2 size={14} className="spin" />
                      {job.stage === 'downloading'
                        ? `Preparing on-device transcription${job.progress ? ` (${Math.round(job.progress)}%)` : ''}… first time only`
                        : job.stage === 'transcribing'
                          ? 'Transcribing…'
                          : 'Summarising with AI…'}
                    </div>
                  )}
                  {job?.stage === 'error' && <div className="rec-error">{job.error}</div>}
                  {r.summary && (
                    <>
                      <div className="pop-section">SUMMARY</div>
                      <div className="md" dangerouslySetInnerHTML={{ __html: mdToHtml(r.summary) }} />
                    </>
                  )}
                  {r.transcript && (
                    <>
                      <div className="pop-section">TRANSCRIPT</div>
                      <p className="rec-transcript">{r.transcript}</p>
                    </>
                  )}
                  <div className="rec-actions">
                    {!job && (
                      <button type="button" className="q-btn outline" onClick={() => void summarizeRecording(docId, r.id)}>
                        <Sparkles size={15} />
                        <span>{r.summary ? 'Summarise again' : 'Transcribe & summarise'}</span>
                      </button>
                    )}
                    <button type="button" className="q-btn ghost danger-text" onClick={() => {
                      if (playing === r.id) audio.current?.pause()
                      deleteRecording(docId, r.id)
                    }}>
                      <Trash2 size={15} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

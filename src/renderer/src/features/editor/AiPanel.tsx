/** AI side panel (local Claude Code): chat about notes, create diagrams, quizzes, lasso actions. */
import { useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { ArrowUp, Check, ChevronDown, Copy, FilePlus2, Loader2, MoreHorizontal, PanelLeftClose, PictureInPicture2, RefreshCw, Square, X, PencilLine, BookOpen, RotateCcw } from 'lucide-react'
import { uid } from '@shared/docs'
import type { AiKind } from '@shared/api'
import type { Flashcard } from '@shared/types'
import { Button, Menu, MenuItem, MenuSeparator } from '../../components/kit'
import { session, useEditor, useSession } from '../../stores/editor'
import { useUi } from '../../stores/ui'
import { insertSticker, insertTextBox, selectedObjects } from './actions'
import { ask, cleanSvg, parseJson, scopeContext, selectionImage, type AiCall } from './ai'
import { AiIcon } from './icons'
import { mdToHtml } from './markdown'
import { svgDataUrl } from './render'
import { viewCenter } from './views'

type Scope = 'page' | 'document' | 'selection'

interface Msg {
  id: string
  role: 'user' | 'assistant'
  text: string
  kind?: AiKind
  /** SVG result of Create. */
  svg?: { svg: string; w: number; h: number }
  pending?: boolean
  error?: string
  /** For regenerate. */
  request?: { kind: AiKind; prompt: string; scope: Scope }
  cards?: number
}

interface ChatState {
  chats: Record<string, Msg[]>
  push: (docId: string, m: Msg) => void
  patch: (docId: string, id: string, p: Partial<Msg>) => void
  clear: (docId: string) => void
}

export const useAiChat = create<ChatState>((set) => ({
  chats: {},
  push: (docId, m) => set((s) => ({ chats: { ...s.chats, [docId]: [...(s.chats[docId] ?? []), m] } })),
  patch: (docId, id, p) => set((s) => ({ chats: { ...s.chats, [docId]: (s.chats[docId] ?? []).map((m) => (m.id === id ? { ...m, ...p } : m)) } })),
  clear: (docId) => set((s) => ({ chats: { ...s.chats, [docId]: [] } }))
}))

const calls = new Map<string, AiCall>()
export const useStudy = create<{ docId: string | null; open: (id: string | null) => void }>((set) => ({ docId: null, open: (docId) => set({ docId }) }))

const SCOPE_LABEL: Record<Scope, string> = { page: 'This page', document: 'This document', selection: 'Selection' }

/** Run an AI request and stream it into the chat. */
export async function runAi(docId: string, kind: AiKind, prompt: string, scope: Scope, shown?: string): Promise<void> {
  const chat = useAiChat.getState()
  useEditor.getState().view(docId, { panel: 'ai' })
  chat.push(docId, { id: uid(), role: 'user', text: shown ?? prompt })
  const id = uid()
  chat.push(docId, { id, role: 'assistant', text: '', kind, pending: true, request: { kind, prompt, scope } })
  try {
    const ctx =
      kind === 'create'
        ? scope === 'page'
          ? { text: '', images: [], label: '' }
          : await scopeContext(docId, scope)
        : await scopeContext(docId, scope)
    const history = (useAiChat.getState().chats[docId] ?? [])
      .filter((m) => !m.pending && !m.error && m.text && m.kind !== 'create')
      .slice(-8)
      .map((m) => ({ role: m.role, text: m.text.slice(0, 4000) }))
    let text = ''
    const call = ask({ kind, prompt, scope: ctx.label, text: ctx.text, images: ctx.images, history: kind === 'chat' ? history.slice(0, -1) : undefined }, (t) => {
      text += t
      if (kind !== 'create' && kind !== 'quiz') useAiChat.getState().patch(docId, id, { text })
    })
    calls.set(id, call)
    const result = await call.promise
    calls.delete(id)
    if (kind === 'create') {
      const svg = cleanSvg(result)
      useAiChat.getState().patch(docId, id, svg ? { pending: false, svg, text: '' } : { pending: false, error: "Claude didn't return a drawing. Try describing it differently." })
    } else if (kind === 'quiz') {
      const data = parseJson<{ cards: { q: string; a: string }[] }>(result)
      const cards: Flashcard[] = (data?.cards ?? []).filter((c) => c.q && c.a).map((c) => ({ id: uid(), q: c.q, a: c.a, box: 0, due: 0 }))
      if (!cards.length) useAiChat.getState().patch(docId, id, { pending: false, error: "Couldn't make flashcards from these notes." })
      else {
        useEditor.getState().edit(docId, (doc) => ({ ...doc, flashcards: [...(doc.flashcards ?? []), ...cards] }), { history: false })
        useAiChat.getState().patch(docId, id, { pending: false, cards: cards.length, text: `Created **${cards.length} flashcards** from ${ctx.label}.` })
      }
    } else useAiChat.getState().patch(docId, id, { pending: false, text: result })
  } catch (e) {
    calls.delete(id)
    const msg = e instanceof Error ? e.message : 'Something went wrong'
    useAiChat.getState().patch(docId, id, { pending: false, error: msg === 'cancelled' ? 'Stopped.' : msg })
  }
}

/** Lasso → AI actions. */
export async function selectionAction(docId: string, action: 'ocr' | 'math' | 'spell' | 'ask'): Promise<void> {
  if (!selectedObjects(docId)) return
  if (action === 'ask') {
    useEditor.getState().view(docId, { panel: 'ai' })
    useAiChat.getState().push(docId, { id: uid(), role: 'assistant', text: 'Ask anything about your selection — it is attached to your next message.' })
    pendingScope.set(docId, 'selection')
    return
  }
  if (action === 'ocr') {
    const img = await selectionImage(docId)
    if (!img) return
    const chat = useAiChat.getState()
    useEditor.getState().view(docId, { panel: 'ai' })
    chat.push(docId, { id: uid(), role: 'user', text: 'Convert my handwriting to text' })
    const id = uid()
    chat.push(docId, { id, role: 'assistant', text: '', kind: 'ocr', pending: true })
    try {
      let text = ''
      const call = ask({ kind: 'ocr', images: [img.image] }, (t) => {
        text += t
        useAiChat.getState().patch(docId, id, { text })
      })
      calls.set(id, call)
      const result = (await call.promise).trim()
      calls.delete(id)
      useAiChat.getState().patch(docId, id, { pending: false, text: result, kind: 'ocr' })
      ocrTargets.set(id, { pageIndex: img.pageIndex, bounds: img.bounds, ids: selectedObjects(docId)?.objs.map((o) => o.id) ?? [] })
    } catch (e) {
      useAiChat.getState().patch(docId, id, { pending: false, error: e instanceof Error ? e.message : 'failed' })
    }
    return
  }
  await runAi(docId, action, action === 'math' ? 'Solve this' : 'Check my spelling', 'selection', action === 'math' ? 'Solve this maths' : 'Check spelling & grammar')
}

const pendingScope = new Map<string, Scope>()
const ocrTargets = new Map<string, { pageIndex: number; bounds: { x: number; y: number; w: number; h: number }; ids: string[] }>()

const EXAMPLES: { label: string; kind: AiKind; prompt: string; scope: Scope }[] = [
  { label: 'Summarize this page', kind: 'summarize', prompt: 'Summarize', scope: 'page' },
  { label: 'Quiz me on these notes', kind: 'quiz', prompt: 'Make flashcards', scope: 'document' },
  { label: 'Make a flowchart of this process', kind: 'create', prompt: 'A clear flowchart of the process described in these notes', scope: 'document' },
  { label: 'Explain this in simple terms', kind: 'chat', prompt: 'Explain the ideas on this page in simple terms, as if to a beginner.', scope: 'page' }
]

export function AiPanel({ docId, floating, onToggleFloat }: { docId: string; floating: boolean; onToggleFloat: () => void }): JSX.Element {
  const msgs = useAiChat((s) => s.chats[docId] ?? [])
  const hasSelection = useSession(docId, (s) => !!s.selection)
  const cards = useSession(docId, (s) => s.doc.flashcards?.length ?? 0)
  const [input, setInput] = useState('')
  const [scope, setScope] = useState<Scope>('page')
  const [createMode, setCreateMode] = useState(false)
  const [scopeMenu, setScopeMenu] = useState<HTMLElement | null>(null)
  const [more, setMore] = useState<HTMLElement | null>(null)
  const [status, setStatus] = useState<{ found: boolean; version: string | null } | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const busy = msgs.some((m) => m.pending)

  useEffect(() => {
    void window.quill.ai.status().then(setStatus)
  }, [])
  useEffect(() => {
    const s = pendingScope.get(docId)
    if (s) {
      setScope(s)
      pendingScope.delete(docId)
    }
  })
  useEffect(() => {
    if (!hasSelection && scope === 'selection') setScope('page')
  }, [hasSelection, scope])
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [msgs])

  const send = (): void => {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    if (createMode) void runAi(docId, 'create', text, scope === 'selection' ? 'selection' : 'page', `Create: ${text}`)
    else void runAi(docId, 'chat', text, scope)
  }

  const insert = (m: Msg): void => {
    if (m.svg) {
      insertSticker(docId, m.svg.svg, m.svg.w, m.svg.h)
      return
    }
    const target = m.kind === 'ocr' ? ocrTargets.get(m.id) : undefined
    if (target) {
      insertTextBox(docId, mdToHtml(m.text), { page: target.pageIndex, x: target.bounds.x + Math.max(target.bounds.w, 200) / 2, y: target.bounds.y }, Math.max(target.bounds.w, 200))
      return
    }
    const c = viewCenter(docId)
    insertTextBox(docId, mdToHtml(m.text), { ...c, y: Math.max(20, c.y - 80) }, 420)
  }

  const replaceWithText = (m: Msg): void => {
    const target = ocrTargets.get(m.id)
    const s = session(docId)
    if (!target || !s) return
    const page = s.doc.pages[target.pageIndex]
    const ids = new Set(target.ids)
    useEditor.getState().editObjects(docId, page.id, (objs) => objs.filter((o) => !ids.has(o.id)))
    insertTextBox(docId, mdToHtml(m.text), { page: target.pageIndex, x: target.bounds.x + Math.max(target.bounds.w, 200) / 2, y: target.bounds.y }, Math.max(target.bounds.w, 200))
    useEditor.getState().view(docId, { selection: null })
  }

  return (
    <div className={`side-panel ai-panel${floating ? ' floating' : ''}`}>
      <div className="panel-head ai-head">
        <button type="button" className="panel-x" aria-label="AI options" onClick={(e) => setMore(e.currentTarget)}>
          <MoreHorizontal size={20} />
        </button>
        <button type="button" className="panel-x" aria-label={floating ? 'Dock panel' : 'Float panel'} title={floating ? 'Dock' : 'Float'} onClick={onToggleFloat}>
          {floating ? <PanelLeftClose size={19} /> : <PictureInPicture2 size={19} />}
        </button>
        <span style={{ flex: 1 }} />
        <button type="button" className="panel-x" aria-label="Close" onClick={() => useEditor.getState().view(docId, { panel: null })}>
          <X size={20} />
        </button>
      </div>
      {more && (
        <Menu anchor={more} onClose={() => setMore(null)} width={220}>
          <MenuItem label="New chat" onSelect={() => { useAiChat.getState().clear(docId); setMore(null) }} />
          <MenuItem label="Study flashcards" hint={String(cards)} disabled={!cards} onSelect={() => { useStudy.getState().open(docId); setMore(null) }} />
          <MenuSeparator />
          <MenuItem label="Clear flashcards" danger disabled={!cards} onSelect={() => { useEditor.getState().edit(docId, (d) => ({ ...d, flashcards: [] }), { history: false }); setMore(null) }} />
        </Menu>
      )}
      <div className="ai-body" ref={listRef}>
        {status && !status.found && (
          <div className="ai-warn">
            <b>Claude Code isn't installed.</b> Quillnote's AI runs through your local Claude Code. Install it from claude.ai/code, sign in once by running <code>claude</code> in a terminal, then reopen this panel.
          </div>
        )}
        {msgs.length === 0 ? (
          <>
            <h2 className="ai-greeting">Hello! How can I help you with your notes?</h2>
            <div className="ai-card">
              <div className="ai-card-head">
                <AiIcon size={22} />
                <span>Let's bring your idea to life! What's on your mind to create today?</span>
              </div>
              <div className="ai-examples">
                <div className="pop-section">TRY EXAMPLES</div>
                {EXAMPLES.map((ex) => (
                  <button key={ex.label} type="button" className="ai-example" onClick={() => void runAi(docId, ex.kind, ex.prompt, ex.scope, ex.label)}>
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          msgs.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="ai-msg user">{m.text}</div>
            ) : (
              <div key={m.id} className="ai-msg bot">
                {m.pending && !m.text && (
                  <div className="ai-thinking">
                    <Loader2 size={16} className="spin" /> {m.kind === 'create' ? 'Drawing…' : m.kind === 'quiz' ? 'Writing flashcards…' : 'Thinking…'}
                    <button type="button" className="ai-stop" onClick={() => calls.get(m.id)?.cancel()} aria-label="Stop">
                      <Square size={11} fill="currentColor" />
                    </button>
                  </div>
                )}
                {m.error && <div className="ai-error">{m.error}</div>}
                {m.svg && <img className="ai-svg" src={svgDataUrl(m.svg.svg)} alt="Created drawing" />}
                {m.text && <div className="md" dangerouslySetInnerHTML={{ __html: mdToHtml(m.text) }} />}
                {!m.pending && !m.error && (m.text || m.svg) && (
                  <div className="ai-actions">
                    {m.cards ? (
                      <button type="button" onClick={() => useStudy.getState().open(docId)}>
                        <BookOpen size={14} /> Study
                      </button>
                    ) : (
                      <button type="button" onClick={() => insert(m)}>
                        <FilePlus2 size={14} /> Insert on page
                      </button>
                    )}
                    {m.kind === 'ocr' && ocrTargets.has(m.id) && (
                      <button type="button" onClick={() => replaceWithText(m)}>
                        <Check size={14} /> Replace with text box
                      </button>
                    )}
                    {m.text && !m.cards && (
                      <button type="button" onClick={() => void navigator.clipboard.writeText(m.text).then(() => useUi.getState().toast('Copied'))}>
                        <Copy size={14} /> Copy
                      </button>
                    )}
                    {m.request && (
                      <button type="button" onClick={() => m.request && void runAi(docId, m.request.kind, m.request.prompt, m.request.scope, 'Try again')}>
                        <RefreshCw size={14} /> Regenerate
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          )
        )}
      </div>
      <div className="ai-composer">
        <textarea
          className="ai-input"
          rows={2}
          value={input}
          placeholder={createMode ? 'Describe a diagram, chart or drawing…' : 'Ask about anything'}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <div className="ai-composer-row">
          <button type="button" className="ai-chip" onClick={(e) => setScopeMenu(e.currentTarget)}>
            <AiIcon size={15} /> {SCOPE_LABEL[scope]} <ChevronDown size={13} />
          </button>
          <button type="button" className={`ai-chip${createMode ? ' on' : ''}`} onClick={() => setCreateMode(!createMode)}>
            <PencilLine size={15} /> Create
          </button>
          <span style={{ flex: 1 }} />
          <button type="button" className="ai-send" aria-label="Send" disabled={!input.trim() || busy} onClick={send}>
            <ArrowUp size={18} />
          </button>
        </div>
        <div className="ai-caption">AI content may be inaccurate</div>
      </div>
      {scopeMenu && (
        <Menu anchor={scopeMenu} onClose={() => setScopeMenu(null)} width={200} side="top">
          {(Object.keys(SCOPE_LABEL) as Scope[]).map((s) => (
            <MenuItem key={s} label={SCOPE_LABEL[s]} checked={scope === s} disabled={s === 'selection' && !hasSelection} onSelect={() => { setScope(s); setScopeMenu(null) }} />
          ))}
        </Menu>
      )}
    </div>
  )
}

// ───────────────────────── Study mode ─────────────────────────
const BOX_DAYS = [0, 1, 3, 7, 16, 35]

export function StudyOverlay(): JSX.Element | null {
  const docId = useStudy((s) => s.docId)
  const cards = useSession(docId ?? '', (s) => s.doc.flashcards ?? [])
  const [queue, setQueue] = useState<string[]>([])
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(0)

  useEffect(() => {
    if (!docId) return
    const now = Date.now()
    const due = cards.filter((c) => c.due <= now)
    setQueue((due.length ? due : cards).map((c) => c.id))
    setDone(0)
    setFlipped(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId])

  if (!docId) return null
  const card = cards.find((c) => c.id === queue[0])
  const close = (): void => useStudy.getState().open(null)
  const grade = (ok: boolean): void => {
    if (!card) return
    const box = ok ? Math.min(BOX_DAYS.length - 1, card.box + 1) : 0
    useEditor.getState().edit(docId, (d) => ({ ...d, flashcards: (d.flashcards ?? []).map((c) => (c.id === card.id ? { ...c, box, due: Date.now() + BOX_DAYS[box] * 86_400_000 } : c)) }), { history: false })
    setFlipped(false)
    setQueue((q) => (ok ? q.slice(1) : [...q.slice(1), q[0]]))
    if (ok) setDone((n) => n + 1)
  }

  return (
    <div className="study" onKeyDown={(e) => e.stopPropagation()}>
      <div className="study-top">
        <span>Flashcards · {done} learned · {queue.length} to go</span>
        <button type="button" className="panel-x" aria-label="Close study mode" onClick={close}>
          <X size={22} />
        </button>
      </div>
      {card ? (
        <>
          <button type="button" className={`study-card${flipped ? ' flipped' : ''}`} onClick={() => setFlipped(!flipped)}>
            <span className="study-face front">
              <small>QUESTION</small>
              {card.q}
            </span>
            <span className="study-face back">
              <small>ANSWER</small>
              {card.a}
            </span>
          </button>
          <div className="study-actions">
            {flipped ? (
              <>
                <Button variant="outline" onClick={() => grade(false)}>
                  <RotateCcw size={16} /> Again
                </Button>
                <Button variant="primary" onClick={() => grade(true)}>
                  <Check size={16} /> Got it
                </Button>
              </>
            ) : (
              <Button variant="primary" onClick={() => setFlipped(true)}>Show answer</Button>
            )}
          </div>
        </>
      ) : (
        <div className="study-done">
          <h2>All done! 🎉</h2>
          <p>You've reviewed every card that was due. Cards you know come back less often.</p>
          <Button variant="primary" onClick={close}>Close</Button>
        </div>
      )}
    </div>
  )
}

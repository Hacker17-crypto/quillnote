/** Account side panel (from the Settings icon) and the Settings screens. */
import { useEffect, useState } from 'react'
import { BookOpen, ChevronLeft, ChevronRight, CircleHelp, Info, LayoutTemplate, Plug, Settings as SettingsIcon, ShieldCheck, Sparkles } from 'lucide-react'
import { COVERS, coverName } from '@shared/covers'
import { PAPER_COLORS, PAPER_LANGUAGES, PAPER_TEMPLATES } from '@shared/paper'
import type { ClaudeStatus } from '@shared/api'
import { Button, Dialog, SegmentedControl, SidePanel, Toggle } from '../../components/kit'
import { useUi } from '../../stores/ui'

type Page = 'home' | 'preferences' | 'integrations' | 'acknowledgements' | 'privacy' | 'about' | 'help'

export function AccountPanel({ open, onClose }: { open: boolean; onClose: () => void }): JSX.Element | null {
  const settings = useUi((s) => s.settings)
  const [page, setPage] = useState<Page | null>(null)
  const [editName, setEditName] = useState(false)
  const name = settings?.profileName || 'Quillnote User'
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const row = (icon: JSX.Element, label: string, to: Page | (() => void)): JSX.Element => (
    <button type="button" className="acct-row" onClick={() => (typeof to === 'function' ? to() : setPage(to))}>
      <span className="acct-row-ico">{icon}</span>
      <span>{label}</span>
      <ChevronRight size={18} className="dim" />
    </button>
  )
  return (
    <>
      <SidePanel open={open} onClose={onClose} label="Account" side="right" width={320}>
        <div className="acct">
          <div className="acct-head">
            <span className="acct-avatar">{initials}</span>
            <div className="acct-id">
              {editName ? (
                <input
                  autoFocus
                  className="q-input"
                  defaultValue={name}
                  onBlur={(e) => {
                    setEditName(false)
                    if (e.target.value.trim()) void useUi.getState().patchSettings({ profileName: e.target.value.trim() })
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                />
              ) : (
                <button type="button" className="acct-name" title="Click to change your name" onClick={() => setEditName(true)}>
                  {name}
                </button>
              )}
              <span className="acct-sub">
                Local profile <span className="acct-pro">Pro</span>
              </span>
            </div>
          </div>
          <div className="acct-card">
            <Sparkles size={20} />
            <div>
              <b>All features unlocked</b>
              <span>Every tool, template and AI feature is included. Your notes stay on this computer.</span>
            </div>
          </div>
          <div className="acct-rows">
            {row(<LayoutTemplate size={19} />, 'Manage Notebook Templates', () => {
              onClose()
              useUi.getState().setNav('marketplace')
            })}
            {row(<SettingsIcon size={19} />, 'Settings', 'preferences')}
            {row(<Plug size={19} />, 'Integrations', 'integrations')}
            {row(<CircleHelp size={19} />, 'Help', 'help')}
            {row(<Info size={19} />, 'About', 'about')}
          </div>
        </div>
      </SidePanel>
      {page && <SettingsDialog page={page} onPage={setPage} onClose={() => setPage(null)} />}
    </>
  )
}

function SettingsDialog({ page, onPage, onClose }: { page: Page; onPage: (p: Page) => void; onClose: () => void }): JSX.Element {
  const s = useUi((st) => st.settings)
  const patch = (p: Parameters<ReturnType<typeof useUi.getState>['patchSettings']>[0]): void => void useUi.getState().patchSettings(p)
  const [claude, setClaude] = useState<ClaudeStatus | null>(null)
  useEffect(() => {
    if (page === 'integrations' || page === 'preferences') void window.quill.claude.status().then(setClaude)
  }, [page, s?.claudePath])
  if (!s) return <></>
  const g = { doubleTapEraser: true, scribbleErase: true, drawAndHold: true, circleLasso: false, ...s.gestures }
  const titles: Record<Page, string> = {
    home: 'Settings', preferences: 'Preferences', integrations: 'Integrations', acknowledgements: 'Acknowledgements', privacy: 'Privacy', about: 'About Quillnote', help: 'Help'
  }
  const Row = ({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }): JSX.Element => (
    <div className="set-row">
      <span className="set-label">
        {label}
        {sub && <small>{sub}</small>}
      </span>
      <span className="set-ctl">{children}</span>
    </div>
  )
  const Link = ({ label, to }: { label: string; to: Page }): JSX.Element => (
    <button type="button" className="set-row link" onClick={() => onPage(to)}>
      <span className="set-label">{label}</span>
      <ChevronRight size={18} className="dim" />
    </button>
  )
  let body: JSX.Element
  switch (page) {
    case 'preferences':
      body = (
        <>
          <div className="set-section">APPEARANCE</div>
          <Row label="Theme">
            <SegmentedControl value={s.theme} onChange={(theme) => patch({ theme })} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
          </Row>
          <div className="set-section">NEW NOTEBOOKS</div>
          <Row label="Default template">
            <select className="q-select" value={s.defaultPaper.template} onChange={(e) => patch({ defaultPaper: { ...s.defaultPaper, template: e.target.value } })}>
              {PAPER_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Row>
          <Row label="Default paper colour">
            <select className="q-select" value={s.defaultPaper.color} onChange={(e) => patch({ defaultPaper: { ...s.defaultPaper, color: e.target.value as typeof s.defaultPaper.color } })}>
              {PAPER_COLORS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Row>
          <Row label="Default cover">
            <select className="q-select" value={s.defaultCover} onChange={(e) => patch({ defaultCover: e.target.value })}>
              {COVERS.map((c) => <option key={c.id} value={c.id}>{coverName(c.id)}</option>)}
            </select>
          </Row>
          <Row label="Template language" sub="Labels on planner pages">
            <select className="q-select" value={s.defaultPaper.lang} onChange={(e) => patch({ defaultPaper: { ...s.defaultPaper, lang: e.target.value } })}>
              {PAPER_LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Row>
          <div className="set-section">WRITING</div>
          <Row label="Scrolling direction">
            <SegmentedControl value={s.scrollDirection} onChange={(scrollDirection) => patch({ scrollDirection })} options={[{ value: 'vertical', label: 'Vertical' }, { value: 'horizontal', label: 'Horizontal' }]} />
          </Row>
          <Row label="Only draw with stylus" sub="Fingers scroll and zoom; palm touches are ignored">
            <Toggle checked={s.onlyDrawWithStylus} onChange={(onlyDrawWithStylus) => patch({ onlyDrawWithStylus })} label="Only draw with stylus" />
          </Row>
          <Row label="Scribble to erase" sub="Zig-zag over writing with the pen to remove it">
            <Toggle checked={g.scribbleErase} onChange={(v) => patch({ gestures: { ...g, scribbleErase: v } })} label="Scribble to erase" />
          </Row>
          <Row label="Pen eraser" sub="The eraser end or barrel button of a stylus erases">
            <Toggle checked={g.doubleTapEraser} onChange={(v) => patch({ gestures: { ...g, doubleTapEraser: v } })} label="Pen eraser" />
          </Row>
          <div className="set-section">STORAGE</div>
          <Row label="Library location" sub={s.libraryRoot}>
            <Button variant="outline" onClick={() => void window.quill.settings.pickLibraryFolder().then((n) => n && useUi.getState().setSettings(n)).then(() => import('../../stores/library').then((m) => m.useLibrary.getState().load()))}>
              Change…
            </Button>
          </Row>
          <Row label="Automatic backups" sub={s.backupFolder ? `Saved to ${s.backupFolder}` : 'Off — choose a folder to keep .quill copies of every document'}>
            {s.backupFolder ? (
              <Button variant="outline" onClick={() => patch({ backupFolder: '' })}>Turn off</Button>
            ) : (
              <Button variant="outline" onClick={() => void window.quill.settings.pickFolder('Choose a backup folder').then((f) => f && patch({ backupFolder: f }))}>Choose…</Button>
            )}
          </Row>
          <div className="set-section">AI</div>
          <Row label="Claude Code" sub={claude?.found ? `${claude.path}${claude.version ? ` · v${claude.version}` : ''}` : 'Not found'}>
            <Button variant="outline" onClick={() => void window.quill.settings.pickFile('Locate the claude executable').then((f) => f && patch({ claudePath: f }))}>Locate…</Button>
          </Row>
        </>
      )
      break
    case 'integrations':
      body = (
        <>
          <div className="int-card">
            <span className={`int-dot ${claude?.found ? 'ok' : 'bad'}`} />
            <div>
              <b>Claude Code</b>
              <span>{claude === null ? 'Checking…' : claude.found ? `Connected${claude.version ? ` · v${claude.version}` : ''}` : 'Not found'}</span>
            </div>
          </div>
          <p className="set-text">
            Quillnote's AI features (chat, handwriting recognition, summaries, quizzes, diagrams) run through the Claude Code app installed on this computer — no API key is stored here.
          </p>
          {!claude?.found && (
            <ol className="set-text">
              <li>Install Claude Code from <a href="https://claude.ai/code" onClick={(e) => { e.preventDefault(); window.quill.app.openExternal('https://claude.ai/code') }}>claude.ai/code</a>.</li>
              <li>Open a terminal and run <code>claude</code> once to sign in.</li>
              <li>Come back here — Quillnote finds it automatically, or use Preferences › Claude Code › Locate….</li>
            </ol>
          )}
          <Button variant="outline" onClick={() => void window.quill.claude.status().then(setClaude)}>Check again</Button>
        </>
      )
      break
    case 'acknowledgements':
      body = (
        <ul className="ack">
          <li><b>Figtree</b> — SIL Open Font License 1.1</li>
          <li><b>Caveat</b> — SIL Open Font License 1.1</li>
          <li><b>Lucide icons</b> — ISC License</li>
          <li><b>Electron</b>, <b>React</b>, <b>Zustand</b>, <b>Vite</b> — MIT License</li>
          <li><b>perfect-freehand</b> — MIT License</li>
          <li><b>pdf.js</b> — Apache License 2.0</li>
          <li><b>pdf-lib</b>, <b>fflate</b> — MIT License</li>
          <li><b>transformers.js</b> and the <b>Whisper</b> model (downloaded on first use) — Apache 2.0 / MIT</li>
        </ul>
      )
      break
    case 'privacy':
      body = (
        <p className="set-text">
          Everything you write stays on this computer, in your library folder. There is no account and no cloud sync. AI requests are sent through your local Claude Code app only when you use an AI feature, and audio is transcribed on this device.
        </p>
      )
      break
    case 'help':
      body = (
        <ul className="ack">
          <li><b>Pen</b> P · <b>Highlighter</b> H · <b>Shape</b> S · <b>Eraser</b> E · <b>Lasso</b> L · <b>Text</b> T</li>
          <li><b>Undo / Redo</b> Ctrl+Z / Ctrl+Shift+Z · <b>Copy, cut, paste, duplicate</b> Ctrl+C / X / V / D</li>
          <li><b>Zoom</b> Ctrl+scroll, pinch, Ctrl+= / Ctrl+− · <b>Fit</b> Ctrl+0 · <b>Pan</b> Space+drag or middle-drag</li>
          <li><b>Search</b> Ctrl+F · <b>AI</b> Ctrl+Shift+A · <b>Print</b> Ctrl+P · <b>Close tab</b> Ctrl+W · <b>Next tab</b> Ctrl+Tab</li>
          <li>Hold at the end of a stroke to turn it into a perfect line or shape.</li>
          <li>Hold Alt while moving objects to switch off snapping guides. Alt+scroll rotates the ruler.</li>
        </ul>
      )
      break
    case 'about':
      body = (
        <div className="about">
          <BookOpen size={36} />
          <h3>Quillnote {window.quill.app.version}</h3>
          <p className="set-text">Handwriting and note-taking for Windows and macOS. Made for personal use.</p>
        </div>
      )
      break
    default:
      body = (
        <>
          <Link label="Preferences" to="preferences" />
          <Link label="Integrations" to="integrations" />
          <Link label="Acknowledgements" to="acknowledgements" />
          <Link label="Privacy" to="privacy" />
        </>
      )
  }
  return (
    <Dialog open onClose={onClose} width={620} height={640} label={titles[page]} className="settings-dialog">
      <div className="set-head">
        {page !== 'home' ? (
          <button type="button" className="set-back" onClick={() => onPage('home')} aria-label="Back">
            <ChevronLeft size={22} />
          </button>
        ) : (
          <ShieldCheck size={20} className="dim" />
        )}
        <h3>{titles[page]}</h3>
      </div>
      <div className="set-body">{body}</div>
    </Dialog>
  )
}

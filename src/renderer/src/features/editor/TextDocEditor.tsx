/** Rich text documents: a page-width writing surface with a formatting bar. */
import { useEffect, useRef, useState } from 'react'
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Code, Heading1, Heading2, Heading3, Highlighter, Image as ImageIcon, Italic, Link, List, ListChecks,
  ListOrdered, Minus, Quote, Redo2, Strikethrough, Underline, Undo2, Pilcrow, Type
} from 'lucide-react'
import { useEditor, useSession } from '../../stores/editor'
import { ColorPicker } from './ColorPicker'
import { assetUrl } from './render'

export function TextDocEditor({ docId }: { docId: string }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const html = useSession(docId, (s) => s.doc.text?.html ?? '')
  const title = useSession(docId, (s) => s.doc.title)
  const timer = useRef(0)
  const [color, setColor] = useState<{ anchor: HTMLElement; mode: 'fore' | 'hilite' } | null>(null)
  const [words, setWords] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = html
    countWords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId])

  const countWords = (): void => setWords((ref.current?.innerText.match(/\S+/g) ?? []).length)

  const save = (): void => {
    const el = ref.current
    if (!el) return
    const next = el.innerHTML
    useEditor.getState().edit(docId, (doc) => (doc.text?.html === next ? doc : { ...doc, text: { html: next } }), { history: false })
    countWords()
  }
  const exec = (cmd: string, arg?: string): void => {
    ref.current?.focus()
    document.execCommand(cmd, false, arg)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(save, 300)
  }
  const block = (tag: string): void => exec('formatBlock', tag)
  const keep = (e: React.MouseEvent): void => e.preventDefault()

  const insertImage = async (): Promise<void> => {
    const [a] = await window.quill.doc.pickImages(docId)
    if (a) exec('insertHTML', `<img src="${assetUrl(docId, a.asset)}" alt="" style="max-width:100%"/>`)
  }

  return (
    <div className="textdoc">
      <div className="textdoc-bar" onMouseDown={keep}>
        <button type="button" title="Undo" onClick={() => exec('undo')}><Undo2 size={17} /></button>
        <button type="button" title="Redo" onClick={() => exec('redo')}><Redo2 size={17} /></button>
        <span className="sb-sep" />
        <button type="button" title="Normal text" onClick={() => block('p')}><Pilcrow size={17} /></button>
        <button type="button" title="Heading 1" onClick={() => block('h1')}><Heading1 size={18} /></button>
        <button type="button" title="Heading 2" onClick={() => block('h2')}><Heading2 size={18} /></button>
        <button type="button" title="Heading 3" onClick={() => block('h3')}><Heading3 size={18} /></button>
        <span className="sb-sep" />
        <button type="button" title="Bold (Ctrl+B)" onClick={() => exec('bold')}><Bold size={17} /></button>
        <button type="button" title="Italic (Ctrl+I)" onClick={() => exec('italic')}><Italic size={17} /></button>
        <button type="button" title="Underline (Ctrl+U)" onClick={() => exec('underline')}><Underline size={17} /></button>
        <button type="button" title="Strikethrough" onClick={() => exec('strikeThrough')}><Strikethrough size={17} /></button>
        <button type="button" title="Text colour" onClick={(e) => setColor({ anchor: e.currentTarget, mode: 'fore' })}><Type size={17} /></button>
        <button type="button" title="Highlight" onClick={(e) => setColor({ anchor: e.currentTarget, mode: 'hilite' })}><Highlighter size={17} /></button>
        <span className="sb-sep" />
        <button type="button" title="Bulleted list" onClick={() => exec('insertUnorderedList')}><List size={17} /></button>
        <button type="button" title="Numbered list" onClick={() => exec('insertOrderedList')}><ListOrdered size={17} /></button>
        <button type="button" title="Checklist" onClick={() => exec('insertHTML', '<ul class="qn-check"><li data-checked="false">&#8203;</li></ul>')}><ListChecks size={17} /></button>
        <button type="button" title="Quote" onClick={() => block('blockquote')}><Quote size={17} /></button>
        <button type="button" title="Code" onClick={() => block('pre')}><Code size={17} /></button>
        <span className="sb-sep" />
        <button type="button" title="Align left" onClick={() => exec('justifyLeft')}><AlignLeft size={17} /></button>
        <button type="button" title="Centre" onClick={() => exec('justifyCenter')}><AlignCenter size={17} /></button>
        <button type="button" title="Align right" onClick={() => exec('justifyRight')}><AlignRight size={17} /></button>
        <span className="sb-sep" />
        <button type="button" title="Link" onClick={() => {
          const url = window.prompt('Link address', 'https://')
          if (url && /^https?:\/\//.test(url)) exec('createLink', url)
        }}><Link size={17} /></button>
        <button type="button" title="Image" onClick={() => void insertImage()}><ImageIcon size={17} /></button>
        <button type="button" title="Divider" onClick={() => exec('insertHorizontalRule')}><Minus size={17} /></button>
      </div>
      <div className="textdoc-scroll">
        <div className="textdoc-page">
          <h1 className="textdoc-title">{title}</h1>
          <div
            ref={ref}
            className="textdoc-body"
            contentEditable
            suppressContentEditableWarning
            spellCheck
            data-placeholder="Start writing…"
            onInput={() => {
              window.clearTimeout(timer.current)
              timer.current = window.setTimeout(save, 400)
            }}
            onBlur={save}
            onClick={(e) => {
              // tick checklist items
              const li = (e.target as HTMLElement).closest('ul.qn-check > li') as HTMLElement | null
              if (li && e.nativeEvent.offsetX < 22) {
                li.dataset.checked = li.dataset.checked === 'true' ? 'false' : 'true'
                save()
              }
              const a = (e.target as HTMLElement).closest('a')
              if (a && (e.ctrlKey || e.metaKey)) window.quill.app.openExternal(a.href)
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text/plain')
              if (!text || e.clipboardData.types.includes('text/html')) return
              e.preventDefault()
              document.execCommand('insertText', false, text)
            }}
          />
        </div>
      </div>
      <div className="textdoc-status">{words} {words === 1 ? 'word' : 'words'}</div>
      {color && (
        <ColorPicker
          anchor={color.anchor}
          value={color.mode === 'fore' ? '#1F2430' : '#FFE24D'}
          onChange={(c) => exec(color.mode === 'fore' ? 'foreColor' : 'hiliteColor', c)}
          onClose={() => setColor(null)}
        />
      )}
    </div>
  )
}

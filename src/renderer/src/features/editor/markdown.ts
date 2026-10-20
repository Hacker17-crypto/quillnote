/** Small, safe Markdown ⇄ HTML helpers for AI answers, text boxes and Markdown export. */

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)

function inline(s: string): string {
  let out = esc(s)
  const codes: string[] = []
  out = out.replace(/`([^`]+)`/g, (_, c: string) => {
    codes.push(`<code>${c}</code>`)
    return `\u0000${codes.length - 1}\u0000`
  })
  out = out
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^\w])_([^_\s][^_]*)_(?=[^\w]|$)/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<s>$1</s>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
  return out.replace(/\u0000(\d+)\u0000/g, (_, i: string) => codes[Number(i)])
}

/** Markdown → HTML (headings, lists, task lists, quotes, code blocks, tables, rules). */
export function mdToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (/^```/.test(line)) {
      const buf: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++])
      i++
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`)
      continue
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line)
    if (h) {
      const lvl = Math.min(h[1].length, 4)
      out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`)
      i++
      continue
    }
    if (/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(line)) {
      out.push('<hr/>')
      i++
      continue
    }
    if (/^\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const cells = (l: string): string[] => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      const head = cells(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]))
      out.push(`<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`)
      continue
    }
    if (/^\s*>/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''))
      out.push(`<blockquote>${mdToHtml(buf.join('\n'))}</blockquote>`)
      continue
    }
    const li = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line)
    if (li) {
      const ordered = /\d/.test(li[2])
      const items: string[] = []
      let task = false
      while (i < lines.length) {
        const m = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(lines[i])
        if (!m) {
          if (/^\s{2,}\S/.test(lines[i]) && items.length) {
            items[items.length - 1] += ' ' + inline(lines[i].trim())
            i++
            continue
          }
          break
        }
        const t = /^\[([ xX])\]\s+(.*)$/.exec(m[3])
        if (t) {
          task = true
          items.push(`<li data-checked="${t[1] !== ' '}">${inline(t[2])}</li>`)
        } else items.push(`<li>${inline(m[3])}</li>`)
        i++
      }
      const tag = ordered ? 'ol' : 'ul'
      out.push(`<${tag}${task ? ' class="qn-check"' : ''}>${items.join('')}</${tag}>`)
      continue
    }
    if (!line.trim()) {
      i++
      continue
    }
    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|\s*>|\s*([-*+]|\d+[.)])\s)/.test(lines[i])) para.push(inline(lines[i++]))
    out.push(`<p>${para.join('<br/>')}</p>`)
  }
  return out.join('')
}

/** HTML (text boxes, text documents) → Markdown. */
export function htmlToMd(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const walk = (node: Node, ctx: { list?: 'ul' | 'ol'; n?: number; depth: number }): string => {
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').replace(/\s+/g, ' ')
    if (!(node instanceof HTMLElement)) return ''
    const kids = (c = ctx): string => Array.from(node.childNodes).map((k) => walk(k, c)).join('')
    switch (node.tagName) {
      case 'H1':
        return `\n# ${kids().trim()}\n\n`
      case 'H2':
        return `\n## ${kids().trim()}\n\n`
      case 'H3':
      case 'H4':
        return `\n### ${kids().trim()}\n\n`
      case 'P':
      case 'DIV':
        return `${kids().trim()}\n\n`
      case 'BR':
        return '  \n'
      case 'B':
      case 'STRONG':
        return `**${kids()}**`
      case 'I':
      case 'EM':
        return `*${kids()}*`
      case 'S':
      case 'STRIKE':
      case 'DEL':
        return `~~${kids()}~~`
      case 'CODE':
        return `\`${kids()}\``
      case 'PRE':
        return `\n\`\`\`\n${node.textContent ?? ''}\n\`\`\`\n\n`
      case 'A':
        return `[${kids()}](${node.getAttribute('href') ?? ''})`
      case 'BLOCKQUOTE':
        return kids()
          .trim()
          .split('\n')
          .map((l) => `> ${l}`)
          .join('\n') + '\n\n'
      case 'HR':
        return '\n---\n\n'
      case 'UL':
      case 'OL': {
        let n = 0
        const items = Array.from(node.children).map((li) => {
          n++
          const pad = '  '.repeat(ctx.depth)
          const checked = li.getAttribute('data-checked')
          const bullet = node.tagName === 'OL' ? `${n}.` : checked !== null || node.classList.contains('qn-check') ? `- [${checked === 'true' ? 'x' : ' '}]` : '-'
          return `${pad}${bullet} ${walk(li, { depth: ctx.depth + 1 }).trim()}`
        })
        return `${items.join('\n')}\n\n`
      }
      case 'LI':
        return kids()
      case 'IMG':
        return ''
      default:
        return kids()
    }
  }
  return walk(doc.body.firstChild as Node, { depth: 0 })
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Plain text of an HTML fragment. */
export function htmlText(html: string): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(`<div>${html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d)>/gi, '\n$&')}</div>`, 'text/html')
  return (doc.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim()
}

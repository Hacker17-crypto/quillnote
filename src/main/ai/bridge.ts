/**
 * Runs the local Claude Code CLI for AI requests: one temp folder per request (page images as PNG),
 * prompt on stdin, `--allowedTools Read` only, streamed output relayed to the renderer.
 */
import { spawn, type ChildProcess } from 'child_process'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { WebContents } from 'electron'
import type { AiEvent, AiRequest } from '@shared/api'
import { claudeStatus } from '../claude'
import { loadSettings } from '../settings'
import { buildPrompt, JSON_KINDS } from './prompts'

const TIMEOUT_MS = 180_000
const running = new Map<string, ChildProcess>()
let partialSupported = true

export function cancelAi(id: string): void {
  const p = running.get(id)
  if (p) {
    running.delete(id)
    p.kill()
  }
}

export async function askAi(req: AiRequest, target: WebContents): Promise<void> {
  const send = (e: AiEvent): void => {
    if (!target.isDestroyed()) target.send('ai:event', e)
  }
  const status = await claudeStatus((await loadSettings()).claudePath)
  if (!status.found || !status.path) {
    send({ id: req.id, type: 'error', error: 'Claude Code was not found. Install it (claude.ai/code) or set its path in Settings → Preferences.' })
    return
  }
  const dir = await fs.mkdtemp(join(tmpdir(), 'quillnote-ai-'))
  try {
    const files: string[] = []
    for (const [i, img] of (req.images ?? []).entries()) {
      const name = `${String(i + 1).padStart(2, '0')}-${img.name.replace(/[^A-Za-z0-9._-]/g, '_')}`.replace(/(\.png)?$/, '.png')
      const file = join(dir, name)
      await fs.writeFile(file, Buffer.from(img.base64, 'base64'))
      files.push(file)
    }
    const prompt = buildPrompt(req, files)
    let text = await run(status.path, prompt, dir, req.id, files.length > 0, (t) => send({ id: req.id, type: 'chunk', text: t }))
    if (text === null) return // cancelled
    if (JSON_KINDS.has(req.kind) && !parseJson(text)) {
      const retry = await run(status.path, `${prompt}\n\nYour previous answer was not valid JSON. Respond with the JSON object only.`, dir, req.id, files.length > 0, () => undefined)
      if (retry === null) return
      text = retry
    }
    send({ id: req.id, type: 'done', text: text.trim() })
  } catch (e) {
    send({ id: req.id, type: 'error', error: (e as Error).message })
  } finally {
    running.delete(req.id)
    fs.rm(dir, { recursive: true, force: true }).catch(() => undefined)
  }
}

export function parseJson(text: string): unknown {
  const m = /\{[\s\S]*\}/.exec(text)
  if (!m) return null
  try {
    return JSON.parse(m[0])
  } catch {
    return null
  }
}

/** Spawn the CLI once. Resolves with the final answer, or null if cancelled. */
function run(cli: string, prompt: string, cwd: string, id: string, needsRead: boolean, onChunk: (t: string) => void): Promise<string | null> {
  const args = ['-p', '--output-format', 'stream-json', '--verbose']
  if (partialSupported) args.push('--include-partial-messages')
  if (needsRead) args.push('--allowedTools', 'Read')
  args.push('--disallowedTools', 'Bash', 'Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'WebFetch', 'WebSearch')

  return new Promise((resolve, reject) => {
    const isCmd = /\.(cmd|bat)$/i.test(cli)
    const child = isCmd
      ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `"${cli}" ${args.map((a) => `"${a}"`).join(' ')}`], { cwd, windowsHide: true, windowsVerbatimArguments: true })
      : spawn(cli, args, { cwd, windowsHide: true })
    running.set(id, child)
    let buf = ''
    let err = ''
    let streamed = ''
    let result: string | null = null
    let sawDelta = false
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('Claude took too long to answer (3 minutes). Try a smaller selection.'))
    }, TIMEOUT_MS)

    const onLine = (line: string): void => {
      if (!line.trim()) return
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(line)
      } catch {
        return
      }
      if (msg.type === 'stream_event') {
        const ev = msg.event as { type?: string; delta?: { type?: string; text?: string } } | undefined
        if (ev?.type === 'content_block_delta' && ev.delta?.type === 'text_delta' && ev.delta.text) {
          sawDelta = true
          streamed += ev.delta.text
          onChunk(ev.delta.text)
        }
      } else if (msg.type === 'assistant' && !sawDelta) {
        const content = (msg.message as { content?: { type: string; text?: string }[] } | undefined)?.content ?? []
        const t = content.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('')
        if (t) {
          streamed += t
          onChunk(t)
        }
      } else if (msg.type === 'assistant' && sawDelta) {
        // A new assistant turn after tool use: separate it from the previous text.
        if (streamed && !streamed.endsWith('\n')) {
          streamed += '\n\n'
          onChunk('\n\n')
        }
      } else if (msg.type === 'result') {
        if (msg.is_error) err = String(msg.result ?? msg.subtype ?? 'Claude reported an error')
        else result = String(msg.result ?? '')
      }
    }

    child.stdout?.setEncoding('utf8')
    child.stdout?.on('data', (d: string) => {
      buf += d
      let nl: number
      while ((nl = buf.indexOf('\n')) >= 0) {
        onLine(buf.slice(0, nl))
        buf = buf.slice(nl + 1)
      }
    })
    child.stderr?.setEncoding('utf8')
    child.stderr?.on('data', (d: string) => (err += d))
    child.on('error', (e) => {
      clearTimeout(timer)
      reject(new Error(`Could not start Claude Code: ${e.message}`))
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      onLine(buf)
      if (!running.has(id)) return resolve(null)
      if (partialSupported && /include-partial-messages/.test(err) && /unknown|unrecognized/i.test(err)) {
        partialSupported = false
        run(cli, prompt, cwd, id, needsRead, onChunk).then(resolve, reject)
        return
      }
      if (result !== null) return resolve(result || streamed)
      if (code === 0 && streamed) return resolve(streamed)
      const msg = err.trim().split('\n').slice(-3).join(' ').slice(0, 400)
      reject(new Error(/login|auth|api key/i.test(msg) ? 'Claude Code is not signed in. Run `claude` in a terminal once to sign in.' : msg || `Claude Code exited with code ${code}`))
    })
    child.stdin?.end(prompt)
  })
}

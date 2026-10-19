/**
 * Local Claude Code CLI detection (the AI bridge itself arrives in M7).
 * Always spawned without a shell; only `--version` is run here.
 */
import { execFile } from 'child_process'
import { promises as fs } from 'fs'
import { homedir } from 'os'
import { delimiter, join } from 'path'
import type { ClaudeStatus } from '@shared/api'

function candidates(custom: string): string[] {
  const exe = process.platform === 'win32' ? ['claude.exe', 'claude.cmd'] : ['claude']
  const list: string[] = custom ? [custom] : []
  const home = homedir()
  list.push(join(home, '.local', 'bin', exe[0]))
  if (process.platform === 'darwin') list.push('/usr/local/bin/claude', '/opt/homebrew/bin/claude')
  for (const dir of (process.env.PATH ?? '').split(delimiter)) for (const e of exe) if (dir) list.push(join(dir, e))
  return list
}

export async function claudeStatus(customPath: string): Promise<ClaudeStatus> {
  for (const path of candidates(customPath)) {
    try {
      await fs.access(path)
    } catch {
      continue
    }
    if (path.toLowerCase().endsWith('.cmd')) return { found: true, path, version: null }
    const version = await new Promise<string | null>((resolve) => {
      execFile(path, ['--version'], { timeout: 8000, windowsHide: true }, (err, stdout) =>
        resolve(err ? null : stdout.trim().split(/\s+/)[0] || null)
      )
    })
    return { found: true, path, version }
  }
  return { found: false, path: null, version: null }
}

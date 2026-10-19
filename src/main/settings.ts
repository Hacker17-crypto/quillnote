import { app } from 'electron'
import { promises as fs } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { DEFAULT_COVER } from '@shared/covers'
import { DEFAULT_PAPER } from '@shared/paper'
import type { Settings } from '@shared/types'

const file = (): string => join(app.getPath('userData'), 'settings.json')

export function defaultSettings(): Settings {
  return {
    theme: 'dark',
    libraryRoot: process.env.QN_LIBRARY || join(homedir(), 'Quillnote'),
    defaultPaper: DEFAULT_PAPER,
    defaultCover: DEFAULT_COVER,
    sortKey: 'date',
    sortDir: 'desc',
    view: 'grid',
    scrollDirection: 'vertical',
    onlyDrawWithStylus: false,
    claudePath: ''
  }
}

let current: Settings | null = null

export async function loadSettings(): Promise<Settings> {
  if (current) return current
  const defaults = defaultSettings()
  try {
    const raw = JSON.parse(await fs.readFile(file(), 'utf8')) as Partial<Settings>
    current = { ...defaults, ...raw, defaultPaper: { ...defaults.defaultPaper, ...raw.defaultPaper } }
  } catch {
    current = defaults
  }
  if (process.env.QN_LIBRARY) current.libraryRoot = process.env.QN_LIBRARY
  return current
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await loadSettings()), ...patch }
  current = next
  await fs.mkdir(app.getPath('userData'), { recursive: true })
  await fs.writeFile(file(), JSON.stringify(next, null, 2), 'utf8')
  return next
}

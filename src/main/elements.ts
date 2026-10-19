/** The user's Elements library (saved lasso selections), stored beside settings. */
import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { ElementCollection } from '@shared/api'

const file = (): string => join(app.getPath('userData'), 'elements.json')

export async function loadElements(): Promise<ElementCollection[]> {
  try {
    const data = JSON.parse(await fs.readFile(file(), 'utf8'))
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function saveElements(cols: ElementCollection[]): Promise<void> {
  await fs.mkdir(app.getPath('userData'), { recursive: true })
  await fs.writeFile(file() + '.tmp', JSON.stringify(cols), 'utf8')
  await fs.rename(file() + '.tmp', file())
}

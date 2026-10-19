// Captures the M2 progress screenshots with a throw-away library and profile.
// Usage: npm run build && npm run shots   (output: ../.task/progress/M2-*.png)
import { _electron as electron } from 'playwright-core'
import { mkdtempSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const out = resolve(root, '..', '.task', 'progress')
mkdirSync(out, { recursive: true })

const require = createRequire(import.meta.url)
const electronPath = require('electron')
const tmp = mkdtempSync(join(tmpdir(), 'quillnote-shots-'))

const app = await electron.launch({
  executablePath: electronPath,
  args: [root, '--force-device-scale-factor=1.5'],
  env: { ...process.env, QN_LIBRARY: join(tmp, 'lib'), QN_USERDATA: join(tmp, 'user'), QN_SIZE: '1333x855' }
})
const page = await app.firstWindow()
await page.waitForSelector('.lib-sidebar')

// Seed two documents through the real API.
await page.evaluate(async () => {
  const q = window.quill.library
  await q.createDoc({ kind: 'whiteboard', parentId: null })
  await q.createDoc({ kind: 'notebook', title: 'Untitled Notebook', parentId: null, cover: 'simple' })
})
await page.reload()
await page.waitForSelector('.lib-card')

const shot = async (name) => {
  await page.mouse.move(900, 700)
  await page.waitForTimeout(350)
  await page.screenshot({ path: join(out, `M2-${name}.png`) })
  console.log('saved', `M2-${name}.png`)
}

await shot('library')

await page.click('.new-btn')
await page.waitForSelector('.q-menu')
await shot('new-menu')
await page.keyboard.press('Escape')

await page.click('.new-btn')
await page.click('.q-menu [role="menuitem"] >> nth=0')
await page.waitForSelector('.nb-dialog')
await shot('new-notebook')
await page.keyboard.press('Escape')

await page.click('button[aria-label="Select"]')
await shot('select')
await page.click('button[aria-label="Exit select mode"]')

await page.click('.lib-card >> nth=0 >> .lib-chevron')
await page.waitForSelector('.q-menu')
await shot('doc-menu')

await app.close()

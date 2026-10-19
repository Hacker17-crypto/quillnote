// Verifies create / rename / duplicate / move / trash / restore survive an app restart.
import { _electron as electron } from 'playwright-core'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const electronPath = createRequire(import.meta.url)('electron')
const tmp = mkdtempSync(join(tmpdir(), 'quillnote-persist-'))
const env = { ...process.env, QN_LIBRARY: join(tmp, 'lib'), QN_USERDATA: join(tmp, 'user') }

const launch = async () => {
  const app = await electron.launch({ executablePath: electronPath, args: [root], env })
  const page = await app.firstWindow()
  await page.waitForSelector('.lib-sidebar')
  return { app, page }
}

let { app, page } = await launch()
await page.evaluate(async () => {
  const q = window.quill.library
  const a = await q.createDoc({ kind: 'notebook', title: 'Alpha', parentId: null, cover: 'simple' })
  const b = await q.createDoc({ kind: 'notebook', title: 'Beta', parentId: null, cover: 'simple' })
  const c = await q.createDoc({ kind: 'notebook', title: 'Gamma', parentId: null, cover: 'simple' })
  const f = await q.createFolder('Folder1', null)
  await q.rename(a.id, 'Alpha renamed')
  await q.duplicate([b.id])
  await q.move([b.id], f.id)
  await q.trash([c.id])
  const d = await q.createDoc({ kind: 'notebook', title: 'Delta', parentId: null, cover: 'simple' })
  await q.trash([d.id])
  await q.restore([d.id])
})
await app.close()

;({ app, page } = await launch())
const items = await page.evaluate(() => window.quill.library.list())
console.log(
  items
    .map((i) => `${i.title} | ${i.type} | parent=${i.parentId ? 'folder' : 'root'} | trashed=${i.trashedAt !== null}`)
    .sort()
    .join('\n')
)
await app.close()

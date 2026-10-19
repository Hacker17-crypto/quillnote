// Exercise the real preload/storage bridge, restart Electron, then assert persisted state.
import assert from 'node:assert/strict'
import { _electron as electron } from 'playwright-core'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const executablePath = process.env.QN_EXECUTABLE || createRequire(import.meta.url)('electron')
const tempRoot = resolve(tmpdir())
const tmp = mkdtempSync(join(tempRoot, 'quillnote-persist-'))
const env = { ...process.env, QN_LIBRARY: join(tmp, 'lib'), QN_USERDATA: join(tmp, 'user') }
delete env.ELECTRON_RUN_AS_NODE
const errors = []
let app

async function launch() {
  app = await electron.launch({ executablePath, args: process.env.QN_EXECUTABLE ? [] : [root], env })
  const page = await app.firstWindow()
  page.on('pageerror', error => errors.push(error.message))
  await page.waitForSelector('.lib-sidebar')
  return page
}

try {
  let page = await launch()
  const ids = await page.evaluate(async () => {
    const q = window.quill.library
    const a = await q.createDoc({ kind: 'notebook', title: 'Alpha', parentId: null, cover: 'simple' })
    const b = await q.createDoc({ kind: 'notebook', title: 'Beta', parentId: null, cover: 'simple' })
    const c = await q.createDoc({ kind: 'notebook', title: 'Gamma', parentId: null, cover: 'simple' })
    const f = await q.createFolder('Folder1', null)
    await q.rename(a.id, 'Alpha renamed')
    const copy = await q.duplicate([b.id])
    await q.move([b.id], f.id)
    await q.trash([c.id])
    const d = await q.createDoc({ kind: 'notebook', title: 'Delta', parentId: null, cover: 'simple' })
    await q.trash([d.id])
    await q.restore([d.id])
    await q.setFavorite([a.id], true)
    return { a: a.id, b: b.id, c: c.id, d: d.id, folder: f.id, copy: copy.id }
  })
  await app.close()
  app = undefined
  page = await launch()
  const items = await page.evaluate(() => window.quill.library.list())
  assert.equal(items.length, 6, 'All six library items must survive restart')
  const item = id => {
    const found = items.find(entry => entry.id === id)
    assert.ok(found, `Missing persisted item: ${id}`)
    return found
  }
  assert.equal(item(ids.a).title, 'Alpha renamed')
  assert.equal(item(ids.a).favorite, true)
  assert.equal(item(ids.b).parentId, ids.folder)
  assert.equal(item(ids.folder).type, 'folder')
  assert.notEqual(item(ids.c).trashedAt, null)
  assert.equal(item(ids.d).trashedAt, null)
  assert.equal(item(ids.copy).type, 'notebook')
  assert.notEqual(ids.copy, ids.b)
  const doc = await page.evaluate(id => window.quill.library.readDoc(id), ids.a)
  assert.equal(doc.title, 'Alpha renamed')
  assert.ok(doc.pages.length > 0, 'Notebook content must survive restart')
  assert.deepEqual(errors, [], 'Renderer must not throw errors')
  if (process.env.QN_SCREENSHOT) await page.screenshot({ path: process.env.QN_SCREENSHOT })
  console.log('PASS: create, rename, duplicate, move, trash, restore, favorite and notebook content survive restart.')
} finally {
  if (app) await app.close()
  const resolved = resolve(tmp)
  if (!resolved.startsWith(tempRoot + sep) || !resolved.includes('quillnote-persist-')) {
    throw new Error('Refusing cleanup outside the isolated test directory')
  }
  rmSync(resolved, { recursive: true, force: true })
}

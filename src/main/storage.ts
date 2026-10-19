/**
 * On-disk library: <root>/library.json (index) + <root>/documents/<id>/{doc.json, assets/}.
 * Folders and trash state live only in the index; document content lives in its own folder.
 * All mutations are serialised through one queue and written atomically (tmp + rename).
 */
import { promises as fs } from 'fs'
import { join } from 'path'
import { createDocContent, itemFromDoc, newFolderItem, uid } from '@shared/docs'
import type { LibraryItem, NewDocOptions, QuillDoc } from '@shared/types'
import { TRASH_RETENTION_DAYS } from '@shared/types'

interface IndexFile {
  version: 1
  items: LibraryItem[]
}

const SAFE_ID = /^[A-Za-z0-9_-]+$/

export interface AssetFile {
  name: string
  data: Uint8Array
}

export class LibraryStorage {
  items: LibraryItem[] = []
  private chain: Promise<unknown> = Promise.resolve()

  constructor(readonly root: string) {}

  get docsDir(): string {
    return join(this.root, 'documents')
  }
  private get indexFile(): string {
    return join(this.root, 'library.json')
  }
  docDir(id: string): string {
    if (!SAFE_ID.test(id)) throw new Error(`Invalid document id: ${id}`)
    return join(this.docsDir, id)
  }
  docFile(id: string): string {
    return join(this.docDir(id), 'doc.json')
  }
  assetsDir(id: string): string {
    return join(this.docDir(id), 'assets')
  }

  /** Serialise mutations. */
  tx<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn)
    this.chain = run.catch(() => undefined)
    return run
  }

  // ───────────── lifecycle ─────────────
  async init(): Promise<void> {
    await fs.mkdir(this.docsDir, { recursive: true })
    try {
      const idx = JSON.parse(await fs.readFile(this.indexFile, 'utf8')) as IndexFile
      this.items = Array.isArray(idx.items) ? idx.items : []
    } catch {
      this.items = await this.rebuildIndex()
      await this.save()
    }
    // drop index rows whose document folder vanished
    const live: LibraryItem[] = []
    for (const it of this.items) {
      if (it.type === 'folder') live.push(it)
      else if (await exists(this.docFile(it.id))) live.push(it)
    }
    this.items = live
    // purge trash older than the retention window
    const cutoff = Date.now() - TRASH_RETENTION_DAYS * 86_400_000
    const expired = this.items.filter((i) => i.trashedAt !== null && i.trashedAt < cutoff).map((i) => i.id)
    if (expired.length) await this._deleteForever(expired)
    await this.save()
  }

  private async rebuildIndex(): Promise<LibraryItem[]> {
    const out: LibraryItem[] = []
    let dirs: string[] = []
    try {
      dirs = await fs.readdir(this.docsDir)
    } catch {
      /* empty library */
    }
    for (const d of dirs) {
      try {
        const doc = JSON.parse(await fs.readFile(join(this.docsDir, d, 'doc.json'), 'utf8')) as QuillDoc
        out.push(itemFromDoc(doc, null))
      } catch {
        /* skip unreadable folder */
      }
    }
    return out
  }

  private async save(): Promise<void> {
    const tmp = this.indexFile + '.tmp'
    const body: IndexFile = { version: 1, items: this.items }
    await fs.mkdir(this.root, { recursive: true })
    await fs.writeFile(tmp, JSON.stringify(body, null, 1), 'utf8')
    await fs.rename(tmp, this.indexFile)
  }

  private get(id: string): LibraryItem {
    const it = this.items.find((i) => i.id === id)
    if (!it) throw new Error('Item not found')
    return it
  }

  /** `ids` plus every descendant (for folders). */
  private withDescendants(ids: string[]): Set<string> {
    const out = new Set(ids)
    let grew = true
    while (grew) {
      grew = false
      for (const it of this.items) {
        if (it.parentId && out.has(it.parentId) && !out.has(it.id)) {
          out.add(it.id)
          grew = true
        }
      }
    }
    return out
  }

  // ───────────── documents ─────────────
  async readDoc(id: string): Promise<QuillDoc> {
    return JSON.parse(await fs.readFile(this.docFile(id), 'utf8')) as QuillDoc
  }

  private async writeDocFile(doc: QuillDoc): Promise<void> {
    const file = this.docFile(doc.id)
    await fs.mkdir(this.assetsDir(doc.id), { recursive: true })
    await fs.writeFile(file + '.tmp', JSON.stringify(doc), 'utf8')
    await fs.rename(file + '.tmp', file)
  }

  /** Add a fully-built document (new, imported or duplicated) to the library. */
  addDoc(doc: QuillDoc, parentId: string | null, assets: AssetFile[] = []): Promise<LibraryItem> {
    return this.tx(async () => {
      await this.writeDocFile(doc)
      for (const a of assets) await fs.writeFile(join(this.assetsDir(doc.id), a.name), a.data)
      const item = itemFromDoc(doc, parentId)
      this.items.push(item)
      await this.save()
      return item
    })
  }

  createDoc(opts: NewDocOptions): Promise<{ items: LibraryItem[]; id: string }> {
    const doc = createDocContent(uid(), opts)
    return this.addDoc(doc, opts.parentId).then(() => ({ items: this.items, id: doc.id }))
  }

  createFolder(title: string, parentId: string | null): Promise<{ items: LibraryItem[]; id: string }> {
    return this.tx(async () => {
      const folder = newFolderItem(title, parentId)
      this.items.push(folder)
      await this.save()
      return { items: this.items, id: folder.id }
    })
  }

  saveDoc(doc: QuillDoc): Promise<LibraryItem[]> {
    return this.tx(async () => {
      doc.modifiedAt = Date.now()
      await this.writeDocFile(doc)
      const prev = this.get(doc.id)
      Object.assign(prev, itemFromDoc(doc, prev.parentId, prev))
      await this.save()
      return this.items
    })
  }

  rename(id: string, title: string): Promise<LibraryItem[]> {
    return this.tx(async () => {
      const it = this.get(id)
      const clean = title.trim()
      if (!clean) return this.items
      it.title = clean
      it.modifiedAt = Date.now()
      if (it.type !== 'folder') {
        const doc = await this.readDoc(id)
        doc.title = clean
        doc.modifiedAt = it.modifiedAt
        await this.writeDocFile(doc)
      }
      await this.save()
      return this.items
    })
  }

  setCover(id: string, cover: string): Promise<LibraryItem[]> {
    return this.tx(async () => {
      const it = this.get(id)
      it.cover = cover
      const doc = await this.readDoc(id)
      doc.cover = cover
      await this.writeDocFile(doc)
      await this.save()
      return this.items
    })
  }

  setFavorite(ids: string[], favorite: boolean): Promise<LibraryItem[]> {
    return this.tx(async () => {
      for (const id of ids) this.get(id).favorite = favorite
      await this.save()
      return this.items
    })
  }

  // ───────────── structure ─────────────
  duplicate(ids: string[]): Promise<{ items: LibraryItem[]; id?: string }> {
    return this.tx(async () => {
      const created: string[] = []
      for (const id of ids) {
        const src = this.get(id)
        created.push(await this._duplicateOne(src, src.parentId, true))
      }
      await this.save()
      return { items: this.items, id: created[0] }
    })
  }

  private async _duplicateOne(src: LibraryItem, parentId: string | null, top: boolean): Promise<string> {
    const now = Date.now()
    const title = top ? `${src.title} copy` : src.title
    if (src.type === 'folder') {
      const folder = newFolderItem(title, parentId, now)
      folder.favorite = false
      this.items.push(folder)
      const kids = this.items.filter((i) => i.parentId === src.id && i.trashedAt === null && i.id !== folder.id)
      for (const kid of [...kids]) await this._duplicateOne(kid, folder.id, false)
      return folder.id
    }
    const newId = uid()
    await fs.cp(this.docDir(src.id), this.docDir(newId), { recursive: true })
    const doc = await this.readDoc(newId)
    doc.id = newId
    doc.title = title
    doc.createdAt = now
    doc.modifiedAt = now
    await this.writeDocFile(doc)
    this.items.push({ ...itemFromDoc(doc, parentId), favorite: false })
    return newId
  }

  move(ids: string[], parentId: string | null): Promise<LibraryItem[]> {
    return this.tx(async () => {
      if (parentId !== null && this.get(parentId).type !== 'folder') throw new Error('Destination is not a folder')
      const blocked = parentId ? this.withDescendants(ids) : new Set<string>()
      if (parentId && blocked.has(parentId)) throw new Error('Cannot move a folder into itself')
      for (const id of ids) this.get(id).parentId = parentId
      await this.save()
      return this.items
    })
  }

  trash(ids: string[]): Promise<LibraryItem[]> {
    return this.tx(async () => {
      const now = Date.now()
      for (const id of ids) this.get(id).trashedAt = now
      await this.save()
      return this.items
    })
  }

  restore(ids: string[]): Promise<LibraryItem[]> {
    return this.tx(async () => {
      for (const id of ids) {
        const it = this.get(id)
        it.trashedAt = null
        const parent = it.parentId ? this.items.find((p) => p.id === it.parentId) : null
        if (it.parentId && (!parent || parent.trashedAt !== null)) it.parentId = null
      }
      await this.save()
      return this.items
    })
  }

  deleteForever(ids: string[]): Promise<LibraryItem[]> {
    return this.tx(async () => {
      await this._deleteForever(ids)
      await this.save()
      return this.items
    })
  }

  emptyTrash(): Promise<LibraryItem[]> {
    return this.tx(async () => {
      await this._deleteForever(this.items.filter((i) => i.trashedAt !== null).map((i) => i.id))
      await this.save()
      return this.items
    })
  }

  private async _deleteForever(ids: string[]): Promise<void> {
    const all = this.withDescendants(ids)
    for (const id of all) {
      const it = this.items.find((i) => i.id === id)
      if (it && it.type !== 'folder') await fs.rm(this.docDir(id), { recursive: true, force: true })
    }
    this.items = this.items.filter((i) => !all.has(i.id))
  }
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

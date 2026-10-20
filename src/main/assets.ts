/** Files that live inside a document's assets/ folder: images, extra PDFs, audio recordings. */
import { BrowserWindow, dialog } from 'electron'
import { promises as fs } from 'fs'
import { basename, extname, join } from 'path'
import { PDFDocument } from 'pdf-lib'
import { uid } from '@shared/docs'
import type { AddedAsset, AddedPdf } from '@shared/api'
import { IMAGE_EXT, IMAGE_FILTERS, imageSize, pdfPageSize } from './importer'
import type { LibraryStorage } from './storage'

const cleanName = (name: string): string => basename(name).replace(/[^A-Za-z0-9._-]/g, '_').replace(/^\.+/, '') || 'file'

/** Write bytes into assets/, never overwriting an existing file. Returns the name used. */
export async function writeAsset(storage: LibraryStorage, docId: string, name: string, data: Uint8Array): Promise<string> {
  const dir = storage.assetsDir(docId)
  await fs.mkdir(dir, { recursive: true })
  const clean = cleanName(name)
  const ext = extname(clean)
  const stem = clean.slice(0, clean.length - ext.length)
  let candidate = clean
  for (let i = 2; await exists(join(dir, candidate)); i++) candidate = `${stem}-${i}${ext}`
  await fs.writeFile(join(dir, candidate), data)
  return candidate
}

export async function addImageFromPath(storage: LibraryStorage, docId: string, path: string): Promise<AddedAsset | null> {
  const ext = extname(path).toLowerCase()
  if (!IMAGE_EXT.has(ext)) return null
  const bytes = await fs.readFile(path)
  const norm = ext === '.jfif' ? '.jpg' : ext
  const size = imageSize(bytes, norm, path)
  const asset = await writeAsset(storage, docId, `img-${uid().slice(0, 8)}${norm}`, bytes)
  return { asset, width: size.width, height: size.height }
}

export async function pickImages(storage: LibraryStorage, docId: string, parent: BrowserWindow | null): Promise<AddedAsset[]> {
  const opts = { title: 'Insert image', properties: ['openFile', 'multiSelections'] as ('openFile' | 'multiSelections')[], filters: IMAGE_FILTERS }
  const pick = parent ? await dialog.showOpenDialog(parent, opts) : await dialog.showOpenDialog(opts)
  if (pick.canceled) return []
  const out: AddedAsset[] = []
  for (const p of pick.filePaths) {
    const a = await addImageFromPath(storage, docId, p)
    if (a) out.push(a)
  }
  return out
}

export async function pickPdf(storage: LibraryStorage, docId: string, parent: BrowserWindow | null): Promise<AddedPdf | null> {
  const opts = { title: 'Import PDF pages', properties: ['openFile'] as 'openFile'[], filters: [{ name: 'PDF', extensions: ['pdf'] }] }
  const pick = parent ? await dialog.showOpenDialog(parent, opts) : await dialog.showOpenDialog(opts)
  if (pick.canceled || !pick.filePaths[0]) return null
  const bytes = await fs.readFile(pick.filePaths[0])
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })
  const pages = pdf.getPages().map((pg) => pdfPageSize(pg))
  if (!pages.length) throw new Error('PDF has no pages')
  const asset = await writeAsset(storage, docId, `pdf-${uid().slice(0, 8)}.pdf`, bytes)
  return { asset, pages }
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

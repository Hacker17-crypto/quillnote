/** Import PDFs, images, .quill bundles and (via LibreOffice, if present) Office files. */
import { nativeImage } from 'electron'
import { execFile } from 'child_process'
import { promises as fs, statSync } from 'fs'
import { homedir, tmpdir } from 'os'
import { basename, extname, join } from 'path'
import { PDFDocument } from 'pdf-lib'
import { unzipSync, strFromU8 } from 'fflate'
import { uid } from '@shared/docs'
import { DEFAULT_PAPER } from '@shared/paper'
import type { ImportResult, PageData, PaperSpec, QuillDoc } from '@shared/types'
import type { AssetFile, LibraryStorage } from './storage'

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.jfif', '.gif', '.webp', '.bmp', '.svg'])
const OFFICE_EXT = new Set(['.docx', '.doc', '.pptx', '.ppt', '.odt', '.odp', '.rtf'])

export const IMPORT_FILTERS = [
  { name: 'Quillnote-friendly files', extensions: ['pdf', 'quill', 'png', 'jpg', 'jpeg', 'jfif', 'gif', 'webp', 'bmp', 'svg', 'docx', 'pptx'] },
  { name: 'PDF', extensions: ['pdf'] },
  { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'jfif', 'gif', 'webp', 'bmp', 'svg'] },
  { name: 'Quillnote file', extensions: ['quill'] }
]
export const IMAGE_FILTERS = [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'jfif', 'gif', 'webp', 'bmp', 'svg'] }]

const blankPaper: PaperSpec = { ...DEFAULT_PAPER, template: 'blank', color: 'white' }

export class Importer {
  constructor(private storage: LibraryStorage) {}

  async importPaths(paths: string[], parentId: string | null): Promise<ImportResult> {
    const result: ImportResult = { items: this.storage.items, imported: [], skipped: [] }
    for (const p of paths) await this.importOne(p, parentId, result)
    result.items = this.storage.items
    return result
  }

  async importDirectory(dir: string, parentId: string | null): Promise<ImportResult> {
    const result: ImportResult = { items: this.storage.items, imported: [], skipped: [] }
    await this.walk(dir, parentId, result, 0)
    result.items = this.storage.items
    return result
  }

  private async walk(dir: string, parentId: string | null, result: ImportResult, depth: number): Promise<void> {
    const folder = await this.storage.createFolder(basename(dir), parentId)
    result.imported.push(basename(dir))
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (depth < 3) await this.walk(full, folder.id, result, depth + 1)
      } else {
        const ext = extname(full).toLowerCase()
        if (ext === '.pdf' || ext === '.quill' || IMAGE_EXT.has(ext)) await this.importOne(full, folder.id, result)
      }
    }
  }

  private async importOne(path: string, parentId: string | null, result: ImportResult): Promise<void> {
    const ext = extname(path).toLowerCase()
    const name = basename(path)
    try {
      const stat = await fs.stat(path)
      if (stat.isDirectory()) {
        await this.walk(path, parentId, result, 0)
        return
      }
      if (ext === '.pdf') await this.importPdf(path, parentId)
      else if (IMAGE_EXT.has(ext)) await this.importImage(path, parentId)
      else if (ext === '.quill') await this.importQuill(path, parentId)
      else if (OFFICE_EXT.has(ext)) {
        const pdf = await convertWithLibreOffice(path)
        if (!pdf) {
          result.skipped.push(`${name} — needs LibreOffice to convert; import it as PDF instead`)
          return
        }
        await this.importPdf(pdf, parentId, basename(path, ext))
      } else {
        result.skipped.push(`${name} — unsupported file type`)
        return
      }
      result.imported.push(name)
    } catch (e) {
      result.skipped.push(`${name} — ${(e as Error).message}`)
    }
  }

  private async importPdf(path: string, parentId: string | null, title?: string): Promise<void> {
    const bytes = await fs.readFile(path)
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })
    const pages: PageData[] = pdf.getPages().map((pg, i) => {
      const { width, height } = pg.getSize()
      return {
        id: uid(), width, height, paper: blankPaper,
        background: { type: 'pdf', pdfPage: i }, objects: []
      }
    })
    if (!pages.length) throw new Error('PDF has no pages')
    const now = Date.now()
    const doc: QuillDoc = {
      version: 1, id: uid(), kind: 'pdf', title: title ?? basename(path, extname(path)),
      createdAt: now, modifiedAt: now, cover: null, paper: blankPaper, pages
    }
    await this.storage.addDoc(doc, parentId, [{ name: 'source.pdf', data: bytes }])
  }

  private async importImage(path: string, parentId: string | null): Promise<void> {
    const bytes = await fs.readFile(path)
    const ext = extname(path).toLowerCase().replace('.jfif', '.jpg')
    const size = imageSize(bytes, ext, path)
    const k = 842 / Math.max(size.width, size.height)
    const width = Math.round(size.width * k)
    const height = Math.round(size.height * k)
    const asset = `image${ext}`
    const now = Date.now()
    const doc: QuillDoc = {
      version: 1, id: uid(), kind: 'image', title: basename(path, extname(path)),
      createdAt: now, modifiedAt: now, cover: null, paper: blankPaper,
      pages: [{ id: uid(), width, height, paper: blankPaper, background: { type: 'image', asset }, objects: [] }]
    }
    await this.storage.addDoc(doc, parentId, [{ name: asset, data: bytes }])
  }

  private async importQuill(path: string, parentId: string | null): Promise<void> {
    const files = unzipSync(new Uint8Array(await fs.readFile(path)))
    const raw = files['doc.json']
    if (!raw) throw new Error('Not a valid .quill file')
    const doc = JSON.parse(strFromU8(raw)) as QuillDoc
    if (doc.version !== 1 || !Array.isArray(doc.pages)) throw new Error('Unsupported .quill version')
    doc.id = uid()
    const assets: AssetFile[] = []
    for (const [key, data] of Object.entries(files)) {
      if (key.startsWith('assets/') && !key.endsWith('/')) {
        const fileName = basename(key)
        if (fileName) assets.push({ name: fileName, data })
      }
    }
    await this.storage.addDoc(doc, parentId, assets)
  }
}

// ───────────────────────── helpers ─────────────────────────
function imageSize(bytes: Uint8Array, ext: string, path: string): { width: number; height: number } {
  const buf = Buffer.from(bytes)
  if (ext === '.gif' && buf.length > 10) return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) }
  if (ext === '.webp' && buf.length > 30 && buf.toString('ascii', 0, 4) === 'RIFF') {
    const kind = buf.toString('ascii', 12, 16)
    if (kind === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) }
    if (kind === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff }
    if (kind === 'VP8L') {
      const b = buf.readUInt32LE(21)
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 }
    }
  }
  if (ext === '.svg') {
    const m = /viewBox="[\d.\-]+[ ,]+[\d.\-]+[ ,]+([\d.]+)[ ,]+([\d.]+)"/.exec(buf.toString('utf8', 0, 2000))
    if (m) return { width: parseFloat(m[1]), height: parseFloat(m[2]) }
    return { width: 800, height: 600 }
  }
  const img = nativeImage.createFromPath(path)
  const s = img.getSize()
  return s.width > 0 && s.height > 0 ? s : { width: 794, height: 1123 }
}

async function findSoffice(): Promise<string | null> {
  const candidates = [
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
    '/usr/bin/soffice',
    '/usr/local/bin/soffice'
  ]
  for (const c of candidates) {
    try {
      await fs.access(c)
      return c
    } catch {
      /* next */
    }
  }
  return null
}

async function convertWithLibreOffice(path: string): Promise<string | null> {
  const soffice = await findSoffice()
  if (!soffice) return null
  const out = join(tmpdir(), `quillnote-convert-${uid()}`)
  await fs.mkdir(out, { recursive: true })
  await new Promise<void>((resolve, reject) => {
    execFile(soffice, ['--headless', '--convert-to', 'pdf', '--outdir', out, path], { timeout: 120_000 }, (err) =>
      err ? reject(err) : resolve()
    )
  })
  const pdf = join(out, basename(path, extname(path)) + '.pdf')
  await fs.access(pdf)
  return pdf
}

/** Candidate local sync folders for the "Open from folder" entries. */
export function syncFolderHint(provider?: string): string {
  const home = homedir()
  const map: Record<string, string[]> = {
    'google-drive': ['Google Drive', 'My Drive', 'GoogleDrive'],
    onedrive: ['OneDrive'],
    dropbox: ['Dropbox'],
    box: ['Box', 'Box Sync']
  }
  for (const name of provider ? (map[provider] ?? []) : []) {
    const p = join(home, name)
    try {
      if (statSync(p).isDirectory()) return p
    } catch {
      /* try next */
    }
  }
  return home
}

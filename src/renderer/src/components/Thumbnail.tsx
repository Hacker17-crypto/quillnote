import { memo, useMemo } from 'react'
import { coverSvg } from '@shared/covers'
import { pageDims, paperSvg, whiteboardSvg } from '@shared/paper'
import type { ItemType, PaperSpec } from '@shared/types'

/** Thumbnail box in CSS px (measured from the reference: cover 105×122, whiteboard 114×88). */
export const THUMB_W = 114
export const THUMB_H = 122
const COVER_W = 105
const BOARD_H = 88

interface ThumbnailProps {
  id: string
  type: ItemType
  cover: string | null
  paper: PaperSpec | null
  thumbAsset: string | null
  /** Rendered width in CSS px; height follows the content (max THUMB_H). */
  width?: number
}

const NOTE_LINES = [0.18, 0.26, 0.34, 0.42, 0.5, 0.58, 0.66].map((y, i) => `<rect x="0.14" y="${y}" width="${i % 3 === 2 ? 0.45 : 0.72}" height="0.018" rx="0.009" fill="#B7BCC8"/>`).join('')

function textDocSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1.3" preserveAspectRatio="none"><rect width="1" height="1.3" fill="#fff"/><rect x="0.14" y="0.1" width="0.4" height="0.04" rx="0.02" fill="#6B7385"/>${NOTE_LINES}</svg>`
}

function pdfSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 130" preserveAspectRatio="none"><rect width="100" height="130" fill="#fff"/><rect x="14" y="14" width="30" height="14" rx="4" fill="#E5484D"/><text x="29" y="24.2" text-anchor="middle" font-family="Figtree Variable, Figtree, sans-serif" font-size="8" font-weight="700" fill="#fff">PDF</text><g fill="#C7CBD6"><rect x="14" y="44" width="72" height="3" rx="1.5"/><rect x="14" y="54" width="64" height="3" rx="1.5"/><rect x="14" y="64" width="70" height="3" rx="1.5"/><rect x="14" y="74" width="48" height="3" rx="1.5"/></g></svg>`
}

/** Notebook cover with spine, whiteboard in its frame, or the first page of other documents. */
export const Thumbnail = memo(function Thumbnail({ id, type, cover, paper, thumbAsset, width = THUMB_W }: ThumbnailProps): JSX.Element {
  const scale = width / THUMB_W
  const html = useMemo(() => {
    switch (type) {
      case 'notebook':
      case 'folder':
        return cover ? coverSvg(cover) : ''
      case 'whiteboard':
        return whiteboardSvg(320, 240, 'white')
      case 'text':
        return textDocSvg()
      case 'pdf':
        return pdfSvg()
      case 'image':
        return ''
      default:
        return paper ? paperSvg(paper) : paperSvg({ template: 'blank', color: 'white', size: 'a4', orientation: 'portrait', style: 'standard', lang: 'en-US' })
    }
  }, [type, cover, paper])

  if (type === 'folder') {
    return (
      <div className="lib-thumb folder" style={{ width, height: THUMB_H * scale }}>
        <svg viewBox="0 0 120 100" width={width} aria-hidden="true">
          <path d="M6 20a8 8 0 0 1 8-8h30c3 0 5.700 1.300 7.500 3.500L56 22h50a8 8 0 0 1 8 8v54a8 8 0 0 1-8 8H14a8 8 0 0 1-8-8Z" fill="#6FD0EB" />
          <path d="M6 34a8 8 0 0 1 8-8h92a8 8 0 0 1 8 8v50a8 8 0 0 1-8 8H14a8 8 0 0 1-8-8Z" fill="#81E3FA" />
        </svg>
      </div>
    )
  }

  if (type === 'whiteboard') {
    return (
      <div className="lib-thumb board" style={{ width, height: BOARD_H * scale }}>
        <div className="board-surface" dangerouslySetInnerHTML={{ __html: html }} />
        <div className="board-tray">
          <span />
        </div>
      </div>
    )
  }

  if (type === 'notebook') {
    return <div className="lib-thumb cover" style={{ width: COVER_W * scale, height: THUMB_H * scale }} dangerouslySetInnerHTML={{ __html: html }} />
  }

  if (type === 'image') {
    return (
      <div className="lib-thumb page" style={{ width, height: THUMB_H * scale }}>
        {thumbAsset && <img src={`quill-asset://${id}/${encodeURIComponent(thumbAsset)}`} alt="" draggable={false} />}
      </div>
    )
  }

  // Page-like documents (quick note, text, pdf): fit the page into the thumbnail box.
  const dims = paper ? pageDims(paper.size, paper.orientation) : { w: 595, h: 842 }
  const ratio = type === 'text' || type === 'pdf' ? 100 / 130 : dims.w / dims.h
  const boxW = THUMB_W
  const boxH = THUMB_H
  let w = boxH * ratio
  let h = boxH
  if (w > boxW) {
    w = boxW
    h = boxW / ratio
  }
  return (
    <div className="lib-thumb-slot" style={{ width, height: THUMB_H * scale }}>
      <div className="lib-thumb page" style={{ width: w * scale, height: h * scale }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
})

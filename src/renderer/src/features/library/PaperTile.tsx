import { memo, useMemo } from 'react'
import { coverSvg } from '@shared/covers'
import { pageDims, paperSvg } from '@shared/paper'
import type { PaperSpec } from '@shared/types'

interface PaperPreviewProps {
  spec: PaperSpec
  /** Bounding box in CSS px; the page is fitted inside it. */
  w: number
  h: number
}

/** Procedural paper page fitted into a box. */
export const PaperPreview = memo(function PaperPreview({ spec, w, h }: PaperPreviewProps): JSX.Element {
  const html = useMemo(() => paperSvg(spec), [spec])
  const d = pageDims(spec.size, spec.orientation)
  const k = Math.min(w / d.w, h / d.h)
  return (
    <div className="paper-preview" style={{ width: d.w * k, height: d.h * k }} dangerouslySetInnerHTML={{ __html: html }} />
  )
})

interface PaperTileProps {
  spec: PaperSpec
  name: string
  selected: boolean
  onSelect: () => void
}

export const PaperTile = memo(function PaperTile({ spec, name, selected, onSelect }: PaperTileProps): JSX.Element {
  return (
    <button type="button" className={`paper-tile${selected ? ' on' : ''}`} onClick={onSelect} aria-pressed={selected}>
      <span className="paper-tile-box">
        <PaperPreview spec={spec} w={73} h={94} />
      </span>
      <span className="paper-tile-name">{name}</span>
    </button>
  )
})

interface CoverTileProps {
  id: string
  name: string
  selected: boolean
  onSelect: () => void
}

export const CoverTile = memo(function CoverTile({ id, name, selected, onSelect }: CoverTileProps): JSX.Element {
  const html = useMemo(() => coverSvg(id), [id])
  return (
    <button type="button" className={`paper-tile cover${selected ? ' on' : ''}`} onClick={onSelect} aria-pressed={selected}>
      <span className="paper-tile-box">
        <span className="cover-preview" style={{ width: 66, height: 85 }} dangerouslySetInnerHTML={{ __html: html }} />
      </span>
      <span className="paper-tile-name">{name}</span>
    </button>
  )
})

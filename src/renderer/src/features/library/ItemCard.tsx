import { memo, type DragEvent, type MouseEvent } from 'react'
import { Check, ChevronDown, Star } from 'lucide-react'
import { formatItemDate } from '@shared/docs'
import type { LibraryItem } from '@shared/types'
import { Thumbnail } from '../../components/Thumbnail'

interface ItemCardProps {
  item: LibraryItem
  focused: boolean
  selectMode: boolean
  selected: boolean
  trash: boolean
  dropTarget: boolean
  onClick: (item: LibraryItem, e: MouseEvent) => void
  onOpen: (item: LibraryItem) => void
  onMenu: (item: LibraryItem, anchor: HTMLElement | { x: number; y: number }) => void
  onFavorite: (item: LibraryItem) => void
  onDragStart: (item: LibraryItem, e: DragEvent) => void
  onDragOverItem: (item: LibraryItem, e: DragEvent) => void
  onDropOnItem: (item: LibraryItem, e: DragEvent) => void
}

export const ItemCard = memo(function ItemCard(p: ItemCardProps): JSX.Element {
  const { item } = p
  const isBoard = item.type === 'whiteboard'
  return (
    <div
      className={`lib-card${p.focused || p.selected ? ' focused' : ''}${p.dropTarget ? ' drop' : ''}${p.trash ? ' in-trash' : ''}`}
      data-item-id={item.id}
      draggable={!p.trash}
      onClick={(e) => p.onClick(item, e)}
      onDoubleClick={() => !p.selectMode && !p.trash && p.onOpen(item)}
      onContextMenu={(e) => {
        e.preventDefault()
        p.onMenu(item, { x: e.clientX, y: e.clientY })
      }}
      onDragStart={(e) => p.onDragStart(item, e)}
      onDragOver={(e) => p.onDragOverItem(item, e)}
      onDrop={(e) => p.onDropOnItem(item, e)}
    >
      <div className={`lib-thumb-wrap${isBoard ? ' board' : ''}`}>
        <Thumbnail id={item.id} type={item.type} cover={item.cover} paper={item.paper} thumbAsset={item.thumbAsset} />
        {!p.trash && (
          <button
            type="button"
            className={`lib-star${item.favorite ? ' on' : ''}`}
            aria-label={item.favorite ? 'Remove from Favorites' : 'Add to Favorites'}
            aria-pressed={item.favorite}
            onClick={(e) => {
              e.stopPropagation()
              p.onFavorite(item)
            }}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <Star size={19} strokeWidth={1.6} fill={item.favorite ? 'currentColor' : 'none'} />
          </button>
        )}
        {p.selectMode && (
          <span className={`lib-check${p.selected ? ' on' : ''}`} aria-hidden="true">
            {p.selected && <Check size={13} strokeWidth={3} />}
          </span>
        )}
      </div>
      <div className="lib-title-row">
        <span className="lib-title" title={item.title}>
          {item.title}
        </span>
        {!p.selectMode && (
          <button
            type="button"
            className="lib-chevron"
            aria-label={`Options for ${item.title}`}
            onClick={(e) => {
              e.stopPropagation()
              p.onMenu(item, e.currentTarget)
            }}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <ChevronDown size={16} />
          </button>
        )}
      </div>
      <div className="lib-date">{formatItemDate(item.modifiedAt)}</div>
    </div>
  )
})

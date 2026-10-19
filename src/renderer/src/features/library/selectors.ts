import type { LibraryItem } from '@shared/types'
import type { NavId } from '../../stores/ui'

export function isLive(i: LibraryItem): boolean {
  return i.trashedAt === null
}

/** Items visible for a nav section / folder. */
export function itemsFor(items: LibraryItem[], nav: NavId, folderId: string | null): LibraryItem[] {
  switch (nav) {
    case 'documents':
      return items.filter((i) => isLive(i) && i.parentId === folderId)
    case 'favorites':
      return items.filter((i) => isLive(i) && i.favorite)
    case 'trash':
      // Only top-most trashed items; their children go with them.
      return items.filter((i) => !isLive(i) && (i.parentId === null || items.find((p) => p.id === i.parentId)?.trashedAt == null))
    default:
      return []
  }
}

/** Folder chain from the root down to (and including) `folderId`. */
export function breadcrumb(items: LibraryItem[], folderId: string | null): LibraryItem[] {
  const chain: LibraryItem[] = []
  let cur = folderId ? items.find((i) => i.id === folderId) : undefined
  while (cur) {
    chain.unshift(cur)
    cur = cur.parentId ? items.find((i) => i.id === cur!.parentId) : undefined
  }
  return chain
}

/** All descendant ids of a folder (used to stop moving a folder into itself). */
export function descendantIds(items: LibraryItem[], id: string): Set<string> {
  const out = new Set<string>()
  const walk = (pid: string): void => {
    for (const i of items) if (i.parentId === pid && !out.has(i.id)) {
      out.add(i.id)
      walk(i.id)
    }
  }
  walk(id)
  return out
}

export function daysLeftInTrash(trashedAt: number, retentionDays: number): number {
  return Math.max(0, Math.ceil(retentionDays - (Date.now() - trashedAt) / 86_400_000))
}

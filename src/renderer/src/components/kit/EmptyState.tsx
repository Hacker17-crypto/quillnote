import type { ReactNode } from 'react'

/** Original line-art illustrations: plum fill #5A2347, pink outline #E58BC4. */
const PLUM = '#5A2347'
const PINK = '#E58BC4'

export type Illustration = 'favorites' | 'shared' | 'trash' | 'search' | 'folder'

function Art({ kind }: { kind: Illustration }): JSX.Element {
  const common = { fill: 'none', stroke: PINK, strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg width="168" height="132" viewBox="0 0 168 132" aria-hidden="true">
      {kind === 'favorites' && (
        <g {...common}>
          <rect x="22" y="78" width="124" height="28" rx="5" fill={PLUM} />
          <rect x="32" y="56" width="104" height="22" rx="5" fill={PLUM} />
          <path d="M44 92h40M52 67h32" />
          <path d="M18 44h46l8 10h78a4 4 0 0 1 4 4v8H18Z" fill={PLUM} transform="translate(0 -6)" />
          <path d="M84 52c-9-12-26-5-22 8 3 9 16 16 22 20 6-4 19-11 22-20 4-13-13-20-22-8Z" fill={PLUM} transform="translate(0 -30) scale(1 1)" />
          <path d="M120 22l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.3 2.8 1-5.9-4.3-4.1 5.9-.8Z" />
        </g>
      )}
      {kind === 'shared' && (
        <g {...common}>
          <path d="M26 30h64a8 8 0 0 1 8 8v30a8 8 0 0 1-8 8H56l-16 14V76h-14a8 8 0 0 1-8-8V38a8 8 0 0 1 8-8Z" fill={PLUM} />
          <path d="M60 58h60a8 8 0 0 1 8 8v28a8 8 0 0 1-8 8h-8v14l-16-14H68a8 8 0 0 1-8-8Z" fill={PLUM} transform="translate(26 -2)" />
          <path d="M34 46h40M34 58h24M96 74h40M96 86h22" />
        </g>
      )}
      {kind === 'trash' && (
        <g {...common}>
          <path d="M44 42h80l-6 74a6 6 0 0 1-6 5H56a6 6 0 0 1-6-5Z" fill={PLUM} />
          <path d="M36 42h96M68 42l3-12h26l3 12M68 62v42M84 62v42M100 62v42" />
        </g>
      )}
      {kind === 'search' && (
        <g {...common}>
          <rect x="30" y="20" width="70" height="92" rx="6" fill={PLUM} />
          <path d="M44 42h40M44 56h30M44 70h36" />
          <circle cx="104" cy="76" r="22" fill={PLUM} />
          <path d="m121 93 20 20" />
        </g>
      )}
      {kind === 'folder' && (
        <g {...common}>
          <path d="M22 34h42l10 12h72a6 6 0 0 1 6 6v58a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6V40a6 6 0 0 1 6-6Z" fill={PLUM} />
          <path d="M16 62h132" />
        </g>
      )}
    </svg>
  )
}

interface EmptyStateProps {
  art: Illustration
  title: string
  caption?: ReactNode
  action?: ReactNode
}

export function EmptyState({ art, title, caption, action }: EmptyStateProps): JSX.Element {
  return (
    <div className="q-empty">
      <Art kind={art} />
      <h2>{title}</h2>
      {caption && <p>{caption}</p>}
      {action}
    </div>
  )
}

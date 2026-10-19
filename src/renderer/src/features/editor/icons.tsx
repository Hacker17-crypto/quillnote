/**
 * Editor toolbar icons, drawn for Quillnote on a 24px grid (thin rounded outline, 1.6 stroke)
 * to match the reference layout.
 */
import type { SVGProps } from 'react'

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'size'> {
  size?: number
  strokeWidth?: number
}

function Svg({ size = 24, strokeWidth = 1.6, children, ...rest }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  )
}

export const PagesIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <path d="M9.5 4v16M5.6 8h1.6M5.6 11h1.6M5.6 14h1.6" />
  </Svg>
)

export const SearchIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.5 15.5 5 5" />
  </Svg>
)

/** Curved stroke with a sparkle — the AI assistant. */
export const AiIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <path d="M3.5 13.5c1.6 3.6 4.4 4.6 6.6 3.5 2.7-1.4 2.4-5.3 5.2-5.6" />
    <path d="M17.5 3.2c.4 2.2 1.2 3 3.3 3.4-2.1.4-2.9 1.2-3.3 3.4-.4-2.2-1.2-3-3.3-3.4 2.1-.4 2.9-1.2 3.3-3.4Z" fill="currentColor" strokeWidth={1} />
  </Svg>
)

/** Page with lines and a lock-ish dial — read-only / outline view. */
export const ReadOnlyIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <path d="M17 11V5.5A2.5 2.5 0 0 0 14.5 3h-8A2.5 2.5 0 0 0 4 5.5v13A2.5 2.5 0 0 0 6.5 21H11" />
    <path d="M7.5 7.5h6M7.5 11h6M7.5 14.5h3" />
    <circle cx="17" cy="17" r="3.6" />
    <path d="M17 15.6v1.4l.9.9" />
  </Svg>
)

export const LassoIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <path d="M11 20.5H6.5a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3V11" strokeDasharray="2.6 2.6" />
    <path d="m13.2 12.6 7.3 2.6-3.1 1.3-1.3 3.1-2.9-7Z" />
  </Svg>
)

/** Pen writing a squiggle. */
export const PenIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <path d="m14.6 4.4 4 4L9.3 17.7l-4.6.9.9-4.6 9-9.6Z" />
    <path d="m13 6 4 4" />
    <path d="M13.5 20.5c1.2-.9 2.2-1.1 3-.4.6.5 1.4.5 2.2-.2l1.1-.9" />
  </Svg>
)

export const EraserIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <path d="m14.2 4.2 5.6 5.6a1.6 1.6 0 0 1 0 2.3l-7.6 7.6a1.6 1.6 0 0 1-2.3 0l-5.6-5.6a1.6 1.6 0 0 1 0-2.3l7.6-7.6a1.6 1.6 0 0 1 2.3 0Z" />
    <path d="m8.4 8.4 7.2 7.2" />
  </Svg>
)

export const TextIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="3.5" />
    <path d="M8.5 9V8h7v1M12 8v8.2M10.6 16.2h2.8" />
    <path d="M1.8 10v4M22.2 10v4" />
  </Svg>
)

/** Round sticker with a peeled corner. */
export const StickerIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <path d="M20.5 12.6A8.5 8.5 0 1 1 11.4 3.5" />
    <path d="M11.4 3.5c.4 3.6 1.8 6.4 4.4 7.9 1.4.8 3 1.2 4.7 1.2" />
    <path d="M11.4 3.5a8.6 8.6 0 0 1 9.1 9.1" />
  </Svg>
)

export const ImageIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <rect x="3.5" y="4" width="17" height="16" rx="3" />
    <circle cx="9" cy="9.3" r="1.7" />
    <path d="m4 17.5 4.6-4.4 3.4 3 3.2-3.3 4.8 4.9" />
  </Svg>
)

/** Elements library: four small shapes. */
export const ElementsIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <path d="M7.3 3.4c.3 1.6.9 2.2 2.5 2.5-1.6.3-2.2.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.3 2.2-.9 2.5-2.5Z" />
    <path d="m16.7 3.6 3.6 6.1h-7.2l3.6-6.1Z" />
    <circle cx="7.2" cy="16.8" r="3.4" />
    <rect x="13.4" y="13.4" width="6.8" height="6.8" rx="1.8" />
  </Svg>
)

export const StickyNoteIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <path d="M20.5 13.5V6.5a3 3 0 0 0-3-3h-11a3 3 0 0 0-3 3v11a3 3 0 0 0 3 3h7l7-7Z" />
    <path d="M13.5 20.5v-4a3 3 0 0 1 3-3h4" />
    <path d="M7.5 8.5h8M7.5 12h4" />
  </Svg>
)

/** Pointer stick with rays at the tip. */
export const LaserIcon = ({ active, ...p }: IconProps & { active?: boolean }): JSX.Element => (
  <Svg {...p}>
    <path d="m4 20 9.2-9.2" strokeWidth={2.6} />
    <path d="m13.2 10.8 2-2" />
    <circle cx="16.4" cy="7.6" r="1.6" fill={active ? '#FF3B30' : 'currentColor'} stroke={active ? '#FF3B30' : 'currentColor'} />
    <path d="M16.4 2.6v1.6M21.4 7.6h-1.6M19.9 4.1l-1.1 1.1M12.9 4.1 14 5.2M19.9 11.1l-1.1-1.1" stroke={active ? '#FF3B30' : 'currentColor'} />
  </Svg>
)

/** Microphone with a speaker-voice mark. */
export const AudioIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <rect x="5" y="3" width="6" height="11" rx="3" />
    <path d="M2.8 11a5.2 5.2 0 0 0 10.4 0M8 16.2V20" />
    <circle cx="18" cy="7" r="2.3" />
    <path d="M14.6 14.5c.5-1.9 1.8-3 3.4-3s2.9 1.1 3.4 3" />
    <rect x="15.5" y="16.5" width="5" height="4" rx="1.5" />
  </Svg>
)

export const AddPageIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.8v8.4M7.8 12h8.4" />
  </Svg>
)

export const ShareIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <path d="M8 9.5H6.5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2H16" />
    <path d="M12 14.5V3.5M8.3 7 12 3.3 15.7 7" />
  </Svg>
)

export const MoreIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="8" cy="12" r=".6" fill="currentColor" strokeWidth={1.4} />
    <circle cx="12" cy="12" r=".6" fill="currentColor" strokeWidth={1.4} />
    <circle cx="16" cy="12" r=".6" fill="currentColor" strokeWidth={1.4} />
  </Svg>
)

export const UndoIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <path d="M9 14.5 4.5 10 9 5.5" />
    <path d="M4.5 10H15a5 5 0 0 1 0 10h-3" />
  </Svg>
)

export const RedoIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <path d="m15 14.5 4.5-4.5L15 5.5" />
    <path d="M19.5 10H9a5 5 0 0 0 0 10h3" />
  </Svg>
)

// ───────── pen sub-toolbar ─────────
export const FountainPenIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <path d="M5 19 8.6 8.4l6-2.2 3.2 3.2-2.2 6L5 19Z" />
    <path d="m5 19 5.6-5.6" />
    <circle cx="11.6" cy="12.4" r="1.3" />
    <path d="m14.6 6.2 2.3-2.3 3.2 3.2-2.3 2.3" />
  </Svg>
)

export const BallPenIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <path d="m15.6 3.8 4.6 4.6L9.6 19 4 20l1-5.6L15.6 3.8Z" />
    <path d="m13.6 5.8 4.6 4.6M5 14.4l4.6 4.6" />
  </Svg>
)

export const BrushPenIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <path d="m19.5 3.5-8.3 9.4" />
    <path d="M11.2 12.9c-2.6-.6-4.5.8-5.1 3.3-.3 1.5-1 2.7-2.6 3.3 3.6 1 7.3.3 8.6-2.4.6-1.3.6-2.6-.9-4.2Z" />
  </Svg>
)

export const HighlighterIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <path d="m9.5 15.2-3 3H3.6l1.6-1.6V14.4l3-3" />
    <path d="m8.2 11.4 8.9-8.1 3.6 3.6-8.1 8.9-4.4-4.4Z" />
    <path d="m8.2 11.4-.9 3.5 1.8 1.8 3.5-.9" />
  </Svg>
)

/** Masking tape roll strip. */
export const TapeIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <path d="M6.5 3.6h11l-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2h-11l1-2-1-2 1-2-1-2 1-2-1-2 1-2-1-2Z" transform="rotate(35 12 12) translate(0 .4) scale(1 .92)" />
    <path d="M8.6 9.4 15.4 14.6" transform="rotate(35 12 12)" strokeDasharray="1.6 2" />
  </Svg>
)

export const RulerIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <path d="M3.8 15.4 15.4 3.8a1.4 1.4 0 0 1 2 0l2.8 2.8a1.4 1.4 0 0 1 0 2L8.6 20.2a1.4 1.4 0 0 1-2 0l-2.8-2.8a1.4 1.4 0 0 1 0-2Z" />
    <path d="m7.3 12 1.8 1.8M10 9.3l1.2 1.2M12.6 6.7l1.8 1.8M15.3 4l1.2 1.2" />
  </Svg>
)

export const ShapesIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <circle cx="9" cy="9.5" r="5.5" />
    <rect x="10" y="10.5" width="10" height="10" rx="2" />
  </Svg>
)

export const AddColorIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <circle cx="11" cy="13" r="8" strokeDasharray="2.7 2.4" />
    <circle cx="18.3" cy="5.7" r="4" fill="currentColor" stroke="none" />
    <path d="M18.3 3.9v3.6M16.5 5.7h3.6" stroke="#1E1B1B" strokeWidth={1.4} />
  </Svg>
)

export const FilterIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <circle cx="8" cy="7" r="3.3" />
    <circle cx="16" cy="17" r="3.3" />
    <path d="M14 7h7M3 17h7" />
  </Svg>
)

export const FreeLassoIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <path d="M8.5 18.5C4.5 17.6 3 15 3.4 11.8 4 7 9 3.9 14.3 4.4c4.4.4 6.6 3 6.2 6.2-.6 4-5.6 6.4-10.8 6.2" strokeDasharray="2.6 2.4" />
    <path d="M9.6 16.8c-1.8.6-2.4 1.9-1.7 3.4" />
  </Svg>
)

export const RectLassoIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="2.4" strokeDasharray="2.6 2.4" />
  </Svg>
)

export const DotIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.4" fill="currentColor" />
    <circle cx="12" cy="12" r="7.5" opacity=".35" />
  </Svg>
)

export const TrailIcon = (p: IconProps): JSX.Element => (
  <Svg {...p}>
    <path d="M3.5 17.5c3-1 4-6 7-6.5s3.6 4 7 3.4" opacity=".55" />
    <circle cx="19" cy="13.8" r="2.2" fill="currentColor" />
  </Svg>
)

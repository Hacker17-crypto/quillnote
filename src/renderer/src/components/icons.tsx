/** Original Quillnote icons that lucide does not cover (24px grid, 2px stroke, rounded). */
import type { SVGProps } from 'react'

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'size'> {
  size?: number
  strokeWidth?: number
}

function Svg({ size = 24, strokeWidth = 2, children, ...rest }: IconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

/** Bookmark outline with a small star inside — Favorites. */
export function FavoritesIcon(p: IconProps): JSX.Element {
  return (
    <Svg {...p}>
      <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.2L5 21V4.5a1 1 0 0 1 1-1Z" />
      <path d="m12 7.2 1.1 2.3 2.5.35-1.8 1.75.45 2.5L12 12.9l-2.25 1.2.45-2.5-1.8-1.75 2.5-.35L12 7.2Z" fill="currentColor" strokeWidth={1} />
    </Svg>
  )
}

/** Folder with a solid fill, used for the selected Documents row (cyan). */
export function FolderFilledIcon({ size = 24, ...rest }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...rest}>
      <path
        d="M3 6.5A2.5 2.5 0 0 1 5.5 4h3.9c.6 0 1.2.25 1.6.7L12 5.8h6.5A2.5 2.5 0 0 1 21 8.3V17.5A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5V6.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

/** Whiteboard: rounded frame with a dotted grid. */
export function WhiteboardIcon(p: IconProps): JSX.Element {
  const dots: JSX.Element[] = []
  for (const y of [9, 12, 15]) for (const x of [8, 12, 16]) dots.push(<path key={`${x}${y}`} d={`M${x} ${y}h.01`} strokeWidth={2.4} />)
  return (
    <Svg {...p}>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      {dots}
    </Svg>
  )
}

/** Dashed circle with a plus — "add colour". */
export function AddColorIcon(p: IconProps): JSX.Element {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" strokeDasharray="3.2 3.2" />
      <path d="M12 8.5v7M8.5 12h7" />
    </Svg>
  )
}

/** Text box: a rounded square with a T. */
export function TextBoxIcon(p: IconProps): JSX.Element {
  return (
    <Svg {...p}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M8.5 9V8h7v1M12 8v8M10.5 16h3" />
    </Svg>
  )
}

/** Small gift in an open hand — Marketplace caption. */
export function GiftHandIcon({ size = 14, ...rest }: IconProps): JSX.Element {
  return (
    <Svg size={size} strokeWidth={1.6} {...rest}>
      <rect x="9" y="3" width="10" height="6" rx="1" />
      <path d="M14 3v6M9 6h10" />
      <path d="M2 14.5h3l3.2 1.6 5.3-.1a1.4 1.4 0 0 1 0 2.8H9.5M8.2 16.1l6.9-2.4 4.2 2.1L12 21l-6-1.8" />
    </Svg>
  )
}

/** Quillnote logo mark: a quill nib in a rounded square, cyan → blue. */
export function LogoMark({ size = 20 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="qn-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7FE6F7" />
          <stop offset="1" stopColor="#2E7BFF" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#qn-logo)" />
      <path d="M22.5 7.5c-6.5 1-11 5.6-12.2 12.3l-1 4.7 4.7-1c6.6-1.3 10.7-6 11-12.4a.8.8 0 0 0-.9-.8l-1.6.1Z" fill="#fff" />
      <path d="M9.5 24.5c2.5-4 5.8-7.2 9.5-9.8" stroke="#2E7BFF" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

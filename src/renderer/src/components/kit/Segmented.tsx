import type { ReactNode } from 'react'

export interface SegmentOption<T extends string> {
  value: T
  label?: ReactNode
  icon?: ReactNode
  title?: string
}

interface SegmentedProps<T extends string> {
  value: T
  options: SegmentOption<T>[]
  onChange: (v: T) => void
  /** `pill` = rounded capsule (default); `icons` = compact icon-only pair. */
  variant?: 'pill' | 'icons'
  ariaLabel?: string
}

export function SegmentedControl<T extends string>({ value, options, onChange, variant = 'pill', ariaLabel }: SegmentedProps<T>): JSX.Element {
  return (
    <div className={`q-seg ${variant}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          aria-label={o.title}
          title={o.title}
          className={`q-seg-item${o.value === value ? ' on' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.icon}
          {o.label !== undefined && <span>{o.label}</span>}
        </button>
      ))}
    </div>
  )
}

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Tooltip } from './Tooltip'

type Variant = 'primary' | 'ghost' | 'outline' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  icon?: ReactNode
  /** Trailing icon (e.g. a chevron). */
  trailing?: ReactNode
}

/** Pill button: `primary` (blue), `ghost` (quiet), `outline` (1px border), `danger`. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'ghost', icon, trailing, className = '', children, type = 'button', ...rest },
  ref
) {
  return (
    <button ref={ref} type={type} className={`q-btn ${variant} ${className}`} {...rest}>
      {icon}
      {children !== undefined && <span>{children}</span>}
      {trailing}
    </button>
  )
})

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  active?: boolean
  size?: number
  /** Show a tooltip with the label (default true). */
  tip?: boolean
}

/** Round icon-only button; `label` is the accessible name and tooltip. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, active, size = 36, tip = true, className = '', children, type = 'button', style, ...rest },
  ref
) {
  const btn = (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      aria-pressed={active}
      className={`q-iconbtn${active ? ' active' : ''} ${className}`}
      style={{ width: size, height: size, ...style }}
      {...rest}
    >
      {children}
    </button>
  )
  return tip ? <Tooltip label={label}>{btn}</Tooltip> : btn
})

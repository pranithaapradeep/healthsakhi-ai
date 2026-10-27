import type { ComponentProps, ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-forest-800 text-white shadow-sm hover:bg-forest-900 active:bg-forest-950 disabled:bg-forest-800/45',
  secondary: 'bg-white text-forest-900 ring-1 ring-inset ring-line hover:bg-sage-50 hover:ring-forest-300 active:bg-sage-100 disabled:text-forest-900/45',
  ghost: 'text-slate-700 hover:bg-sage-100 active:bg-sage-200 disabled:text-slate-400',
  danger: 'bg-red-700 text-white shadow-sm hover:bg-red-800 active:bg-red-900 disabled:bg-red-700/45',
}

interface ButtonProps extends ComponentProps<'button'> {
  variant?: Variant
  loading?: boolean
  icon?: ReactNode
}

export default function Button({ variant = 'primary', loading = false, icon, className = '', children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
}

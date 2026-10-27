import type { ReactNode } from 'react'
import { CircleCheck, Info, TriangleAlert } from 'lucide-react'

type Tone = 'info' | 'success' | 'warning' | 'danger'

// A coloured left edge + tinted background; text stays dark for readability.
const TONES: Record<Tone, { box: string; icon: string; Icon: typeof Info }> = {
  info: { box: 'border-sky-200 border-l-sky-600 bg-sky-50/70 text-slate-800', icon: 'text-sky-700', Icon: Info },
  success: { box: 'border-forest-200 border-l-forest-600 bg-forest-50 text-slate-800', icon: 'text-forest-700', Icon: CircleCheck },
  warning: { box: 'border-amber-200 border-l-amber-500 bg-amber-50 text-amber-950', icon: 'text-amber-700', Icon: TriangleAlert },
  danger: { box: 'border-red-200 border-l-red-600 bg-red-50 text-red-950', icon: 'text-red-700', Icon: TriangleAlert },
}

interface AlertProps {
  tone?: Tone
  title?: string
  children?: ReactNode
  action?: ReactNode
}

export default function Alert({ tone = 'info', title, children, action }: AlertProps) {
  const { box, icon, Icon } = TONES[tone]
  const urgent = tone === 'danger' || tone === 'warning'
  return (
    <div role={urgent ? 'alert' : 'status'} className={`flex gap-3 rounded-lg border border-l-4 p-4 ${box}`}>
      <Icon className={`mt-0.5 size-5 shrink-0 ${icon}`} aria-hidden />
      <div className="min-w-0 flex-1 text-[0.9375rem] leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-1' : ''}>{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  )
}

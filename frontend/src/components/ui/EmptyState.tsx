import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  body?: string
  action?: ReactNode
}

export default function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-line bg-white px-6 py-10 text-center">
      {icon && <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-sage-100 text-forest-700 [&>svg]:size-6">{icon}</div>}
      <p className="font-semibold text-ink">{title}</p>
      {body && <p className="mt-1 max-w-md text-sm leading-relaxed text-slate-600">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

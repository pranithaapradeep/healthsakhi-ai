import type { ReactNode } from 'react'

/** Page title block: a serif heading, a short subtitle, optional actions, and a hairline underneath. */
export default function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold leading-tight text-ink sm:text-[2.5rem]">{title}</h1>
        {subtitle && <p className="mt-2 text-lg leading-relaxed text-slate-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

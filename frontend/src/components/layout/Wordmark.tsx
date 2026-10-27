/** The HealthSakhi AI logo: a leaf mark and the name. Used in the header and footer. */
export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <rect width="32" height="32" rx="9" className="fill-forest-800" />
      <path d="M8.5 23.5C8.5 14.5 14.5 9 24 8.5c0 9.5-5.5 15-15.5 15Z" className="fill-forest-100" />
      <path d="M9 23 19.5 12.5" className="stroke-forest-800" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <circle cx="23.5" cy="23" r="2.5" className="fill-terracotta-500" />
    </svg>
  )
}

export default function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className={`font-display font-semibold tracking-tight text-ink ${compact ? 'text-lg' : 'text-xl'}`}>
        HealthSakhi
        <span className="ml-1 align-[0.15em] font-sans text-xs font-bold tracking-[0.12em] text-terracotta-600">AI</span>
      </span>
    </span>
  )
}

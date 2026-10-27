import { LoaderCircle } from 'lucide-react'

export default function Spinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-2.5 py-2 text-sm text-slate-600">
      <LoaderCircle className="size-5 animate-spin text-forest-700" aria-hidden />
      <span>{label}</span>
    </div>
  )
}

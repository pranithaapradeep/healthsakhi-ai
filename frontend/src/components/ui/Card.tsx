import type { HTMLAttributes } from 'react'

/** A plain white surface with a warm hairline border. */
export default function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-xl border border-line bg-white p-5 ${className}`} {...rest} />
}

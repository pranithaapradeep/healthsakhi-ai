import { useState } from 'react'
import type { TipCategory, TipImage as TipImageData } from '../../data/tipTypes'
import { CATEGORY_ICONS, CATEGORY_TINTS } from './categoryIcons'

interface Props {
  image: TipImageData | undefined
  category: TipCategory | 'all'
  /** Describes the photo; also used for the illustration that replaces a missing photo. */
  alt: string
  /** Decorative images (e.g. category tiles whose title is next to them) are hidden from screen readers. */
  decorative?: boolean
  className?: string
  /** A small thumbnail (e.g. a category tile): smaller illustration icon, no background shapes. */
  small?: boolean
}

/** A lazy-loaded photo, or — if there is none or it fails to load — a soft illustrated panel. */
export default function TipImage({ image, category, alt, decorative = false, className = '', small = false }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  if (!image || failedSrc === image.src) {
    const Icon = CATEGORY_ICONS[category]
    return (
      <div
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : alt}
        aria-hidden={decorative || undefined}
        data-testid="tip-image-fallback"
        className={`relative flex items-center justify-center overflow-hidden bg-linear-to-br ${CATEGORY_TINTS[category]} ${className}`}
      >
        {!small && (
          <>
            <span className="absolute -right-6 -top-6 size-24 rounded-full bg-white/40" aria-hidden />
            <span className="absolute -bottom-8 -left-4 size-28 rounded-full bg-white/30" aria-hidden />
          </>
        )}
        <Icon className={`relative text-forest-800/60 ${small ? 'size-5' : 'size-10'}`} strokeWidth={small ? 1.75 : 1.5} aria-hidden />
      </div>
    )
  }
  return (
    <img
      src={image.src}
      width={image.width}
      height={image.height}
      alt={decorative ? '' : alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailedSrc(image.src)}
      className={`bg-sage-100 object-cover ${className}`}
    />
  )
}

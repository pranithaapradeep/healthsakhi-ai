import { Apple, Droplets, HeartPulse, LayoutGrid, Leaf, Sparkles, Thermometer, Wheat, type LucideIcon } from 'lucide-react'
import type { TipCategory } from '../../data/tipTypes'

export const CATEGORY_ICONS: Record<TipCategory | 'all', LucideIcon> = {
  all: LayoutGrid,
  nutrition: Apple,
  heartBrain: HeartPulse,
  ayurveda: Leaf,
  coldFever: Thermometer,
  digestion: Wheat,
  hairSkin: Sparkles,
  liverKidney: Droplets,
}

/** Soft illustrated backgrounds used when a photo is missing or fails to load. */
export const CATEGORY_TINTS: Record<TipCategory | 'all', string> = {
  all: 'from-[#e9f1e4] via-[#f6efe1] to-[#f3e3d3]',
  nutrition: 'from-[#fde9cf] via-[#f4f1d8] to-[#dcefd6]',
  heartBrain: 'from-[#fbe1e1] via-[#f7ece4] to-[#e6ecf7]',
  ayurveda: 'from-[#dcebd5] via-[#eef3e3] to-[#f6efd9]',
  coldFever: 'from-[#fdf0cf] via-[#f8eadf] to-[#e5eef3]',
  digestion: 'from-[#fbe6cf] via-[#f6f0dc] to-[#e3efdc]',
  hairSkin: 'from-[#fbe0e4] via-[#f8ede6] to-[#e4f0e3]',
  liverKidney: 'from-[#dcecf3] via-[#eaf3ee] to-[#f5efe2]',
}

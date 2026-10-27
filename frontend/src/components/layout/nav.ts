import { ClipboardList, History, LayoutDashboard, Lightbulb, MapPin, MessageCircle, User } from 'lucide-react'
import type { StringKey } from '../../i18n/strings'

export const NAV_ITEMS: { to: string; key: StringKey; Icon: typeof MessageCircle }[] = [
  { to: '/dashboard', key: 'nav.dashboard', Icon: LayoutDashboard },
  { to: '/chat', key: 'nav.chat', Icon: MessageCircle },
  { to: '/assessment', key: 'nav.assessment', Icon: ClipboardList },
  { to: '/hospitals', key: 'nav.hospitals', Icon: MapPin },
  { to: '/tips', key: 'nav.tips', Icon: Lightbulb },
  { to: '/history', key: 'nav.history', Icon: History },
  { to: '/profile', key: 'nav.profile', Icon: User },
]

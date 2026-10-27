import type { Lang } from '../i18n/strings'

export interface User {
  id: string
  display_name: string
  email: string
  preferred_language: Lang
  voice_autoplay: boolean
  created_at: string
}

export interface ConversationSummary {
  id: string
  title: string
  language: Lang
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  message_text: string
  created_at: string
}

export interface ConversationDetail extends ConversationSummary {
  messages: Message[]
}

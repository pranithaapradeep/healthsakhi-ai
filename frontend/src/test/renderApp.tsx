import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import App from '../App'
import { AuthProvider } from '../auth/AuthContext'
import { LanguageProvider } from '../i18n/LanguageContext'
import type { Lang } from '../i18n/strings'

export function renderApp(path = '/', lang?: Lang) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageProvider initialLang={lang}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LanguageProvider>
    </MemoryRouter>,
  )
}

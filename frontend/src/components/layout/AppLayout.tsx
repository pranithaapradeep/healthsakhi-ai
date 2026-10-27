import { Outlet } from 'react-router'
import { useLanguage } from '../../i18n/LanguageContext'
import Footer from './Footer'
import Navbar from './Navbar'

export default function AppLayout() {
  const { t } = useLanguage()
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow">
        {t('common.skip')}
      </a>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

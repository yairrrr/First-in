import { useEffect, useRef } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { StageBanner } from './components/StageBanner'
import { useApp } from './state/AppContext'
import { useT } from './i18n/useT'
import { LANGUAGES, type Language } from './i18n/strings'
import { Icon } from './components/Icon'
import logoMark from './assets/logo-mark.png'

const LANGUAGE_LABELS: Record<Language, string> = { he: 'עברית', en: 'English' }

/** Application shell: header and the routed screen. */
export function App() {
  const { state, dispatch, storageFailed } = useApp()
  const { t, language } = useT()
  const headerRef = useRef<HTMLElement>(null)

  // The header height is published as a CSS variable so the project screen
  // can fill exactly the remaining viewport at any width and in both languages.
  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    const publish = () =>
      document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`)
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  // Direction and language are set on the document so scrolling and punctuation follow.
  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr'
  }, [language])

  return (
    <div className="app">
      <header className="header" ref={headerRef}>
        {/* Three equal-width zones keep the wordmark truly centered */}
        <div className="header-side">
          <Link to="/" className="logo-link">
            <img src={logoMark} alt="First-In" className="logo-img" />
          </Link>
          <StageBanner />
        </div>

        <Link to="/" className="brand-center">
          <span className="brand-name">First-In</span>
          <span className="slogan" dir="ltr">
            {t('app.slogan')}
          </span>
        </Link>

        <div className="header-side header-end">
          <label className="language-switch" title={t('settings.language')}>
            <Icon name="globe" size={16} />
            <span className="language-label">{t('settings.language')}</span>
            <select
              value={state.language}
              onChange={(event) =>
                dispatch({ type: 'LANGUAGE_CHANGED', language: event.target.value as Language })
              }
            >
              {LANGUAGES.map((option) => (
                <option key={option} value={option}>
                  {LANGUAGE_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {storageFailed && (
        <div className="storage-warning" role="alert">
          <Icon name="alert" size={16} />
          {t('storage.failed')}
        </div>
      )}

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}

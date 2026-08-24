import { useEffect, useRef } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { StageBanner } from './components/StageBanner'
import { useApp } from './state/AppContext'
import { useT } from './i18n/useT'
import { LANGUAGES, type Language } from './i18n/strings'
import { Icon } from './components/Icon'
import logoMark from './assets/logo-mark.png'

const LANGUAGE_LABELS: Record<Language, string> = { he: 'עברית', en: 'English' }

/** מסגרת קבועה לכל המסכים. המסך עצמו נכנס ל-Outlet. */
export function App() {
  const { state, dispatch } = useApp()
  const { t, language } = useT()
  const headerRef = useRef<HTMLElement>(null)

  // גובה הכותרת נמדד ומפורסם כמשתנה CSS, כדי שמסך הפרויקט יוכל למלא
  // בדיוק את מה שנשאר מגובה החלון — בכל רוחב מסך ובכל שפה.
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

  // כיוון הדף ושפתו נקבעים במסמך עצמו, לא ברכיב — כך גם הגלילה והפיסוק מתיישרים.
  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr'
  }, [language])

  return (
    <div className="app">
      {/* כתמי אור שטים ברקע. עומק בלי הסחה, נכבים ב-prefers-reduced-motion. */}
      <div className="ambient" aria-hidden="true">
        <div className="blob blob-purple" />
        <div className="blob blob-cyan" />
      </div>

      <header className="header" ref={headerRef}>
        {/* שלושה אזורים שווי רוחב, כדי שהשם יישב במרכז אמיתי של המסך */}
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

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}

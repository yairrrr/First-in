import { Link, Outlet } from 'react-router-dom'
import { StageBanner } from './components/StageBanner'
import logoMark from './assets/logo-mark.png'

/** מסגרת קבועה לכל המסכים. המסך עצמו נכנס ל-Outlet. */
export function App() {
  return (
    <div className="app">
      {/* כתמי אור שטים ברקע. עומק בלי הסחה, נכבים ב-prefers-reduced-motion. */}
      <div className="ambient" aria-hidden="true">
        <div className="blob blob-purple" />
        <div className="blob blob-cyan" />
      </div>

      <header className="header">
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
            Build what you want. Learn what you built.
          </span>
        </Link>

        <div className="header-side header-end" />
      </header>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}

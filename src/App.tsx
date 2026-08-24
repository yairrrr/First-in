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
        <Link to="/" className="brand">
          <img src={logoMark} alt="First-In" className="logo-img" />
          <span className="brand-name">First-In</span>
        </Link>
        <StageBanner />
        <span className="tagline" dir="ltr">
          Build with AI. Learn the code.
        </span>
      </header>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}

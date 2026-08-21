import { Link, Outlet } from 'react-router-dom'

/** מסגרת קבועה לכל המסכים. המסך עצמו נכנס ל-Outlet. */
export function App() {
  return (
    <div className="app">
      <header className="header">
        <span className="logo-mark" aria-hidden="true">⚡</span>
        <Link to="/" className="brand">
          First-In
        </Link>
        <span className="tagline" dir="ltr">
          Creation First. Understanding Along the Way.
        </span>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}

import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import { reducer } from './reducer'
import { loadState, saveState } from './persistence'
import type { Action, AppState } from './types'

interface AppContextValue {
  state: AppState
  dispatch: (action: Action) => void
}

const AppContext = createContext<AppContextValue | null>(null)

/** האחסון של הדפדפן. אינו קיים בסביבת בדיקות, ולכן נבדק ולא מונח. */
function browserStorage() {
  return typeof localStorage === 'undefined' ? undefined : localStorage
}

export function AppProvider({ children }: { children: ReactNode }) {
  // המצב ההתחלתי נטען פעם אחת, ולא בכל רינדור.
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState(browserStorage()))

  useEffect(() => {
    saveState(browserStorage(), state)
  }, [state])

  return <AppContext value={{ state, dispatch }}>{children}</AppContext>
}

/** הדרך היחידה של רכיב לקרוא מצב או לשלוח פעולה. */
export function useApp(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp נקרא מחוץ ל-AppProvider')
  return value
}

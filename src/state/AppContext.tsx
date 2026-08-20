import { createContext, useContext, useReducer, type ReactNode } from 'react'
import { initialState, reducer } from './reducer'
import type { Action, AppState } from './types'

interface AppContextValue {
  state: AppState
  dispatch: (action: Action) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return <AppContext value={{ state, dispatch }}>{children}</AppContext>
}

/** הדרך היחידה של רכיב לקרוא מצב או לשלוח פעולה. */
export function useApp(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp נקרא מחוץ ל-AppProvider')
  return value
}

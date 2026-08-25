import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import { reducer } from './reducer'
import { loadState, saveState } from './persistence'
import type { Action, AppState } from './types'

interface AppContextValue {
  state: AppState
  dispatch: (action: Action) => void
}

const AppContext = createContext<AppContextValue | null>(null)

/** localStorage is absent in the test environment. */
function browserStorage() {
  return typeof localStorage === 'undefined' ? undefined : localStorage
}

export function AppProvider({ children }: { children: ReactNode }) {
  // Lazy initializer: stored state is read once, not on every render.
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState(browserStorage()))

  useEffect(() => {
    saveState(browserStorage(), state)
  }, [state])

  return <AppContext value={{ state, dispatch }}>{children}</AppContext>
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used within AppProvider')
  return value
}

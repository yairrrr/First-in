import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from 'react'
import { reducer } from './reducer'
import { STORAGE_KEY, loadState, saveState } from './persistence'
import type { Action, AppState } from './types'

interface AppContextValue {
  state: AppState
  dispatch: (action: Action) => void
  /** True when the last persistence write failed (for example, storage quota exceeded). */
  storageFailed: boolean
}

const AppContext = createContext<AppContextValue | null>(null)

/** localStorage is absent in the test environment. */
function browserStorage() {
  return typeof localStorage === 'undefined' ? undefined : localStorage
}

export function AppProvider({ children }: { children: ReactNode }) {
  // Lazy initializer: stored state is read once, not on every render.
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState(browserStorage()))
  const [storageFailed, setStorageFailed] = useState(false)

  useEffect(() => {
    setStorageFailed(!saveState(browserStorage(), state))
  }, [state])

  // Another tab wrote newer state. Adopt it, otherwise this tab's next write would
  // overwrite the other tab's progress with a stale copy.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || event.storageArea !== browserStorage()) return
      dispatch({ type: 'STATE_HYDRATED', state: loadState(browserStorage()) })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return <AppContext value={{ state, dispatch, storageFailed }}>{children}</AppContext>
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used within AppProvider')
  return value
}

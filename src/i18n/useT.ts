import { useCallback } from 'react'
import { useApp } from '../state/AppContext'
import { translate, type StringKey, type Vars } from './strings'

/** Translation hook bound to the current UI language. */
export function useT() {
  const { state } = useApp()
  const language = state.language
  const t = useCallback((key: StringKey, vars?: Vars) => translate(language, key, vars), [language])
  return { t, language }
}

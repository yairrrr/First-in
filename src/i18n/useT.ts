import { useCallback } from 'react'
import { useApp } from '../state/AppContext'
import { translate, type StringKey, type Vars } from './strings'

/** הדרך של רכיב לקבל מחרוזת בשפה הנוכחית. */
export function useT() {
  const { state } = useApp()
  const language = state.language
  const t = useCallback((key: StringKey, vars?: Vars) => translate(language, key, vars), [language])
  return { t, language }
}

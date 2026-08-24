import type { LlmProvider } from './types'
import { createFixtureProvider } from './fixtureProvider'
import { createOllamaProvider } from './ollamaProvider'
import type { Language } from '../state/types'

export type ProviderKind = 'ollama' | 'fixture'

/**
 * הבחירה בין מודל אמיתי לתשובה שמורה.
 * מצב ההדגמה הוא ההקטנה שהובטחה ב-ADR-001: מי שאין לו Ollama עדיין רואה מוצר עובד.
 * השפה נחוצה רק לספק השמור, כדי להחזיר שיעור בשפת הממשק.
 */
export function createProvider(kind: ProviderKind, language: Language = 'he'): LlmProvider {
  return kind === 'fixture' ? createFixtureProvider(language) : createOllamaProvider()
}

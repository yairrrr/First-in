import type { LlmProvider } from './types'
import { createFixtureProvider } from './fixtureProvider'
import { createOllamaProvider } from './ollamaProvider'

export type ProviderKind = 'ollama' | 'fixture'

/**
 * הבחירה בין מודל אמיתי לתשובה שמורה.
 * מצב ההדגמה הוא ההקטנה שהובטחה ב-ADR-001: מי שאין לו Ollama עדיין רואה מוצר עובד.
 */
export function createProvider(kind: ProviderKind): LlmProvider {
  return kind === 'fixture' ? createFixtureProvider() : createOllamaProvider()
}

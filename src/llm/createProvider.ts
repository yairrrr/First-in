import type { LlmProvider } from './types'
import type { Project } from '../state/types'
import { createFixtureProvider } from './fixtureProvider'
import { createOllamaProvider } from './ollamaProvider'

export type ProviderKind = Project['provider']

/**
 * הבחירה בין מודל אמיתי לתשובה שמורה.
 * מצב ההדגמה הוא ההקטנה שהובטחה ב-ADR-001: מי שאין לו Ollama עדיין רואה מוצר עובד.
 */
export function createProvider(kind: ProviderKind): LlmProvider {
  return kind === 'fixture' ? createFixtureProvider() : createOllamaProvider()
}

import type { LlmProvider } from './types'
import { createFixtureProvider } from './fixtureProvider'
import { createOllamaProvider } from './ollamaProvider'
import type { Language } from '../state/types'

export type ProviderKind = 'ollama' | 'fixture'

/**
 * Selects the real model or the recorded provider. Demo mode lets the app run
 * without Ollama installed. The language is only used by the recorded provider,
 * to serve lessons in the UI language.
 */
export function createProvider(kind: ProviderKind, language: Language = 'he'): LlmProvider {
  return kind === 'fixture' ? createFixtureProvider(language) : createOllamaProvider()
}

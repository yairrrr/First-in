import type { LlmProvider, LlmRequest, LlmResponse } from './types'
import { memoryGameHtml } from './fixtures/memoryGame'

/**
 * ספק שמחזיר תשובות שמורות מראש, בלי לדבר עם שום מודל.
 * שני תפקידים: בדיקות אוטומטיות יציבות, ומצב הדגמה למי שאין לו Ollama.
 */
export function createFixtureProvider(): LlmProvider {
  return {
    name: 'fixture',
    async complete(_request: LlmRequest): Promise<LlmResponse> {
      return { text: memoryGameHtml }
    },
  }
}

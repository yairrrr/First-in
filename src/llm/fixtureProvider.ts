import type { LlmProvider, LlmRequest, LlmResponse } from './types'
import memoryHtml from './fixtures/samples/memory.html?raw'

/**
 * ספק שמחזיר תשובות שמורות מראש, בלי לדבר עם שום מודל.
 * שני תפקידים: בדיקות אוטומטיות יציבות, ומצב הדגמה למי שאין לו Ollama.
 *
 * התשובה השמורה היא פלט אמיתי של gemma4:12b, ולא קוד שנכתב ביד.
 * חשוב שתהיה כזו: הקוד שלנו חייב לעמוד במה שהמודל באמת מוציא.
 */
export function createFixtureProvider(): LlmProvider {
  return {
    name: 'fixture',
    async complete(_request: LlmRequest): Promise<LlmResponse> {
      return { text: memoryHtml }
    },
  }
}

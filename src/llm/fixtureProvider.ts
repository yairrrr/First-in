import type { LlmProvider, LlmRequest, LlmResponse } from './types'
import memoryHtml from './fixtures/samples/memory.html?raw'
import assembleLesson from './fixtures/samples/lesson-assemble.json?raw'
import choiceLesson from './fixtures/samples/lesson-choice.json?raw'

/**
 * ספק שמחזיר תשובות שמורות מראש, בלי לדבר עם שום מודל.
 * שני תפקידים: בדיקות אוטומטיות יציבות, ומצב הדגמה למי שאין לו Ollama.
 *
 * כל התשובות הן פלט אמיתי של gemma4:12b, ולא קוד שנכתב ביד.
 * מגבלה מודעת: במצב הדגמה כל הפרקים חולקים שני שיעורים שמורים.
 */
export function createFixtureProvider(): LlmProvider {
  return {
    name: 'fixture',
    async complete(request: LlmRequest): Promise<LlmResponse> {
      // בקשה בלי סכמה היא בקשת בנייה. עם סכמה — שיעור, והסוג מזוהה לפי הצורה.
      if (!request.schema) return { text: memoryHtml }
      const properties = (request.schema.properties ?? {}) as Record<string, unknown>
      return { text: 'tokens' in properties ? assembleLesson : choiceLesson }
    },
  }
}

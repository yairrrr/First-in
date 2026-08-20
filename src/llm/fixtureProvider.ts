import type { LlmProvider, LlmRequest, LlmResponse } from './types'
import memoryHtml from './fixtures/samples/memory.html?raw'
import lessonJson from './fixtures/samples/lesson.json?raw'

/**
 * ספק שמחזיר תשובות שמורות מראש, בלי לדבר עם שום מודל.
 * שני תפקידים: בדיקות אוטומטיות יציבות, ומצב הדגמה למי שאין לו Ollama.
 *
 * שתי התשובות הן פלט אמיתי של gemma4:12b, ולא קוד שנכתב ביד.
 * חשוב שיהיו כאלה: הקוד שלנו חייב לעמוד במה שהמודל באמת מוציא.
 */
export function createFixtureProvider(): LlmProvider {
  return {
    name: 'fixture',
    async complete(request: LlmRequest): Promise<LlmResponse> {
      // בקשה עם סכמה היא בקשת שיעור. בקשה חופשית היא בקשת בנייה.
      return { text: request.schema ? lessonJson : memoryHtml }
    },
  }
}

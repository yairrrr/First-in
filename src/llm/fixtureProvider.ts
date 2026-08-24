import type { LlmProvider, LlmRequest, LlmResponse } from './types'
import type { Language } from '../state/types'
import memoryHtml from './fixtures/samples/memory.html?raw'
import assembleHe from './fixtures/samples/lesson-assemble.json?raw'
import choiceHe from './fixtures/samples/lesson-choice.json?raw'
import assembleEn from './fixtures/samples/lesson-assemble.en.json?raw'
import choiceEn from './fixtures/samples/lesson-choice.en.json?raw'

const LESSONS: Record<Language, { assemble: string; choice: string }> = {
  he: { assemble: assembleHe, choice: choiceHe },
  en: { assemble: assembleEn, choice: choiceEn },
}

/**
 * ספק שמחזיר תשובות שמורות מראש, בלי לדבר עם שום מודל.
 * שני תפקידים: בדיקות אוטומטיות יציבות, ומצב הדגמה למי שאין לו Ollama.
 *
 * כל התשובות הן פלט אמיתי של gemma4:12b, ולא קוד שנכתב ביד.
 * מגבלה מודעת: במצב הדגמה כל הפרקים חולקים שני שיעורים שמורים לכל שפה.
 */
export function createFixtureProvider(language: Language = 'he'): LlmProvider {
  return {
    name: 'fixture',
    async complete(request: LlmRequest): Promise<LlmResponse> {
      // בקשה בלי סכמה היא בקשת בנייה. עם סכמה — שיעור, והסוג מזוהה לפי הצורה.
      if (!request.schema) return { text: memoryHtml }
      const properties = (request.schema.properties ?? {}) as Record<string, unknown>
      const lessons = LESSONS[language]
      return { text: 'tokens' in properties ? lessons.assemble : lessons.choice }
    },
  }
}

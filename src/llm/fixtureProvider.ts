import type { LlmProvider, LlmRequest, LlmResponse } from './types'
import type { Language } from '../state/types'
import { REVISE_MARKER } from '../services/projectReviser'
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
      // בקשת שינוי: מחזירים את הקוד הנוכחי עם שורת הדגמה, כדי שהזרימה תיראה.
      if (!request.schema && request.prompt.includes(REVISE_MARKER)) {
        return { text: demoRevision(request.prompt) }
      }
      // בקשה בלי סכמה היא בקשת בנייה. עם סכמה — שיעור, והסוג מזוהה לפי הצורה.
      if (!request.schema) return { text: memoryHtml }
      const properties = (request.schema.properties ?? {}) as Record<string, unknown>
      const lessons = LESSONS[language]
      return { text: 'tokens' in properties ? lessons.assemble : lessons.choice }
    },
  }
}

/**
 * מצב הדגמה לא יכול לשכתב קוד באמת. במקום זה: הקוד הנוכחי חוזר עם פס דק
 * בראש הדף שמצטט את ההערה — כך רואים שהשינוי "התקבל", בלי להעמיד פנים.
 */
function demoRevision(prompt: string): string {
  const instruction = (/^The user's request: (.*)$/m.exec(prompt)?.[1] ?? '').trim()
  const code = prompt.slice(prompt.indexOf(REVISE_MARKER) + REVISE_MARKER.length).trim()
  const note =
    `<p style="margin:0;padding:6px 12px;background:#1b1b26;color:#9b9bb0;` +
    `font:13px system-ui;text-align:center">Demo revision: ${escapeHtml(instruction)}</p>`
  return code.includes('<body') ? code.replace(/<body([^>]*)>/i, `<body$1>${note}`) : note + code
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)
}

import { OllamaError } from '../llm/ollamaProvider'
import { BuildError } from '../services/projectBuilder'
import { translate, type Language } from './strings'

/**
 * הודעת שגיאה לתצוגה, בשפת המשתמש.
 * שגיאות עם קוד מתורגמות; שגיאה זרה מציגה את הטקסט שלה כפי שהוא.
 */
export function errorMessage(language: Language, error: unknown): string {
  if (error instanceof OllamaError) {
    if (error.code === 'unreachable') return translate(language, 'error.ollamaUnreachable')
    if (error.code === 'http') return translate(language, 'error.ollamaHttp', { status: error.status ?? '?' })
    return translate(language, 'error.ollamaFormat')
  }
  if (error instanceof BuildError) {
    return translate(language, error.code === 'emptyPrompt' ? 'error.emptyPrompt' : 'error.notHtml')
  }
  if (error instanceof Error && error.message) return error.message
  return translate(language, 'error.unknown')
}

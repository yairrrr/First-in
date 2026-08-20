import type { LlmProvider } from '../llm/types'
import { stripCodeFence } from './stripCodeFence'

/**
 * projectBuilder — פרומפט של המשתמש נכנס, קוד HTML שלם יוצא.
 *
 * הבקשה מנוסחת כך שהפלט יהיה קובץ אחד עצמאי, מהסיבה שבסעיף 7 ב-PRD:
 * ה-MVP רץ בדפדפן בלבד, ואין לו מערכת קבצים שתחזיק כמה קבצים.
 */

export const BUILD_SYSTEM_PROMPT = [
  'You are a code generator. You output code and nothing else.',
  'Return exactly one self-contained HTML file: markup, CSS in a <style> tag, and JavaScript in a <script> tag.',
  'Use flexbox for layout. Do not use any external library, font, image, or network request.',
  'Do not write explanations, comments about your process, or markdown fences.',
].join(' ')

/** נזרקת כשהמודל החזיר משהו שאינו מסמך HTML. */
export class BuildError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BuildError'
  }
}

export async function buildProject(provider: LlmProvider, prompt: string): Promise<string> {
  const trimmed = prompt.trim()
  if (!trimmed) throw new BuildError('הפרומפט ריק')

  const { text } = await provider.complete({
    system: BUILD_SYSTEM_PROMPT,
    prompt: trimmed,
  })

  const html = stripCodeFence(text)
  if (!looksLikeHtml(html)) {
    throw new BuildError('המודל לא החזיר מסמך HTML. נסה לנסח את הבקשה מחדש.')
  }

  return html
}

/**
 * בדיקת שפיות ולא ולידציה מלאה.
 * המטרה היחידה: לתפוס מקרה שבו המודל החזיר טקסט חופשי במקום קוד,
 * לפני שנפתח לו iframe ונציג למשתמש דף לבן.
 */
export function looksLikeHtml(text: string): boolean {
  const head = text.trimStart().slice(0, 200).toLowerCase()
  return head.startsWith('<!doctype html') || head.startsWith('<html')
}

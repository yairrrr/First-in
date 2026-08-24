import type { LlmProvider } from '../llm/types'
import { stripCodeFence } from './stripCodeFence'
import { BuildError, looksLikeHtml } from './projectBuilder'

/**
 * projectReviser — הקוד הנוכחי והערה של המשתמש נכנסים, קוד מעודכן יוצא.
 *
 * זו "השיחה על הפרויקט": המשתמש מגיב על מה שיצא, כמו שמגיבים למפתח,
 * והמודל משכתב את הקובץ כולו. קובץ שלם ולא diff — כי קובץ HTML יחיד
 * הוא היחידה שכל שאר המערכת (תצוגה, פיצול לפרקים) יודעת לעבוד איתה.
 */

export const REVISE_SYSTEM_PROMPT = [
  'You are editing an existing single-file HTML app that the user already built and is looking at.',
  'Apply exactly the change the user asks for, and nothing else.',
  'Keep everything unrelated to the request identical: structure, names, styles, behavior, text.',
  'Return the COMPLETE updated HTML file — markup, <style> and <script> — as one file.',
  'Do not write explanations, notes, or markdown fences. Output only the file.',
].join(' ')

/** סימן שהספק השמור מזהה, כדי להבדיל בקשת שינוי מבקשת בנייה. */
export const REVISE_MARKER = 'The current file:'

export function buildRevisePrompt(code: string, instruction: string): string {
  return [`The user's request: ${instruction.trim()}`, REVISE_MARKER, code].join('\n\n')
}

export async function reviseProject(
  provider: LlmProvider,
  code: string,
  instruction: string,
): Promise<string> {
  const trimmed = instruction.trim()
  if (!trimmed) throw new BuildError('emptyPrompt')

  const { text } = await provider.complete({
    system: REVISE_SYSTEM_PROMPT,
    prompt: buildRevisePrompt(code, trimmed),
  })

  const html = stripCodeFence(text)
  if (!looksLikeHtml(html)) throw new BuildError('notHtml')
  return html
}

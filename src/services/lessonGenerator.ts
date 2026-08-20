import type { LlmProvider } from '../llm/types'
import type { Lesson } from '../state/types'

/**
 * lessonGenerator — פרק קוד אחד נכנס, הסבר ושאלה אמריקאית יוצאים.
 *
 * נקרא רק כשהמשתמש פותח פרק, ולא מראש — ראה ADR-005.
 * מבנה השאלה נגזר ישירות מסעיף 10 ב-PRD, שהוא קו ההגנה על סיכון מספר 2.
 */

/** מספר האפשרויות בשאלה. קבוע, ולא נתון לשיקול דעת המודל. */
export const OPTION_COUNT = 4

export const LESSON_SYSTEM_PROMPT = [
  'You write one short lesson about one piece of code, for a computer science student.',
  'The explanation is 2 to 4 sentences about what this code does and why it exists in the app.',
  'The question is one multiple choice question about THIS code specifically,',
  `with exactly ${OPTION_COUNT} options and one correct answer.`,
  'The wrong options must be wrong but believable: a plausible misreading of this code.',
  'Never write an option that is a joke, or obviously wrong to someone who did not read the code.',
  'It must be impossible to answer correctly without reading the code.',
].join(' ')

/**
 * הצורה נאכפת על ידי הספק, לא מבוקשת בנימוס בפרומפט.
 * אומת ב-SPIKE-004: שלוש מתוך שלוש תקינות עם הסכמה, אפס מתוך שלוש בלעדיה.
 */
export const LESSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    explanation: { type: 'string' },
    question: { type: 'string' },
    options: { type: 'array', items: { type: 'string' }, minItems: OPTION_COUNT, maxItems: OPTION_COUNT },
    correctIndex: { type: 'integer', minimum: 0, maximum: OPTION_COUNT - 1 },
  },
  required: ['explanation', 'question', 'options', 'correctIndex'],
}

/** נזרקת כשהמודל החזיר שיעור שאינו עומד במבנה המחייב. */
export class LessonError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LessonError'
  }
}

export interface LessonRequest {
  /** כותרת הפרק, כדי שהמודל יידע על מה מדובר. */
  title: string
  code: string
  /** שפת ההסבר והשאלה. */
  language: LessonLanguage
}

export type LessonLanguage = 'he' | 'en'

export async function generateLesson(
  provider: LlmProvider,
  request: LessonRequest,
): Promise<Lesson> {
  const { text } = await provider.complete({
    system: LESSON_SYSTEM_PROMPT,
    prompt: buildPrompt(request),
    schema: LESSON_SCHEMA,
  })

  return parseLesson(text)
}

export function buildPrompt({ title, code, language }: LessonRequest): string {
  const inLanguage =
    language === 'he'
      ? 'Write the explanation, the question and all options in Hebrew. Keep code identifiers in English.'
      : 'Write the explanation, the question and all options in English.'

  return [
    `This piece of code is titled: ${title}`,
    inLanguage,
    'The code:',
    code,
  ].join('\n\n')
}

/**
 * הפלט מגיע ממודל, ולכן הוא נבדק ולא מונח.
 * כל כישלון כאן עדיף על שאלה שבורה שמוצגת למשתמש.
 */
export function parseLesson(text: string): Lesson {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new LessonError('המודל לא החזיר JSON תקין')
  }

  if (!isRecord(parsed)) throw new LessonError('המודל לא החזיר אובייקט')

  const explanation = asText(parsed.explanation)
  if (!explanation) throw new LessonError('חסר הסבר')

  const question = asText(parsed.question)
  if (!question) throw new LessonError('חסרה שאלה')

  if (!Array.isArray(parsed.options)) throw new LessonError('חסרות אפשרויות')
  const options = parsed.options.map(asText)
  if (options.length !== OPTION_COUNT || options.some((option) => !option)) {
    throw new LessonError(`נדרשות בדיוק ${OPTION_COUNT} אפשרויות, וכולן לא ריקות`)
  }
  if (new Set(options).size !== options.length) {
    throw new LessonError('שתי אפשרויות זהות')
  }

  const correctIndex = parsed.correctIndex
  if (typeof correctIndex !== 'number' || !Number.isInteger(correctIndex)) {
    throw new LessonError('חסר מספר האפשרות הנכונה')
  }
  if (correctIndex < 0 || correctIndex >= OPTION_COUNT) {
    throw new LessonError('מספר האפשרות הנכונה מחוץ לתחום')
  }

  return {
    explanation,
    question: { text: question, options: options as string[], correctIndex },
  }
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

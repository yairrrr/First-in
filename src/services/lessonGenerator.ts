import type { LlmProvider } from '../llm/types'
import type {
  AssembleExercise,
  ChoiceExercise,
  Lesson,
  LessonDifficulty,
} from '../state/types'

/**
 * lessonGenerator — פרק קוד אחד נכנס, שיעור יוצא: פסקת עיקרון ותרגיל.
 *
 * נקרא רק כשהמשתמש פותח פרק, ולא מראש — ראה ADR-005.
 * מבנה השאלה האמריקאית נגזר מסעיף 10 ב-PRD. פורמט ההרכבה נקבע ב-ADR-010.
 * הצורה נאכפת בסכמה דרך הספק — ראה SPIKE-004.
 */

export const OPTION_COUNT = 4

/** גבולות תרגיל ההרכבה: מעט משבצות, שורה קצרה. בלי להעמיס — הנחיית המוצר. */
export const MIN_TOKENS = 3
export const MAX_TOKENS = 6
export const MAX_ASSEMBLED_LENGTH = 90

export type ExerciseKind = 'choice' | 'assemble'

/**
 * סוג התרגיל נקבע בקוד, לא על ידי המודל — צפוי ובדיק:
 * פתיחה בהרכבה קלילה, עומק בשאלות חשיבה, ובאמצע לסירוגין.
 */
export function exerciseKindFor(difficulty: LessonDifficulty, chapterIndex: number): ExerciseKind {
  if (difficulty === 'intro') return 'assemble'
  if (difficulty === 'deep') return 'choice'
  return chapterIndex % 2 === 0 ? 'choice' : 'assemble'
}

/** נגזר מחלק הפרקים שהושלמו. יחס ולא מספר קבוע — לפרויקטים יש 5 עד 12 פרקים. */
export function difficultyForProgress(completed: number, total: number): LessonDifficulty {
  if (total <= 0) return 'intro'
  const ratio = completed / total
  if (ratio < 0.25) return 'intro'
  if (ratio < 0.65) return 'core'
  return 'deep'
}

export const LESSON_SYSTEM_PROMPT = [
  'You create one short interactive lesson about one piece of code the learner just built.',
  'The "concept" field is a very short paragraph, 2 to 3 sentences, teaching the single most',
  'important principle this code demonstrates. It must stand on its own before the exercise.',
  'Everything must be about THIS code specifically, never general trivia.',
].join(' ')

/**
 * הנחיות הקושי. הנחיית המוצר: ברמות הנמוכות כמעט בלי מונחים מקצועיים
 * וכמה שפחות קוד. גם שאלה קלה אסור שתהיה ניתנת למענה בלי לקרוא את הקוד.
 */
const DIFFICULTY_PROMPTS: Record<LessonDifficulty, string> = {
  intro: [
    'The learner is a complete beginner with zero background: no technical jargon at all.',
    'Use only words any person knows. If you must name a code thing, describe it in everyday words',
    '(for example "the line that shows the number on the screen").',
    'Teach one tiny fundamental principle. Quote at most one short line of code inside the concept.',
  ].join(' '),
  core: [
    'The learner is a computer science student.',
    'Focus on how this code works: the flow, the state it changes, or why it is written this way.',
  ].join(' '),
  deep: [
    'The learner answered earlier chapters correctly and wants a challenge.',
    'Focus on consequences: what would break or behave differently if part of this code changed,',
    'or which edge case this code handles or misses.',
  ].join(' '),
}

const KIND_PROMPTS: Record<ExerciseKind, string> = {
  choice: [
    `Then write one multiple choice question about this code, with exactly ${OPTION_COUNT} options and one correct answer.`,
    'The wrong options must be wrong but believable: a plausible misreading of this code.',
    'Never write an option that is a joke, or obviously wrong to someone who did not read the code.',
    'It must be impossible to answer correctly without reading the code.',
  ].join(' '),
  assemble: [
    'Then pick ONE short, meaningful line from this code and split it into',
    `${MIN_TOKENS} to ${MAX_TOKENS} ordered pieces ("tokens") that concatenate back into that line.`,
    'Split at natural points. Each token is a few characters, not a whole statement.',
    'The "instruction" says in plain words what the assembled line does, without revealing the order.',
    'The learner will tap the shuffled tokens in order to rebuild the line.',
  ].join(' '),
}

export const CHOICE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    concept: { type: 'string' },
    question: { type: 'string' },
    options: { type: 'array', items: { type: 'string' }, minItems: OPTION_COUNT, maxItems: OPTION_COUNT },
    correctIndex: { type: 'integer', minimum: 0, maximum: OPTION_COUNT - 1 },
  },
  required: ['concept', 'question', 'options', 'correctIndex'],
}

export const ASSEMBLE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    concept: { type: 'string' },
    instruction: { type: 'string' },
    tokens: { type: 'array', items: { type: 'string' }, minItems: MIN_TOKENS, maxItems: MAX_TOKENS },
  },
  required: ['concept', 'instruction', 'tokens'],
}

/** נזרקת כשהמודל החזיר שיעור שאינו עומד במבנה המחייב. */
export class LessonError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LessonError'
  }
}

export interface LessonRequest {
  title: string
  code: string
  language: 'he' | 'en'
  difficulty: LessonDifficulty
  kind: ExerciseKind
}

export async function generateLesson(
  provider: LlmProvider,
  request: LessonRequest,
): Promise<Lesson> {
  const { text } = await provider.complete({
    system: LESSON_SYSTEM_PROMPT,
    prompt: buildPrompt(request),
    schema: request.kind === 'choice' ? CHOICE_SCHEMA : ASSEMBLE_SCHEMA,
  })

  return parseLesson(request.kind, request.difficulty, text)
}

export function buildPrompt({ title, code, language, difficulty, kind }: LessonRequest): string {
  const inLanguage =
    language === 'he'
      ? 'Write everything in Hebrew. Keep code identifiers and code tokens in English.'
      : 'Write everything in English.'

  return [
    `This piece of code is titled: ${title}`,
    DIFFICULTY_PROMPTS[difficulty],
    KIND_PROMPTS[kind],
    inLanguage,
    'The code:',
    code,
  ].join('\n\n')
}

/** הפלט מגיע ממודל, ולכן הוא נבדק ולא מונח. כישלון כאן עדיף על תרגיל שבור במסך. */
export function parseLesson(kind: ExerciseKind, difficulty: LessonDifficulty, text: string): Lesson {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new LessonError('המודל לא החזיר JSON תקין')
  }
  if (!isRecord(parsed)) throw new LessonError('המודל לא החזיר אובייקט')

  const concept = asText(parsed.concept)
  if (!concept) throw new LessonError('חסרה פסקת העיקרון')

  const exercise = kind === 'choice' ? parseChoice(parsed) : parseAssemble(parsed)
  return { difficulty, concept, exercise }
}

function parseChoice(parsed: Record<string, unknown>): ChoiceExercise {
  const question = asText(parsed.question)
  if (!question) throw new LessonError('חסרה שאלה')

  if (!Array.isArray(parsed.options)) throw new LessonError('חסרות אפשרויות')
  const options = parsed.options.map(asText)
  if (options.length !== OPTION_COUNT || options.some((option) => !option)) {
    throw new LessonError(`נדרשות בדיוק ${OPTION_COUNT} אפשרויות, וכולן לא ריקות`)
  }
  if (new Set(options).size !== options.length) throw new LessonError('שתי אפשרויות זהות')

  const correctIndex = parsed.correctIndex
  if (typeof correctIndex !== 'number' || !Number.isInteger(correctIndex)) {
    throw new LessonError('חסר מספר האפשרות הנכונה')
  }
  if (correctIndex < 0 || correctIndex >= OPTION_COUNT) {
    throw new LessonError('מספר האפשרות הנכונה מחוץ לתחום')
  }

  return { kind: 'choice', question, options, correctIndex }
}

function parseAssemble(parsed: Record<string, unknown>): AssembleExercise {
  const instruction = asText(parsed.instruction)
  if (!instruction) throw new LessonError('חסרה הוראת ההרכבה')

  if (!Array.isArray(parsed.tokens)) throw new LessonError('חסרות משבצות')
  const tokens = parsed.tokens.map((token) => (typeof token === 'string' ? token : ''))
  const trimmed = tokens.map((token) => token.trim())
  if (
    trimmed.length < MIN_TOKENS ||
    trimmed.length > MAX_TOKENS ||
    trimmed.some((token) => !token)
  ) {
    throw new LessonError(`נדרשות ${MIN_TOKENS} עד ${MAX_TOKENS} משבצות, וכולן לא ריקות`)
  }
  if (trimmed.join(' ').length > MAX_ASSEMBLED_LENGTH) {
    throw new LessonError('השורה המורכבת ארוכה מדי — התרגיל אמור להיות קליל')
  }

  return { kind: 'assemble', instruction, tokens: trimmed }
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

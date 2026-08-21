import type { AppState, Chapter, Exercise, Lesson, Project, ProjectStatus } from './types'
import { MAX_TOKENS, MIN_TOKENS, OPTION_COUNT } from '../services/lessonGenerator'

/**
 * שמירת מצב ב-localStorage. אין שרת ואין בסיס נתונים — ראה ARCHITECTURE.
 *
 * המפתח נושא מספר גרסה. אם שפת הנתונים תשתנה, מצב ישן לא ינסה להיטען
 * לתוך קוד שכבר לא מבין אותו.
 */
export const STORAGE_KEY = 'first-in/state/v1'

/** ממשק מצומצם של localStorage, כדי שאפשר יהיה להזריק אחסון מזויף בבדיקות. */
export interface StateStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const EMPTY: AppState = { projects: [] }

export function loadState(storage: StateStorage | undefined): AppState {
  if (!storage) return EMPTY

  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    // דפדפן שחוסם אחסון. לא סיבה להפיל את האפליקציה.
    return EMPTY
  }
  if (!raw) return EMPTY

  try {
    const parsed: unknown = JSON.parse(raw)
    return { projects: toProjects(parsed) }
  } catch {
    return EMPTY
  }
}

export function saveState(storage: StateStorage | undefined, state: AppState): void {
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // מכסת האחסון מלאה. הפרויקט ימשיך לעבוד, פשוט לא ישרוד רענון.
  }
}

/**
 * המצב השמור בא מהדיסק ולא מהקוד שלנו, ולכן הוא נבדק ולא מונח.
 * פרויקט פגום נזרק, ולא מפיל את כל הרשימה.
 */
function toProjects(parsed: unknown): Project[] {
  if (!isRecord(parsed) || !Array.isArray(parsed.projects)) return []

  const projects: Project[] = []
  for (const candidate of parsed.projects) {
    const project = toProject(candidate)
    if (project) projects.push(project)
  }
  return projects
}

function toProject(candidate: unknown): Project | null {
  if (!isRecord(candidate)) return null
  if (typeof candidate.id !== 'string' || typeof candidate.prompt !== 'string') return null

  return {
    id: candidate.id,
    prompt: candidate.prompt,
    // פרויקטים ותיקים נשמרו לפני שהשדה היה קיים. עבורם ברירת המחדל היא המודל.
    provider: candidate.provider === 'fixture' ? 'fixture' : 'ollama',
    // בנייה שנקטעה באמצע ברענון דף לא תסתיים לעולם, ולכן היא נטענת ככישלון.
    status: toStatus(candidate.status),
    code: typeof candidate.code === 'string' ? candidate.code : '',
    chapters: Array.isArray(candidate.chapters) ? candidate.chapters.flatMap(toChapter) : [],
    points: typeof candidate.points === 'number' ? candidate.points : 0,
    error: candidate.status === 'building' ? 'הבנייה נקטעה כשהדף נטען מחדש.' : toError(candidate.error),
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : '',
  }
}

function toStatus(value: unknown): ProjectStatus {
  if (value === 'ready') return 'ready'
  return 'failed'
}

function toError(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function toChapter(candidate: unknown): Chapter[] {
  if (!isRecord(candidate)) return []
  if (typeof candidate.id !== 'string' || typeof candidate.code !== 'string') return []

  return [
    {
      id: candidate.id,
      title: typeof candidate.title === 'string' ? candidate.title : candidate.id,
      code: candidate.code,
      completed: candidate.completed === true,
      lesson: toLesson(candidate.lesson),
      attempts: typeof candidate.attempts === 'number' ? candidate.attempts : 0,
    },
  ]
}

/**
 * שיעור פגום או בפורמט ישן נזרק ונוצר מחדש בכניסה הבאה לפרק.
 * עדיף על תרגיל שבור במסך.
 */
function toLesson(candidate: unknown): Lesson | null {
  if (!isRecord(candidate)) return null
  if (typeof candidate.concept !== 'string' || !candidate.concept) return null
  const difficulty = candidate.difficulty
  if (difficulty !== 'intro' && difficulty !== 'core' && difficulty !== 'deep') return null
  const exercise = toExercise(candidate.exercise)
  if (!exercise) return null

  return { difficulty, concept: candidate.concept, exercise }
}

function toExercise(candidate: unknown): Exercise | null {
  if (!isRecord(candidate)) return null

  if (candidate.kind === 'choice') {
    if (typeof candidate.question !== 'string' || !candidate.question) return null
    if (!Array.isArray(candidate.options) || candidate.options.length !== OPTION_COUNT) return null
    if (!candidate.options.every((option) => typeof option === 'string')) return null
    const correctIndex = candidate.correctIndex
    if (typeof correctIndex !== 'number' || correctIndex < 0 || correctIndex >= OPTION_COUNT) {
      return null
    }
    return { kind: 'choice', question: candidate.question, options: candidate.options, correctIndex }
  }

  if (candidate.kind === 'assemble') {
    if (typeof candidate.instruction !== 'string' || !candidate.instruction) return null
    if (!Array.isArray(candidate.tokens)) return null
    if (candidate.tokens.length < MIN_TOKENS || candidate.tokens.length > MAX_TOKENS) return null
    if (!candidate.tokens.every((token) => typeof token === 'string' && token)) return null
    return { kind: 'assemble', instruction: candidate.instruction, tokens: candidate.tokens }
  }

  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

import type { AppState, Chapter, Project, ProjectStatus } from './types'

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
    },
  ]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

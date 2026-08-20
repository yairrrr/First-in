// שפת הנתונים של שכבת ה-state.
// כל מה שהאפליקציה יודעת מתואר כאן, ושום דבר אחר לא מחזיק מידע.

export type ProjectStatus = 'building' | 'ready' | 'failed'

/** פרק למידה אחד: פיסת קוד מהפרויקט של המשתמש, ומה שהוא עשה איתה. */
export interface Chapter {
  id: string
  title: string
  /** החלק מתוך הקוד שנבנה שהפרק הזה מלמד. */
  code: string
  completed: boolean
}

export interface Project {
  id: string
  /** מה שהמשתמש ביקש, כלשונו. */
  prompt: string
  status: ProjectStatus
  /** קוד ה-HTML שנבנה. ריק כל עוד הבנייה לא הסתיימה. */
  code: string
  chapters: Chapter[]
  points: number
  /** הודעת השגיאה שהוצגה למשתמש כשהבנייה נכשלה. */
  error: string | null
  /** ISO 8601. */
  createdAt: string
}

export interface AppState {
  projects: Project[]
}

export type Action =
  | { type: 'PROJECT_CREATED'; project: Project }
  | { type: 'BUILD_SUCCEEDED'; projectId: string; code: string; chapters: Chapter[] }
  | { type: 'BUILD_FAILED'; projectId: string; message: string }
  | { type: 'CHAPTER_ANSWERED'; projectId: string; chapterId: string; correct: boolean }

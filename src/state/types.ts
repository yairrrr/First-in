// שפת הנתונים של שכבת ה-state.
// כל מה שהאפליקציה יודעת מתואר כאן, ושום דבר אחר לא מחזיק מידע.

export type ProjectStatus = 'building' | 'ready' | 'failed'

/** שאלה אמריקאית אחת. המבנה מחייב, ראה סעיף 10 ב-PRD. */
export interface Question {
  text: string
  options: string[]
  /** מיקום התשובה הנכונה במערך, החל מאפס. */
  correctIndex: number
}

/** ההסבר והשאלה של פרק. נוצרים על ידי המודל כשהמשתמש פותח את הפרק. */
export interface Lesson {
  explanation: string
  question: Question
}

/** פרק למידה אחד: פיסת קוד מהפרויקט של המשתמש, ומה שהוא עשה איתה. */
export interface Chapter {
  id: string
  title: string
  /** החלק מתוך הקוד שנבנה שהפרק הזה מלמד. */
  code: string
  completed: boolean
  /** נוצר לפי דרישה, ונשמר כדי שלא ייווצר שוב בכל כניסה לפרק. */
  lesson: Lesson | null
  /** כמה פעמים נענתה השאלה. משמש למדד "נכון מהניסיון הראשון" שבסעיף 9 ב-PRD. */
  attempts: number
}

export interface Project {
  id: string
  /** מה שהמשתמש ביקש, כלשונו. */
  prompt: string
  /** הספק שבנה את הפרויקט. השיעורים חייבים להגיע מאותו מקום. */
  provider: 'ollama' | 'fixture'
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
  | { type: 'LESSON_LOADED'; projectId: string; chapterId: string; lesson: Lesson }
  | { type: 'CHAPTER_ANSWERED'; projectId: string; chapterId: string; correct: boolean }

// שפת הנתונים של שכבת ה-state.
// כל מה שהאפליקציה יודעת מתואר כאן, ושום דבר אחר לא מחזיק מידע.

export type ProjectStatus = 'building' | 'ready' | 'failed'

/** שלוש מדרגות קושי, נגזרות מההתקדמות — ראה ADR-009. */
export type LessonDifficulty = 'intro' | 'core' | 'deep'

/** שאלה אמריקאית. המבנה מחייב, ראה סעיף 10 ב-PRD. */
export interface ChoiceExercise {
  kind: 'choice'
  question: string
  options: string[]
  /** מיקום התשובה הנכונה במערך, החל מאפס. */
  correctIndex: number
}

/**
 * תרגיל הרכבה בסגנון Mimo: משבצות טקסט שנלחצות לפי הסדר
 * ומרכיבות שורת קוד אמיתית מהפרויקט. ראה ADR-010.
 */
export interface AssembleExercise {
  kind: 'assemble'
  /** מה השורה שמרכיבים עושה, במילים. */
  instruction: string
  /** המשבצות בסדר הנכון. המסך מערבב אותן לפני ההצגה. */
  tokens: string[]
}

export type Exercise = ChoiceExercise | AssembleExercise

/** שיעור של פרק: פסקת עיקרון קצרצרה, ואז תרגיל. נוצר כשהמשתמש פותח את הפרק. */
export interface Lesson {
  /** הרמה שבה נוצר השיעור. קובעת גם כמה קוד מוצג במסך. */
  difficulty: LessonDifficulty
  /** ההסבר הקצר על עיקרון הקוד — המסך הראשון של השיעור. */
  concept: string
  exercise: Exercise
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
  /** ניסיון מצטבר של המשתמש, חוצה פרויקטים. קובע את הדרגה — ראה rank.ts. */
  xp: number
}

export type Action =
  | { type: 'PROJECT_CREATED'; project: Project }
  | { type: 'BUILD_SUCCEEDED'; projectId: string; code: string; chapters: Chapter[] }
  | { type: 'BUILD_FAILED'; projectId: string; message: string }
  | { type: 'PROJECT_DELETED'; projectId: string }
  | { type: 'BUILD_STARTED'; projectId: string }
  | { type: 'LESSON_LOADED'; projectId: string; chapterId: string; lesson: Lesson }
  | { type: 'CHAPTER_ANSWERED'; projectId: string; chapterId: string; correct: boolean }

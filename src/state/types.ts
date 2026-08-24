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
  /**
   * שורה עד שלוש שורות אמיתיות מהקוד שמדגימות את העיקרון.
   * מי שברמה נמוכה לא יודע תחביר — חייבים להראות, לא רק לספר.
   */
  example: string
  exercise: Exercise
}

/**
 * כותרת פרק כמבנה ולא כמחרוזת, כדי שתוצג בשפת הממשק הנוכחית
 * ולא בשפה שבה הפרויקט נבנה.
 */
export type ChapterTitle =
  | { kind: 'markup' }
  | { kind: 'css'; selector: string; more: number }
  | { kind: 'function'; name: string }
  | { kind: 'wiring'; n: number }

/** פרק למידה אחד: פיסת קוד מהפרויקט של המשתמש, ומה שהוא עשה איתה. */
export interface Chapter {
  id: string
  title: ChapterTitle
  /** יחידות קטנות שנבלעו בפרק כי היו קצרות מדי. הכותרת מצהירה עליהן. */
  extraUnits: number
  /** החלק מתוך הקוד שנבנה שהפרק הזה מלמד. */
  code: string
  completed: boolean
  /** נוצר לפי דרישה, ונשמר כדי שלא ייווצר שוב בכל כניסה לפרק. */
  lesson: Lesson | null
  /** כמה פעמים נענתה השאלה. משמש למדד "נכון מהניסיון הראשון" שבסעיף 9 ב-PRD. */
  attempts: number
}

export type RevisionStatus = 'working' | 'applied' | 'failed'

/**
 * הערה אחת בשיחה על הפרויקט: "תגדיל את הכפתורים", "תוסיף טיימר".
 * המודל מקבל את הקוד הנוכחי ומחזיר גרסה מעודכנת.
 */
export interface Revision {
  id: string
  instruction: string
  status: RevisionStatus
  /** הודעת שגיאה לתצוגה, כשנכשל. */
  message: string | null
  createdAt: string
}

/** כמה גרסאות קודמות שומרים לחזרה אחורה. מוגבל בגלל localStorage. */
export const MAX_PREVIOUS_VERSIONS = 5

/** תמונת מצב של גרסה: הקוד והפרקים יחד, כדי שחזרה אחורה תשחזר גם התקדמות. */
export interface ProjectVersion {
  code: string
  chapters: Chapter[]
}

export interface Project {
  id: string
  /** מה שהמשתמש ביקש, כלשונו. */
  prompt: string
  /** השיחה על הפרויקט אחרי הבנייה, מהישן לחדש. */
  revisions: Revision[]
  /** גרסאות קודמות, מהישנה לחדשה, לחזרה אחורה. */
  previousVersions: ProjectVersion[]
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

export type Language = 'he' | 'en'

export interface AppState {
  projects: Project[]
  /** ניסיון מצטבר של המשתמש, חוצה פרויקטים. קובע את הדרגה — ראה rank.ts. */
  xp: number
  /** שפת הממשק והשיעורים. */
  language: Language
}

export type Action =
  | { type: 'PROJECT_CREATED'; project: Project }
  | { type: 'BUILD_SUCCEEDED'; projectId: string; code: string; chapters: Chapter[] }
  | { type: 'BUILD_FAILED'; projectId: string; message: string }
  | { type: 'PROJECT_DELETED'; projectId: string }
  | { type: 'BUILD_STARTED'; projectId: string }
  | { type: 'LANGUAGE_CHANGED'; language: Language }
  | { type: 'REVISION_STARTED'; projectId: string; revision: Revision }
  | { type: 'REVISION_SUCCEEDED'; projectId: string; revisionId: string; code: string; chapters: Chapter[] }
  | { type: 'REVISION_FAILED'; projectId: string; revisionId: string; message: string }
  | { type: 'REVISION_REVERTED'; projectId: string }
  | { type: 'LESSON_LOADED'; projectId: string; chapterId: string; lesson: Lesson }
  | { type: 'CHAPTER_ANSWERED'; projectId: string; chapterId: string; correct: boolean }

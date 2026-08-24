import type { Action, AppState, Project } from './types'
import { xpForAnswer } from './rank'

/** נקודות על פרק שנענה נכון בניסיון הראשון. */
export const POINTS_PER_CHAPTER = 10

export const initialState: AppState = { projects: [], xp: 0 }

/**
 * הפונקציה היחידה שמשנה מצב באפליקציה.
 * מקבלת מצב ופעולה, ומחזירה מצב חדש. אינה קוראת לשרת ואינה משנה דבר במקום.
 */
export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'PROJECT_CREATED':
      return { ...state, projects: [action.project, ...state.projects] }

    case 'PROJECT_DELETED':
      return { ...state, projects: state.projects.filter((p) => p.id !== action.projectId) }

    case 'BUILD_STARTED':
      // בנייה חוזרת אחרי כישלון: הפרויקט חוזר לנקודת ההתחלה, אותו פרומפט.
      return updateProject(state, action.projectId, (project) => ({
        ...project,
        status: 'building',
        code: '',
        chapters: [],
        points: 0,
        error: null,
      }))

    case 'BUILD_SUCCEEDED':
      return updateProject(state, action.projectId, (project) => ({
        ...project,
        status: 'ready',
        code: action.code,
        chapters: action.chapters,
        error: null,
      }))

    case 'BUILD_FAILED':
      return updateProject(state, action.projectId, (project) => ({
        ...project,
        status: 'failed',
        error: action.message,
      }))

    case 'LESSON_LOADED':
      return updateProject(state, action.projectId, (project) => ({
        ...project,
        chapters: project.chapters.map((c) =>
          c.id === action.chapterId ? { ...c, lesson: action.lesson } : c,
        ),
      }))

    case 'CHAPTER_ANSWERED': {
      const withProject = updateProject(state, action.projectId, (project) => {
        const chapter = project.chapters.find((c) => c.id === action.chapterId)
        if (!chapter) return project

        // פרק שהושלם סגור. תשובה חוזרת בו לא נספרת — אחרת ביקור חוזר היה
        // הורס רטרואקטיבית את מדד "נכון מהניסיון הראשון" של סעיף 9.
        if (chapter.completed) return project

        // כל ניסיון נספר, גם שגוי. המדד בסעיף 9 ב-PRD הוא "נכון מהניסיון הראשון".
        const chapters = project.chapters.map((c) =>
          c.id === action.chapterId
            ? { ...c, attempts: c.attempts + 1, completed: c.completed || action.correct }
            : c,
        )

        // נקודות רק על המעבר הראשון מהלא-הושלם להושלם.
        const earned = action.correct && !chapter.completed ? POINTS_PER_CHAPTER : 0

        return { ...project, points: project.points + earned, chapters }
      })

      // תשובה נכונה שסגרה פרק מזכה גם ב-XP גלובלי, לפי רמת השאלה שנענתה.
      // ה-XP הוא מה שמעלה את דרגת המשתמש, חוצה פרויקטים — ראה rank.ts.
      if (!action.correct || withProject === state) return withProject
      const answered = withProject.projects
        .find((p) => p.id === action.projectId)
        ?.chapters.find((c) => c.id === action.chapterId)
      if (!answered?.completed) return withProject
      const difficulty = answered.lesson?.difficulty ?? 'intro'
      return { ...withProject, xp: state.xp + xpForAnswer(difficulty, answered.attempts) }
    }
  }
}

/** אחוז הפרקים שהושלמו. פרויקט ללא פרקים הוא 0. */
export function progressPercent(project: Project): number {
  if (project.chapters.length === 0) return 0
  const done = project.chapters.filter((c) => c.completed).length
  return Math.round((done / project.chapters.length) * 100)
}

/**
 * המדד הראשי של סעיף 9 ב-PRD: כמה מהפרקים שהושלמו נענו נכון מהניסיון הראשון.
 * פרק שהושלם עם ניסיון אחד בדיוק — התשובה הראשונה בו הייתה נכונה.
 */
export function firstTryStats(project: Project): { firstTry: number; completed: number } {
  const completed = project.chapters.filter((c) => c.completed)
  return {
    firstTry: completed.filter((c) => c.attempts === 1).length,
    completed: completed.length,
  }
}

function updateProject(
  state: AppState,
  projectId: string,
  change: (project: Project) => Project,
): AppState {
  const projects = state.projects.map((p) => (p.id === projectId ? change(p) : p))

  // אם שום פרויקט לא הוחלף בפועל, מוחזר המצב המקורי עצמו.
  // React משווה זהות, ואובייקט חדש עם תוכן זהה היה גורר רינדור מיותר.
  const untouched = projects.every((project, index) => project === state.projects[index])
  return untouched ? state : { ...state, projects }
}

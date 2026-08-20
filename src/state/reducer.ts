import type { Action, AppState, Project } from './types'

/** נקודות על פרק שנענה נכון בניסיון הראשון. */
export const POINTS_PER_CHAPTER = 10

export const initialState: AppState = { projects: [] }

/**
 * הפונקציה היחידה שמשנה מצב באפליקציה.
 * מקבלת מצב ופעולה, ומחזירה מצב חדש. אינה קוראת לשרת ואינה משנה דבר במקום.
 */
export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'PROJECT_CREATED':
      return { ...state, projects: [action.project, ...state.projects] }

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

    case 'CHAPTER_ANSWERED':
      return updateProject(state, action.projectId, (project) => {
        const chapter = project.chapters.find((c) => c.id === action.chapterId)
        if (!chapter) return project

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
  return {
    ...state,
    projects: state.projects.map((p) => (p.id === projectId ? change(p) : p)),
  }
}

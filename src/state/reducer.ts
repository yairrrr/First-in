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
      }))

    case 'BUILD_FAILED':
      return updateProject(state, action.projectId, (project) => ({
        ...project,
        status: 'failed',
      }))

    case 'CHAPTER_ANSWERED': {
      if (!action.correct) return state
      return updateProject(state, action.projectId, (project) => {
        const chapter = project.chapters.find((c) => c.id === action.chapterId)
        // פרק שכבר הושלם אינו מזכה בנקודות פעם שנייה.
        if (!chapter || chapter.completed) return project
        return {
          ...project,
          points: project.points + POINTS_PER_CHAPTER,
          chapters: project.chapters.map((c) =>
            c.id === action.chapterId ? { ...c, completed: true } : c,
          ),
        }
      })
    }
  }
}

/** אחוז הפרקים שהושלמו. פרויקט ללא פרקים הוא 0. */
export function progressPercent(project: Project): number {
  if (project.chapters.length === 0) return 0
  const done = project.chapters.filter((c) => c.completed).length
  return Math.round((done / project.chapters.length) * 100)
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

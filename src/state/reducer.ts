import { MAX_PREVIOUS_VERSIONS, type Action, type AppState, type Chapter, type Project } from './types'
import { xpForAnswer } from './rank'

/** נקודות על פרק שנענה נכון בניסיון הראשון. */
export const POINTS_PER_CHAPTER = 10

export const initialState: AppState = { projects: [], xp: 0, language: 'he' }

/**
 * הפונקציה היחידה שמשנה מצב באפליקציה.
 * מקבלת מצב ופעולה, ומחזירה מצב חדש. אינה קוראת לשרת ואינה משנה דבר במקום.
 */
export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'PROJECT_CREATED':
      return { ...state, projects: [action.project, ...state.projects] }

    case 'LANGUAGE_CHANGED':
      return state.language === action.language ? state : { ...state, language: action.language }

    case 'PROJECT_DELETED':
      return { ...state, projects: state.projects.filter((p) => p.id !== action.projectId) }

    case 'REVISION_STARTED':
      return updateProject(state, action.projectId, (project) => ({
        ...project,
        revisions: [...project.revisions, action.revision],
      }))

    case 'REVISION_SUCCEEDED':
      return updateProject(state, action.projectId, (project) => ({
        ...project,
        code: action.code,
        // הקוד השתנה, אבל מה שכבר נלמד לא נמחק: פרקים שנשארו זהים שומרים התקדמות.
        chapters: mergeChapters(project.chapters, action.chapters),
        previousVersions: [
          ...project.previousVersions,
          { code: project.code, chapters: project.chapters },
        ].slice(-MAX_PREVIOUS_VERSIONS),
        revisions: project.revisions.map((r) =>
          r.id === action.revisionId ? { ...r, status: 'applied' as const } : r,
        ),
      }))

    case 'REVISION_FAILED':
      return updateProject(state, action.projectId, (project) => ({
        ...project,
        revisions: project.revisions.map((r) =>
          r.id === action.revisionId
            ? { ...r, status: 'failed' as const, message: action.message }
            : r,
        ),
      }))

    case 'REVISION_REVERTED':
      return updateProject(state, action.projectId, (project) => {
        const previous = project.previousVersions[project.previousVersions.length - 1]
        if (previous === undefined) return project
        return {
          ...project,
          code: previous.code,
          // הפרקים חוזרים כפי שהיו, אבל מה שהושלם בינתיים על פרק זהה לא נמחק.
          chapters: restoreChapters(project.chapters, previous.chapters),
          previousVersions: project.previousVersions.slice(0, -1),
        }
      })

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

/**
 * הקוד השתנה והפרקים חולקו מחדש. פרק חדש שיש לו "תאום" בישן — אותה כותרת
 * (אותה פונקציה, אותו בורר, אותו אזור) — יורש את ההתקדמות. השיעור נשמר רק
 * אם הקוד של הפרק זהה; אם השתנה, ייווצר שיעור חדש על הקוד החדש.
 */
export function mergeChapters(previous: Chapter[], next: Chapter[]): Chapter[] {
  const remaining = [...previous]
  return next.map((chapter) => {
    const index = remaining.findIndex((old) => sameTitle(old, chapter))
    if (index === -1) return chapter
    const [old] = remaining.splice(index, 1)
    return {
      ...chapter,
      completed: old.completed,
      attempts: old.attempts,
      lesson: old.code === chapter.code ? old.lesson : null,
    }
  })
}

/**
 * חזרה לגרסה קודמת: הפרקים של התמונה חוזרים במלואם, כולל שיעורים.
 * פרק שהושלם אחרי השינוי ויש לו תאום בתמונה — ההשלמה נשמרת גם אחרי החזרה.
 */
export function restoreChapters(current: Chapter[], snapshot: Chapter[]): Chapter[] {
  const remaining = [...current]
  return snapshot.map((chapter) => {
    const index = remaining.findIndex((c) => sameTitle(c, chapter))
    if (index === -1) return chapter
    const [twin] = remaining.splice(index, 1)
    if (!twin.completed || chapter.completed) return chapter
    return { ...chapter, completed: true, attempts: twin.attempts }
  })
}

function sameTitle(a: Chapter, b: Chapter): boolean {
  return JSON.stringify(a.title) === JSON.stringify(b.title)
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

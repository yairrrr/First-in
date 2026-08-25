import { MAX_PREVIOUS_VERSIONS, type Action, type AppState, type Chapter, type Project } from './types'
import { xpForAnswer } from './rank'

/** Project points awarded when a chapter is completed. */
export const POINTS_PER_CHAPTER = 10

export const initialState: AppState = { projects: [], xp: 0, language: 'he' }

/**
 * The only function that changes application state. Pure: no I/O, no mutation.
 */
export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'STATE_HYDRATED':
      return action.state

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
        // The code changed, but progress on chapters that stayed the same is kept.
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
        // The most recent applied revision is the one being undone; keep it in the
        // history as 'reverted' so the thread stays truthful.
        let undone = false
        const revisions = [...project.revisions].reverse().map((r) => {
          if (!undone && r.status === 'applied') {
            undone = true
            return { ...r, status: 'reverted' as const }
          }
          return r
        }).reverse()
        return {
          ...project,
          code: previous.code,
          // Chapters come back from the snapshot; completions made since are not lost.
          chapters: restoreChapters(project.chapters, previous.chapters),
          previousVersions: project.previousVersions.slice(0, -1),
          revisions,
        }
      })

    case 'BUILD_STARTED':
      // Rebuild after a failure: same prompt, fresh state.
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
      return updateProject(state, action.projectId, (project) => {
        // Chapter ids are positional. If a revision replaced the chapters while the
        // lesson was generating, the id may now point at different code; a lesson
        // for stale code must not be attached to it.
        const target = project.chapters.find((c) => c.id === action.chapterId && c.code === action.code)
        if (!target) return project
        return {
          ...project,
          chapters: project.chapters.map((c) => (c === target ? { ...c, lesson: action.lesson } : c)),
        }
      })

    case 'CHAPTER_ANSWERED': {
      const withProject = updateProject(state, action.projectId, (project) => {
        const chapter = project.chapters.find((c) => c.id === action.chapterId)
        if (!chapter) return project

        // A completed chapter is closed. Counting further answers would retroactively
        // corrupt the "correct on first try" metric.
        if (chapter.completed) return project

        // Every attempt counts, including wrong ones.
        const chapters = project.chapters.map((c) =>
          c.id === action.chapterId
            ? { ...c, attempts: c.attempts + 1, completed: c.completed || action.correct }
            : c,
        )

        // Points only on the transition to completed.
        const earned = action.correct && !chapter.completed ? POINTS_PER_CHAPTER : 0

        return { ...project, points: project.points + earned, chapters }
      })

      // A correct answer that completes a chapter also earns global XP,
      // based on the difficulty the lesson was generated at.
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
 * After a revision the code is re-split into chapters. A new chapter with a
 * matching title (same function, selector or zone) inherits progress from its
 * predecessor. The cached lesson is kept only if the chapter code is identical;
 * otherwise a new lesson is generated for the new code.
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
 * Undo: restore the snapshot's chapters (including cached lessons). A chapter
 * completed after the revision keeps its completion if the snapshot has a twin.
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

/** Percentage of completed chapters. A project without chapters is 0. */
export function progressPercent(project: Project): number {
  if (project.chapters.length === 0) return 0
  const done = project.chapters.filter((c) => c.completed).length
  return Math.round((done / project.chapters.length) * 100)
}

/**
 * Primary learning metric: how many completed chapters were answered correctly
 * on the first attempt (exactly one attempt recorded).
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

  // Preserve identity when nothing changed, so React does not re-render for a no-op.
  const untouched = projects.every((project, index) => project === state.projects[index])
  return untouched ? state : { ...state, projects }
}

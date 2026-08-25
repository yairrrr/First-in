import { useCallback } from 'react'
import { useApp } from './AppContext'
import { createProvider, type ProviderKind } from '../llm/createProvider'
import { buildProject } from '../services/projectBuilder'
import { reviseProject } from '../services/projectReviser'
import { splitCode } from '../services/codeSplitter'
import { exerciseKindFor, generateLesson } from '../services/lessonGenerator'
import { rankForXp } from './rank'
import { chapterTitleText } from '../i18n/chapterTitle'
import { errorMessage } from '../i18n/errorMessage'
import type { Action, Chapter, Language, Project } from './types'

// Asynchronous work lives here, not in the reducer, so the reducer stays pure
// and testable without a model or network.

/** Lesson requests currently in flight. Module-level so it survives remounts. */
const inFlightLessons = new Set<string>()

/**
 * The single chapter worth prefetching, or null.
 * Without an anchor: the first incomplete chapter, if it has no lesson yet.
 * With an anchor: only the chapter immediately after it, under the same condition.
 *
 * Deliberately narrow: a candidate that already has a lesson yields null instead
 * of searching further, otherwise each loaded lesson would trigger the next and
 * the whole project would be generated in the background.
 */
export function nextChapterToPrefetch(project: Project, afterChapterId?: string): Chapter | null {
  let candidate: Chapter | undefined
  if (afterChapterId) {
    const anchor = project.chapters.findIndex((c) => c.id === afterChapterId)
    if (anchor === -1) return null
    candidate = project.chapters[anchor + 1]
  } else {
    candidate = project.chapters.find((c) => !c.completed)
  }
  if (!candidate || candidate.completed || candidate.lesson) return null
  return candidate
}

export function useProjectActions() {
  const { state, dispatch } = useApp()
  const xp = state.xp
  const language = state.language

  /** Creates the project immediately and builds in the background. Returns the id for navigation. */
  const startProject = useCallback(
    (prompt: string, kind: ProviderKind): string => {
      const project: Project = {
        id: crypto.randomUUID(),
        prompt: prompt.trim(),
        provider: kind,
        status: 'building',
        code: '',
        chapters: [],
        revisions: [],
        previousVersions: [],
        points: 0,
        error: null,
        createdAt: new Date().toISOString(),
      }

      dispatch({ type: 'PROJECT_CREATED', project })
      void runBuild(project, kind, language, dispatch)
      return project.id
    },
    [dispatch, language],
  )

  /**
   * Generates the chapter's lesson if it does not exist yet.
   * Called when the learner opens a chapter, not ahead of time.
   */
  const loadLesson = useCallback(
    async (project: Project, chapter: Chapter): Promise<string | null> => {
      if (chapter.lesson) return null

      // React StrictMode runs effects twice in development; without this guard
      // every chapter visit would issue two model requests.
      const key = `${project.id}/${chapter.id}`
      if (inFlightLessons.has(key)) return null
      inFlightLessons.add(key)

      try {
        // Difficulty is fixed at generation time from the learner's current rank
        // and stored with the lesson.
        const difficulty = rankForXp(xp).difficulty
        const chapterIndex = project.chapters.findIndex((c) => c.id === chapter.id)
        const lesson = await generateLesson(createProvider(project.provider, language), {
          title: chapterTitleText(language, chapter),
          code: chapter.code,
          language,
          difficulty,
          kind: exerciseKindFor(difficulty, chapterIndex),
        })
        dispatch({
          type: 'LESSON_LOADED',
          projectId: project.id,
          chapterId: chapter.id,
          code: chapter.code,
          lesson,
        })
        return null
      } catch (error) {
        return errorMessage(language, error)
      } finally {
        inFlightLessons.delete(key)
      }
    },
    [dispatch, xp, language],
  )

  const answerQuestion = useCallback(
    (projectId: string, chapterId: string, correct: boolean) => {
      dispatch({ type: 'CHAPTER_ANSWERED', projectId, chapterId, correct })
    },
    [dispatch],
  )

  /** Rebuilds a failed project with the same prompt and provider. */
  const retryBuild = useCallback(
    (project: Project) => {
      dispatch({ type: 'BUILD_STARTED', projectId: project.id })
      void runBuild(project, project.provider, language, dispatch)
    },
    [dispatch, language],
  )

  const deleteProject = useCallback(
    (projectId: string) => {
      dispatch({ type: 'PROJECT_DELETED', projectId })
    },
    [dispatch],
  )

  /**
   * Applies a free-text instruction to a built project. The model rewrites the
   * file, chapters are re-split, and progress on unchanged chapters is kept.
   */
  const reviseProjectWith = useCallback(
    (project: Project, instruction: string) => {
      const revision = {
        id: crypto.randomUUID(),
        instruction: instruction.trim(),
        status: 'working' as const,
        message: null,
        createdAt: new Date().toISOString(),
      }
      dispatch({ type: 'REVISION_STARTED', projectId: project.id, revision })
      void (async () => {
        try {
          const code = await reviseProject(createProvider(project.provider, language), project.code, instruction)
          dispatch({
            type: 'REVISION_SUCCEEDED',
            projectId: project.id,
            revisionId: revision.id,
            code,
            chapters: splitCode(code),
          })
        } catch (error) {
          dispatch({
            type: 'REVISION_FAILED',
            projectId: project.id,
            revisionId: revision.id,
            message: errorMessage(language, error),
          })
        }
      })()
    },
    [dispatch, language],
  )

  /** Restores the previous version (code and chapters) from the stored snapshot. */
  const revertRevision = useCallback(
    (project: Project) => {
      if (project.previousVersions.length === 0) return
      dispatch({ type: 'REVISION_REVERTED', projectId: project.id })
    },
    [dispatch],
  )

  return {
    startProject,
    loadLesson,
    answerQuestion,
    deleteProject,
    retryBuild,
    reviseProject: reviseProjectWith,
    revertRevision,
  }
}

async function runBuild(
  project: Project,
  kind: ProviderKind,
  language: Language,
  dispatch: (action: Action) => void,
): Promise<void> {
  try {
    const code = await buildProject(createProvider(kind, language), project.prompt)
    dispatch({
      type: 'BUILD_SUCCEEDED',
      projectId: project.id,
      code,
      chapters: splitCode(code),
    })
  } catch (error) {
    dispatch({
      type: 'BUILD_FAILED',
      projectId: project.id,
      message: errorMessage(language, error),
    })
  }
}

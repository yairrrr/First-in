import { useCallback } from 'react'
import { useApp } from './AppContext'
import { createProvider, type ProviderKind } from '../llm/createProvider'
import { buildProject } from '../services/projectBuilder'
import { splitCode } from '../services/codeSplitter'
import { generateLesson } from '../services/lessonGenerator'
import type { Action, Chapter, Project } from './types'

/**
 * העבודה האסינכרונית יושבת כאן ולא ב-reducer.
 * ה-reducer נשאר פונקציה טהורה, ולכן אפשר לבדוק אותו בלי מודל ובלי רשת.
 */
export function useProjectActions() {
  const { dispatch } = useApp()

  /** פותח פרויקט מיד, ומריץ את הבנייה ברקע. מחזיר את המזהה כדי שאפשר יהיה לנווט אליו. */
  const startProject = useCallback(
    (prompt: string, kind: ProviderKind): string => {
      const project: Project = {
        id: crypto.randomUUID(),
        prompt: prompt.trim(),
        provider: kind,
        status: 'building',
        code: '',
        chapters: [],
        points: 0,
        error: null,
        createdAt: new Date().toISOString(),
      }

      dispatch({ type: 'PROJECT_CREATED', project })
      void runBuild(project, kind, dispatch)
      return project.id
    },
    [dispatch],
  )

  /**
   * יוצר את השיעור של פרק, אם עוד אין לו.
   * נקרא כשהמשתמש פותח פרק — לא מראש, ראה ADR-005.
   */
  const loadLesson = useCallback(
    async (project: Project, chapter: Chapter): Promise<string | null> => {
      if (chapter.lesson) return null
      try {
        const lesson = await generateLesson(createProvider(project.provider), {
          title: chapter.title,
          code: chapter.code,
          language: 'he',
        })
        dispatch({ type: 'LESSON_LOADED', projectId: project.id, chapterId: chapter.id, lesson })
        return null
      } catch (error) {
        return error instanceof Error ? error.message : 'יצירת השיעור נכשלה'
      }
    },
    [dispatch],
  )

  const answerQuestion = useCallback(
    (projectId: string, chapterId: string, correct: boolean) => {
      dispatch({ type: 'CHAPTER_ANSWERED', projectId, chapterId, correct })
    },
    [dispatch],
  )

  return { startProject, loadLesson, answerQuestion }
}

async function runBuild(
  project: Project,
  kind: ProviderKind,
  dispatch: (action: Action) => void,
): Promise<void> {
  try {
    const code = await buildProject(createProvider(kind), project.prompt)
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
      message: error instanceof Error ? error.message : 'הבנייה נכשלה מסיבה לא ידועה',
    })
  }
}

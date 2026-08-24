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

/**
 * העבודה האסינכרונית יושבת כאן ולא ב-reducer.
 * ה-reducer נשאר פונקציה טהורה, ולכן אפשר לבדוק אותו בלי מודל ובלי רשת.
 */
/** בקשות שיעור שרצות כרגע. מודול-גלובלי, כדי לשרוד רכיבים שנהרסים ונבנים. */
const inFlightLessons = new Set<string>()

/**
 * הפרק שכדאי להטעין מראש — אחד בדיוק, ולא שרשרת:
 * בלי נקודת מוצא — הפרק הראשון שטרם הושלם, ורק אם עוד אין לו שיעור.
 * עם נקודת מוצא — הפרק הצמוד שאחריה בלבד, באותו תנאי.
 *
 * הצמצום מכוון: מועמד שכבר יש לו שיעור מחזיר null ולא ממשיך הלאה,
 * אחרת כל שיעור שנטען היה מצית את הבא, וכל הפרויקט היה נוצר ברקע —
 * בניגוד ל-ADR-005.
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
   * יוצר את השיעור של פרק, אם עוד אין לו.
   * נקרא כשהמשתמש פותח פרק — לא מראש, ראה ADR-005.
   */
  const loadLesson = useCallback(
    async (project: Project, chapter: Chapter): Promise<string | null> => {
      if (chapter.lesson) return null

      // StrictMode מריץ effects פעמיים בפיתוח. בלי ההגנה הזו כל כניסה לפרק
      // הייתה שולחת למודל שתי בקשות של רבע דקה במקום אחת.
      const key = `${project.id}/${chapter.id}`
      if (inFlightLessons.has(key)) return null
      inFlightLessons.add(key)

      try {
        // הקושי נקבע ברגע יצירת השיעור, לפי דרגת המשתמש באותו רגע.
        // שיעור שנשמר שומר את הרמה שבה נוצר.
        const difficulty = rankForXp(xp).difficulty
        const chapterIndex = project.chapters.findIndex((c) => c.id === chapter.id)
        const lesson = await generateLesson(createProvider(project.provider, language), {
          title: chapterTitleText(language, chapter),
          code: chapter.code,
          language,
          difficulty,
          kind: exerciseKindFor(difficulty, chapterIndex),
        })
        dispatch({ type: 'LESSON_LOADED', projectId: project.id, chapterId: chapter.id, lesson })
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

  /** בנייה מחדש של פרויקט שנכשל, עם אותו פרומפט ואותו ספק. */
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
   * הערה על הפרויקט: "תגדיל את הכפתורים". המודל משכתב את הקובץ,
   * הפרקים מתחלקים מחדש, וההתקדמות על פרקים שלא השתנו נשמרת.
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

  /** חזרה לגרסה הקודמת: הקוד והפרקים חוזרים מתמונת המצב השמורה. */
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

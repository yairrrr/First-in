import { describe, expect, it } from 'vitest'
import { initialState, mergeChapters, reducer, restoreChapters } from './reducer'
import type { Chapter, Project, Revision } from './types'

function chapter(id: string, over: Partial<Chapter> = {}): Chapter {
  return {
    id, title: { kind: 'markup' }, extraUnits: 0, code: 'x',
    completed: false, attempts: 0, lesson: null, ...over,
  }
}

function fn(name: string, code: string, over: Partial<Chapter> = {}): Chapter {
  return chapter(name, { title: { kind: 'function', name }, code, ...over })
}

const lesson = {
  difficulty: 'intro' as const, concept: 'c', example: 'e',
  exercise: { kind: 'assemble' as const, instruction: 'i', tokens: ['a', 'b', 'c'] },
}

function readyProject(): Project {
  return {
    id: 'p1', prompt: 'x', provider: 'fixture', status: 'ready',
    code: 'v1', chapters: [fn('flipCard', 'old', { completed: true, attempts: 1, lesson })],
    revisions: [], previousVersions: [], points: 10, error: null, createdAt: '',
  }
}

const revision: Revision = { id: 'r1', instruction: 'תגדיל', status: 'working', message: null, createdAt: '' }

describe('mergeChapters', () => {
  it('פרק עם אותה כותרת יורש התקדמות; שיעור נשמר רק אם הקוד זהה', () => {
    const old = [fn('flipCard', 'same', { completed: true, attempts: 2, lesson })]
    const next = [fn('flipCard', 'same')]
    const merged = mergeChapters(old, next)
    expect(merged[0].completed).toBe(true)
    expect(merged[0].attempts).toBe(2)
    expect(merged[0].lesson).toBe(lesson)
  })

  it('קוד שהשתנה: ההתקדמות נשמרת, השיעור נוצר מחדש', () => {
    const old = [fn('flipCard', 'before', { completed: true, attempts: 1, lesson })]
    const merged = mergeChapters(old, [fn('flipCard', 'after')])
    expect(merged[0].completed).toBe(true)
    expect(merged[0].lesson).toBeNull()
  })

  it('פרק חדש מתחיל מאפס, ופרק שנעלם לא משפיע', () => {
    const old = [fn('gone', 'x', { completed: true })]
    const merged = mergeChapters(old, [fn('fresh', 'y')])
    expect(merged).toHaveLength(1)
    expect(merged[0].completed).toBe(false)
  })

  it('שני פרקים עם אותה כותרת מתאימים לפי הסדר, לא כפול', () => {
    const old = [chapter('a', { title: { kind: 'wiring', n: 1 }, completed: true }), chapter('b', { title: { kind: 'wiring', n: 1 } })]
    const next = [chapter('c', { title: { kind: 'wiring', n: 1 } }), chapter('d', { title: { kind: 'wiring', n: 1 } })]
    const merged = mergeChapters(old, next)
    expect(merged.map((c) => c.completed)).toEqual([true, false])
  })
})

describe('זרימת שינוי', () => {
  it('שינוי שהתחיל מופיע כ-working, והצלחה מחליפה קוד ושומרת גרסה קודמת', () => {
    const s0 = reducer(initialState, { type: 'PROJECT_CREATED', project: readyProject() })
    const s1 = reducer(s0, { type: 'REVISION_STARTED', projectId: 'p1', revision })
    expect(s1.projects[0].revisions[0].status).toBe('working')

    const s2 = reducer(s1, {
      type: 'REVISION_SUCCEEDED', projectId: 'p1', revisionId: 'r1', code: 'v2',
      chapters: [fn('flipCard', 'old')],
    })
    expect(s2.projects[0].code).toBe('v2')
    expect(s2.projects[0].previousVersions).toHaveLength(1)
    expect(s2.projects[0].previousVersions[0].code).toBe('v1')
    expect(s2.projects[0].previousVersions[0].chapters[0].completed).toBe(true)
    expect(s2.projects[0].revisions[0].status).toBe('applied')
    // אותו קוד לפרק → ההתקדמות והשיעור נשמרו
    expect(s2.projects[0].chapters[0].completed).toBe(true)
    expect(s2.projects[0].chapters[0].lesson).toBe(lesson)
  })

  it('כישלון מסמן את השינוי ולא נוגע בקוד', () => {
    const s0 = reducer(initialState, { type: 'PROJECT_CREATED', project: readyProject() })
    const s1 = reducer(s0, { type: 'REVISION_STARTED', projectId: 'p1', revision })
    const s2 = reducer(s1, { type: 'REVISION_FAILED', projectId: 'p1', revisionId: 'r1', message: 'נפל' })
    expect(s2.projects[0].code).toBe('v1')
    expect(s2.projects[0].revisions[0]).toMatchObject({ status: 'failed', message: 'נפל' })
  })

  it('חזרה אחורה משחזרת קוד ופרקים מהתמונה, גם אם השינוי מחק את הפרק', () => {
    const s0 = reducer(initialState, { type: 'PROJECT_CREATED', project: readyProject() })
    const s1 = reducer(s0, { type: 'REVISION_STARTED', projectId: 'p1', revision })
    const s2 = reducer(s1, { type: 'REVISION_SUCCEEDED', projectId: 'p1', revisionId: 'r1', code: 'v2', chapters: [] })
    expect(s2.projects[0].chapters).toHaveLength(0)
    const s3 = reducer(s2, { type: 'REVISION_REVERTED', projectId: 'p1' })
    expect(s3.projects[0].code).toBe('v1')
    expect(s3.projects[0].previousVersions).toEqual([])
    expect(s3.projects[0].chapters[0].completed).toBe(true)
    expect(s3.projects[0].chapters[0].lesson).toBe(lesson)
  })

  it('פרק שהושלם אחרי השינוי נשאר מושלם גם אחרי חזרה אחורה', () => {
    const current = [fn('initGame', 'new', { completed: true, attempts: 2 })]
    const snapshot = [fn('initGame', 'old'), fn('flipCard', 'x', { completed: true })]
    const restored = restoreChapters(current, snapshot)
    expect(restored.map((c) => c.completed)).toEqual([true, true])
    expect(restored[0].attempts).toBe(2)
    expect(restored[0].code).toBe('old')
  })

  it('בלי גרסה קודמת — חזרה אחורה לא משנה דבר', () => {
    const s0 = reducer(initialState, { type: 'PROJECT_CREATED', project: readyProject() })
    const s1 = reducer(s0, { type: 'REVISION_REVERTED', projectId: 'p1' })
    expect(s1).toBe(s0)
  })

  it('המחסנית מוגבלת לחמש גרסאות', () => {
    let s = reducer(initialState, { type: 'PROJECT_CREATED', project: readyProject() })
    for (let i = 0; i < 7; i++) {
      s = reducer(s, { type: 'REVISION_STARTED', projectId: 'p1', revision: { ...revision, id: `r${i}` } })
      s = reducer(s, { type: 'REVISION_SUCCEEDED', projectId: 'p1', revisionId: `r${i}`, code: `v${i + 2}`, chapters: [] })
    }
    expect(s.projects[0].previousVersions).toHaveLength(5)
    expect(s.projects[0].previousVersions[4].code).toBe('v7')
  })
})

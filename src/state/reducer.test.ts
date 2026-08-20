import { describe, expect, it } from 'vitest'
import { POINTS_PER_CHAPTER, initialState, progressPercent, reducer } from './reducer'
import type { Chapter, Project } from './types'

function makeChapter(id: string): Chapter {
  return { id, title: `פרק ${id}`, code: '<div></div>', completed: false }
}

function makeProject(): Project {
  return {
    id: 'p1',
    prompt: 'משחק זיכרון',
    status: 'building',
    code: '',
    chapters: [],
    points: 0,
    createdAt: '2026-08-20T10:00:00.000Z',
  }
}

describe('reducer', () => {
  it('מוסיף פרויקט חדש בראש הרשימה', () => {
    const next = reducer(initialState, { type: 'PROJECT_CREATED', project: makeProject() })
    expect(next.projects).toHaveLength(1)
    expect(next.projects[0].status).toBe('building')
  })

  it('שומר את הקוד והפרקים כשהבנייה מצליחה', () => {
    const created = reducer(initialState, { type: 'PROJECT_CREATED', project: makeProject() })
    const next = reducer(created, {
      type: 'BUILD_SUCCEEDED',
      projectId: 'p1',
      code: '<html></html>',
      chapters: [makeChapter('c1'), makeChapter('c2')],
    })
    expect(next.projects[0].status).toBe('ready')
    expect(next.projects[0].chapters).toHaveLength(2)
  })

  it('מזכה בנקודות על תשובה נכונה, ומסמן את הפרק כהושלם', () => {
    const ready = buildReadyProject()
    const next = reducer(ready, {
      type: 'CHAPTER_ANSWERED',
      projectId: 'p1',
      chapterId: 'c1',
      correct: true,
    })
    expect(next.projects[0].points).toBe(POINTS_PER_CHAPTER)
    expect(next.projects[0].chapters[0].completed).toBe(true)
  })

  it('לא מזכה בנקודות פעמיים על אותו פרק', () => {
    const ready = buildReadyProject()
    const once = reducer(ready, {
      type: 'CHAPTER_ANSWERED',
      projectId: 'p1',
      chapterId: 'c1',
      correct: true,
    })
    const twice = reducer(once, {
      type: 'CHAPTER_ANSWERED',
      projectId: 'p1',
      chapterId: 'c1',
      correct: true,
    })
    expect(twice.projects[0].points).toBe(POINTS_PER_CHAPTER)
  })

  it('תשובה שגויה לא משנה דבר', () => {
    const ready = buildReadyProject()
    const next = reducer(ready, {
      type: 'CHAPTER_ANSWERED',
      projectId: 'p1',
      chapterId: 'c1',
      correct: false,
    })
    expect(next).toBe(ready)
  })

  it('מחשב אחוז התקדמות לפי פרקים שהושלמו', () => {
    const ready = buildReadyProject()
    expect(progressPercent(ready.projects[0])).toBe(0)
    const answered = reducer(ready, {
      type: 'CHAPTER_ANSWERED',
      projectId: 'p1',
      chapterId: 'c1',
      correct: true,
    })
    expect(progressPercent(answered.projects[0])).toBe(50)
  })
})

function buildReadyProject() {
  const created = reducer(initialState, { type: 'PROJECT_CREATED', project: makeProject() })
  return reducer(created, {
    type: 'BUILD_SUCCEEDED',
    projectId: 'p1',
    code: '<html></html>',
    chapters: [makeChapter('c1'), makeChapter('c2')],
  })
}

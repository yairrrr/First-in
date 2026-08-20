import { describe, expect, it } from 'vitest'
import { POINTS_PER_CHAPTER, firstTryStats, initialState, progressPercent, reducer } from './reducer'
import type { Chapter, Project } from './types'

function makeChapter(id: string): Chapter {
  return { id, title: `פרק ${id}`, code: '<div></div>', completed: false, lesson: null, attempts: 0 }
}

function makeProject(): Project {
  return {
    id: 'p1',
    prompt: 'משחק זיכרון',
    provider: 'fixture',
    status: 'building',
    code: '',
    chapters: [],
    points: 0,
    error: null,
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

  it('תשובה שגויה נספרת כניסיון אך אינה מזכה', () => {
    const ready = buildReadyProject()
    const next = reducer(ready, {
      type: 'CHAPTER_ANSWERED',
      projectId: 'p1',
      chapterId: 'c1',
      correct: false,
    })
    expect(next.projects[0].points).toBe(0)
    expect(next.projects[0].chapters[0].completed).toBe(false)
    expect(next.projects[0].chapters[0].attempts).toBe(1)
  })

  it('תשובה נכונה אחרי שגויה משלימה את הפרק, והניסיונות נשמרים', () => {
    const ready = buildReadyProject()
    const wrong = reducer(ready, {
      type: 'CHAPTER_ANSWERED',
      projectId: 'p1',
      chapterId: 'c1',
      correct: false,
    })
    const right = reducer(wrong, {
      type: 'CHAPTER_ANSWERED',
      projectId: 'p1',
      chapterId: 'c1',
      correct: true,
    })
    expect(right.projects[0].points).toBe(POINTS_PER_CHAPTER)
    expect(right.projects[0].chapters[0].attempts).toBe(2)
  })

  it('שומר שיעור שנוצר עבור פרק', () => {
    const ready = buildReadyProject()
    const lesson = {
      explanation: 'הסבר',
      question: { text: 'שאלה?', options: ['א', 'ב', 'ג', 'ד'], correctIndex: 2 },
    }
    const next = reducer(ready, { type: 'LESSON_LOADED', projectId: 'p1', chapterId: 'c1', lesson })
    expect(next.projects[0].chapters[0].lesson).toEqual(lesson)
    expect(next.projects[0].chapters[1].lesson).toBeNull()
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

describe('כישלון בנייה', () => {
  it('שומר את הודעת השגיאה כדי שהמסך יוכל להציג אותה', () => {
    const created = reducer(initialState, { type: 'PROJECT_CREATED', project: makeProject() })
    const next = reducer(created, {
      type: 'BUILD_FAILED',
      projectId: 'p1',
      message: 'אין תשובה מ-Ollama',
    })
    expect(next.projects[0].status).toBe('failed')
    expect(next.projects[0].error).toBe('אין תשובה מ-Ollama')
  })

  it('בנייה מוצלחת מנקה שגיאה קודמת', () => {
    const created = reducer(initialState, { type: 'PROJECT_CREATED', project: makeProject() })
    const failed = reducer(created, { type: 'BUILD_FAILED', projectId: 'p1', message: 'נפל' })
    const fixed = reducer(failed, {
      type: 'BUILD_SUCCEEDED',
      projectId: 'p1',
      code: '<html></html>',
      chapters: [],
    })
    expect(fixed.projects[0].error).toBeNull()
  })
})

describe('firstTryStats', () => {
  it('מבחין בין הצלחה מהניסיון הראשון להצלחה אחרי טעות', () => {
    const ready = buildReadyProject()
    // c1 נכון מיד; c2 טעות ואז נכון
    const afterC1 = reducer(ready, {
      type: 'CHAPTER_ANSWERED', projectId: 'p1', chapterId: 'c1', correct: true,
    })
    const wrongC2 = reducer(afterC1, {
      type: 'CHAPTER_ANSWERED', projectId: 'p1', chapterId: 'c2', correct: false,
    })
    const doneC2 = reducer(wrongC2, {
      type: 'CHAPTER_ANSWERED', projectId: 'p1', chapterId: 'c2', correct: true,
    })

    expect(firstTryStats(doneC2.projects[0])).toEqual({ firstTry: 1, completed: 2 })
  })

  it('פרויקט שלא נלמד כלל מחזיר אפסים', () => {
    const ready = buildReadyProject()
    expect(firstTryStats(ready.projects[0])).toEqual({ firstTry: 0, completed: 0 })
  })
})

describe('מחיקת פרויקט', () => {
  it('מסיר את הפרויקט ומשאיר את השאר', () => {
    const one = reducer(initialState, { type: 'PROJECT_CREATED', project: makeProject() })
    const two = reducer(one, {
      type: 'PROJECT_CREATED',
      project: { ...makeProject(), id: 'p2' },
    })
    const next = reducer(two, { type: 'PROJECT_DELETED', projectId: 'p1' })
    expect(next.projects.map((p) => p.id)).toEqual(['p2'])
  })
})

describe('פרק שהושלם סגור', () => {
  it('תשובה חוזרת בפרק שהושלם אינה משנה דבר, כולל את מונה הניסיונות', () => {
    const ready = buildReadyProject()
    const done = reducer(ready, {
      type: 'CHAPTER_ANSWERED', projectId: 'p1', chapterId: 'c1', correct: true,
    })
    const again = reducer(done, {
      type: 'CHAPTER_ANSWERED', projectId: 'p1', chapterId: 'c1', correct: false,
    })
    expect(again).toBe(done)
    expect(firstTryStats(again.projects[0]).firstTry).toBe(1)
  })
})

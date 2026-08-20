import { describe, expect, it } from 'vitest'
import { STORAGE_KEY, loadState, saveState, type StateStorage } from './persistence'
import type { AppState } from './types'

function fakeStorage(initial: string | null = null): StateStorage & { value: string | null } {
  return {
    value: initial,
    getItem() {
      return this.value
    },
    setItem(_key, value) {
      this.value = value
    },
  }
}

const readyProject = {
  id: 'p1',
  prompt: 'משחק זיכרון',
  provider: 'fixture',
  status: 'ready',
  code: '<html></html>',
  chapters: [
    { id: 'ch-1', title: 'מבנה העמוד', code: '<div></div>', completed: true, lesson: null, attempts: 1 },
  ],
  points: 10,
  error: null,
  createdAt: '2026-08-20T10:00:00.000Z',
}

describe('saveState ו-loadState', () => {
  it('מחזירים את אותו מצב הלוך ושוב', () => {
    const storage = fakeStorage()
    const state: AppState = { projects: [readyProject] } as AppState

    saveState(storage, state)
    expect(loadState(storage)).toEqual(state)
  })

  it('שומרים תחת מפתח שנושא מספר גרסה', () => {
    const storage = fakeStorage()
    let key = ''
    saveState({ getItem: () => null, setItem: (k) => (key = k) }, { projects: [] })
    expect(key).toBe(STORAGE_KEY)
    expect(storage.value).toBeNull()
  })

  it('מצב ריק כשאין מה לטעון', () => {
    expect(loadState(fakeStorage())).toEqual({ projects: [] })
    expect(loadState(undefined)).toEqual({ projects: [] })
  })

  it('שורדים מידע פגום ולא מפילים את האפליקציה', () => {
    expect(loadState(fakeStorage('לא JSON'))).toEqual({ projects: [] })
    expect(loadState(fakeStorage('{"projects": "not an array"}'))).toEqual({ projects: [] })
  })

  it('זורקים פרויקט פגום ושומרים את התקינים', () => {
    const storage = fakeStorage(JSON.stringify({ projects: [{ nonsense: true }, readyProject] }))
    expect(loadState(storage).projects.map((p) => p.id)).toEqual(['p1'])
  })

  it('בנייה שנקטעה ברענון נטענת ככישלון ולא כבנייה נצחית', () => {
    const building = { ...readyProject, status: 'building', code: '', chapters: [] }
    const storage = fakeStorage(JSON.stringify({ projects: [building] }))

    const loaded = loadState(storage).projects[0]
    expect(loaded.status).toBe('failed')
    expect(loaded.error).toContain('נקטעה')
  })

  it('שורדים אחסון שחוסם קריאה או כתיבה', () => {
    const blocked: StateStorage = {
      getItem() {
        throw new Error('blocked')
      },
      setItem() {
        throw new Error('blocked')
      },
    }
    expect(loadState(blocked)).toEqual({ projects: [] })
    expect(() => saveState(blocked, { projects: [] })).not.toThrow()
  })
})

describe('טעינת שיעורים שמורים', () => {
  const lesson = {
    explanation: 'הסבר',
    question: { text: 'שאלה?', options: ['א', 'ב', 'ג', 'ד'], correctIndex: 1 },
  }

  function storedWith(chapterExtras: Record<string, unknown>) {
    return fakeStorage(
      JSON.stringify({
        projects: [
          {
            ...readyProject,
            chapters: [{ id: 'ch-1', title: 'פרק', code: 'x', completed: false, ...chapterExtras }],
          },
        ],
      }),
    )
  }

  it('שיעור תקין נטען יחד עם מספר הניסיונות', () => {
    const chapter = loadState(storedWith({ lesson, attempts: 3 })).projects[0].chapters[0]
    expect(chapter.lesson).toEqual(lesson)
    expect(chapter.attempts).toBe(3)
  })

  it('שיעור פגום נזרק, והפרק עצמו שורד', () => {
    const broken = { ...lesson, question: { ...lesson.question, correctIndex: 9 } }
    const chapter = loadState(storedWith({ lesson: broken })).projects[0].chapters[0]
    expect(chapter.lesson).toBeNull()
    expect(chapter.id).toBe('ch-1')
  })
})

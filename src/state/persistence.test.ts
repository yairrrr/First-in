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
    {
      id: 'ch-1', title: { kind: 'markup' }, extraUnits: 0,
      code: '<div></div>', completed: true, lesson: null, attempts: 1,
    },
  ],
  revisions: [],
  previousVersions: [],
  points: 10,
  error: null,
  createdAt: '2026-08-20T10:00:00.000Z',
}

describe('saveState ו-loadState', () => {
  it('מחזירים את אותו מצב הלוך ושוב', () => {
    const storage = fakeStorage()
    const state: AppState = { projects: [readyProject], xp: 0, language: 'he' } as AppState

    saveState(storage, state)
    expect(loadState(storage)).toEqual(state)
  })

  it('שומרים תחת מפתח שנושא מספר גרסה', () => {
    const storage = fakeStorage()
    let key = ''
    saveState({ getItem: () => null, setItem: (k) => (key = k) }, { projects: [], xp: 0, language: 'he' })
    expect(key).toBe(STORAGE_KEY)
    expect(storage.value).toBeNull()
  })

  it('מצב ריק כשאין מה לטעון', () => {
    expect(loadState(fakeStorage())).toEqual({ projects: [], xp: 0, language: 'he' })
    expect(loadState(undefined)).toEqual({ projects: [], xp: 0, language: 'he' })
  })

  it('שורדים מידע פגום ולא מפילים את האפליקציה', () => {
    expect(loadState(fakeStorage('לא JSON'))).toEqual({ projects: [], xp: 0, language: 'he' })
    expect(loadState(fakeStorage('{"projects": "not an array"}'))).toEqual({ projects: [], xp: 0, language: 'he' })
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
    expect(loadState(blocked)).toEqual({ projects: [], xp: 0, language: 'he' })
    expect(() => saveState(blocked, { projects: [], xp: 0, language: 'he' })).not.toThrow()
  })
})

describe('טעינת שיעורים שמורים', () => {
  const lesson = {
    difficulty: 'core',
    concept: 'עיקרון',
    example: 'x = 1',
    exercise: { kind: 'choice', question: 'שאלה?', options: ['א', 'ב', 'ג', 'ד'], correctIndex: 1 },
  }

  function storedWith(chapterExtras: Record<string, unknown>) {
    return fakeStorage(
      JSON.stringify({
        projects: [
          {
            ...readyProject,
            chapters: [{ id: 'ch-1', title: { kind: 'markup' }, code: 'x', completed: false, ...chapterExtras }],
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
    const broken = {
      ...lesson,
      exercise: { kind: 'choice', question: 'ש?', options: ['א', 'ב', 'ג', 'ד'], correctIndex: 9 },
    }
    const chapter = loadState(storedWith({ lesson: broken })).projects[0].chapters[0]
    expect(chapter.lesson).toBeNull()
    expect(chapter.id).toBe('ch-1')
  })

  it('שיעור הרכבה שמור נטען, כולל המשבצות', () => {
    const assemble = {
      difficulty: 'intro',
      concept: 'עיקרון',
      example: 'x',
      exercise: { kind: 'assemble', instruction: 'הרכב', tokens: ['a', 'b', 'c'] },
    }
    const chapter = loadState(storedWith({ lesson: assemble })).projects[0].chapters[0]
    expect(chapter.lesson?.exercise.kind).toBe('assemble')
  })

  it('שיעור בפורמט הישן נזרק בשקט וייווצר מחדש', () => {
    const v1 = {
      explanation: 'הסבר ישן',
      question: { text: 'ש?', options: ['א', 'ב', 'ג', 'ד'], correctIndex: 1 },
    }
    const chapter = loadState(storedWith({ lesson: v1 })).projects[0].chapters[0]
    expect(chapter.lesson).toBeNull()
  })
})

describe('XP גלובלי', () => {
  it('נשמר ונטען', () => {
    const storage = fakeStorage()
    saveState(storage, { projects: [], xp: 135, language: 'he' })
    expect(loadState(storage).xp).toBe(135)
  })

  it('מצב ישן בלי XP, או XP פגום, נטען עם אפס', () => {
    expect(loadState(fakeStorage('{"projects": []}')).xp).toBe(0)
    expect(loadState(fakeStorage('{"projects": [], "xp": "הרבה"}')).xp).toBe(0)
    expect(loadState(fakeStorage('{"projects": [], "xp": -5}')).xp).toBe(0)
  })
})

describe('שפה וכותרות', () => {
  it('שפה נשמרת ונטענת, וברירת המחדל עברית', () => {
    const storage = fakeStorage()
    saveState(storage, { projects: [], xp: 0, language: 'en' })
    expect(loadState(storage).language).toBe('en')
    expect(loadState(fakeStorage('{"projects": []}')).language).toBe('he')
  })

  it('פרק עם כותרת בפורמט הישן (מחרוזת) נזרק', () => {
    const old = { ...readyProject, chapters: [{ id: 'x', title: 'טקסט', code: 'c', completed: false }] }
    const storage = fakeStorage(JSON.stringify({ projects: [old] }))
    expect(loadState(storage).projects[0].chapters).toHaveLength(0)
  })
})

describe('שינויים וגרסאות שמורות', () => {
  it('היסטוריית שינויים ותמונת גרסה נטענות; שינוי שנקטע נטען ככישלון', () => {
    const stored = {
      ...readyProject,
      revisions: [
        { id: 'r1', instruction: 'תגדיל', status: 'applied', message: null, createdAt: '' },
        { id: 'r2', instruction: 'תקטין', status: 'working', message: null, createdAt: '' },
      ],
      previousVersions: [{ code: '<html>v1</html>', chapters: readyProject.chapters }],
    }
    const loaded = loadState(fakeStorage(JSON.stringify({ projects: [stored] }))).projects[0]
    expect(loaded.revisions.map((r) => r.status)).toEqual(['applied', 'failed'])
    expect(loaded.revisions[1].message).toBe('interrupted')
    expect(loaded.previousVersions[0].code).toBe('<html>v1</html>')
    expect(loaded.previousVersions[0].chapters[0].completed).toBe(true)
  })
})

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

const empty: AppState = { projects: [], xp: 0, language: 'he' }

const readyProject = {
  id: 'p1',
  prompt: 'memory game',
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

describe('saveState / loadState', () => {
  it('round-trips state', () => {
    const storage = fakeStorage()
    const state = { projects: [readyProject], xp: 0, language: 'he' } as AppState

    saveState(storage, state)
    expect(loadState(storage)).toEqual(state)
  })

  it('writes under the versioned key', () => {
    const storage = fakeStorage()
    let key = ''
    saveState({ getItem: () => null, setItem: (k) => (key = k) }, empty)
    expect(key).toBe(STORAGE_KEY)
    expect(storage.value).toBeNull()
  })

  it('returns empty state when nothing is stored', () => {
    expect(loadState(fakeStorage())).toEqual(empty)
    expect(loadState(undefined)).toEqual(empty)
  })

  it('survives corrupt data', () => {
    expect(loadState(fakeStorage('not json'))).toEqual(empty)
    expect(loadState(fakeStorage('{"projects": "not an array"}'))).toEqual(empty)
  })

  it('drops a corrupt project and keeps valid ones', () => {
    const storage = fakeStorage(JSON.stringify({ projects: [{ nonsense: true }, readyProject] }))
    expect(loadState(storage).projects.map((p) => p.id)).toEqual(['p1'])
  })

  it('loads an interrupted build as failed rather than building forever', () => {
    const building = { ...readyProject, status: 'building', code: '', chapters: [] }
    const storage = fakeStorage(JSON.stringify({ projects: [building] }))

    const loaded = loadState(storage).projects[0]
    expect(loaded.status).toBe('failed')
    expect(loaded.error).toBe('interrupted')
  })

  it('tolerates storage that throws on read or write, and reports the failed write', () => {
    const blocked: StateStorage = {
      getItem() {
        throw new Error('blocked')
      },
      setItem() {
        throw new Error('QuotaExceededError')
      },
    }
    expect(loadState(blocked)).toEqual(empty)
    expect(saveState(blocked, empty)).toBe(false)
    expect(saveState(fakeStorage(), empty)).toBe(true)
    expect(saveState(undefined, empty)).toBe(true)
  })
})

describe('stored lessons', () => {
  const lesson = {
    difficulty: 'core',
    concept: 'concept',
    example: 'x = 1',
    exercise: { kind: 'choice', question: 'q?', options: ['a', 'b', 'c', 'd'], correctIndex: 1 },
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

  it('loads a valid lesson together with the attempt count', () => {
    const chapter = loadState(storedWith({ lesson, attempts: 3 })).projects[0].chapters[0]
    expect(chapter.lesson).toEqual(lesson)
    expect(chapter.attempts).toBe(3)
  })

  it('drops a corrupt lesson but keeps the chapter', () => {
    const broken = {
      ...lesson,
      exercise: { kind: 'choice', question: 'q?', options: ['a', 'b', 'c', 'd'], correctIndex: 9 },
    }
    const chapter = loadState(storedWith({ lesson: broken })).projects[0].chapters[0]
    expect(chapter.lesson).toBeNull()
    expect(chapter.id).toBe('ch-1')
  })

  it('loads an assemble lesson including its tokens', () => {
    const assemble = {
      difficulty: 'intro',
      concept: 'concept',
      example: 'x',
      exercise: { kind: 'assemble', instruction: 'assemble', tokens: ['a', 'b', 'c'] },
    }
    const chapter = loadState(storedWith({ lesson: assemble })).projects[0].chapters[0]
    expect(chapter.lesson?.exercise.kind).toBe('assemble')
  })

  it('drops a lesson in the legacy format', () => {
    const legacy = {
      explanation: 'old explanation',
      question: { text: 'q?', options: ['a', 'b', 'c', 'd'], correctIndex: 1 },
    }
    const chapter = loadState(storedWith({ lesson: legacy })).projects[0].chapters[0]
    expect(chapter.lesson).toBeNull()
  })
})

describe('global XP', () => {
  it('round-trips', () => {
    const storage = fakeStorage()
    saveState(storage, { ...empty, xp: 135 })
    expect(loadState(storage).xp).toBe(135)
  })

  it('defaults to zero for missing or invalid values', () => {
    expect(loadState(fakeStorage('{"projects": []}')).xp).toBe(0)
    expect(loadState(fakeStorage('{"projects": [], "xp": "many"}')).xp).toBe(0)
    expect(loadState(fakeStorage('{"projects": [], "xp": -5}')).xp).toBe(0)
  })
})

describe('language and titles', () => {
  it('round-trips the language and defaults to Hebrew', () => {
    const storage = fakeStorage()
    saveState(storage, { ...empty, language: 'en' })
    expect(loadState(storage).language).toBe('en')
    expect(loadState(fakeStorage('{"projects": []}')).language).toBe('he')
  })

  it('drops chapters with legacy string titles', () => {
    const legacy = { ...readyProject, chapters: [{ id: 'x', title: 'text', code: 'c', completed: false }] }
    const storage = fakeStorage(JSON.stringify({ projects: [legacy] }))
    expect(loadState(storage).projects[0].chapters).toHaveLength(0)
  })
})

describe('revisions and stored versions', () => {
  it('loads revision history and version snapshots; an interrupted revision loads as failed', () => {
    const stored = {
      ...readyProject,
      revisions: [
        { id: 'r1', instruction: 'bigger', status: 'applied', message: null, createdAt: '' },
        { id: 'r2', instruction: 'smaller', status: 'working', message: null, createdAt: '' },
      ],
      previousVersions: [{ code: '<html>v1</html>', chapters: readyProject.chapters }],
    }
    const loaded = loadState(fakeStorage(JSON.stringify({ projects: [stored] }))).projects[0]
    expect(loaded.revisions.map((r) => r.status)).toEqual(['applied', 'failed'])
    const reverted = { ...stored, revisions: [{ id: 'r3', instruction: 'x', status: 'reverted', message: null, createdAt: '' }] }
    expect(loadState(fakeStorage(JSON.stringify({ projects: [reverted] }))).projects[0].revisions[0].status).toBe('reverted')
    expect(loaded.revisions[1].message).toBe('interrupted')
    expect(loaded.previousVersions[0].code).toBe('<html>v1</html>')
    expect(loaded.previousVersions[0].chapters[0].completed).toBe(true)
  })
})

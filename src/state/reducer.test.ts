import { describe, expect, it } from 'vitest'
import { POINTS_PER_CHAPTER, firstTryStats, initialState, progressPercent, reducer } from './reducer'
import type { Chapter, Project } from './types'

function makeChapter(id: string): Chapter {
  return {
    id, title: { kind: 'markup' }, extraUnits: 0,
    code: '<div></div>', completed: false, lesson: null, attempts: 0,
  }
}

function makeProject(): Project {
  return {
    id: 'p1',
    prompt: 'memory game',
    provider: 'fixture',
    status: 'building',
    code: '',
    chapters: [],
    revisions: [],
    previousVersions: [],
    points: 0,
    error: null,
    createdAt: '2026-08-20T10:00:00.000Z',
  }
}

const answer = (projectId: string, chapterId: string, correct: boolean) =>
  ({ type: 'CHAPTER_ANSWERED', projectId, chapterId, correct }) as const

describe('reducer', () => {
  it('prepends a new project', () => {
    const next = reducer(initialState, { type: 'PROJECT_CREATED', project: makeProject() })
    expect(next.projects).toHaveLength(1)
    expect(next.projects[0].status).toBe('building')
  })

  it('stores code and chapters when the build succeeds', () => {
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

  it('awards points and marks the chapter completed on a correct answer', () => {
    const next = reducer(buildReadyProject(), answer('p1', 'c1', true))
    expect(next.projects[0].points).toBe(POINTS_PER_CHAPTER)
    expect(next.projects[0].chapters[0].completed).toBe(true)
  })

  it('does not award points twice for the same chapter', () => {
    const once = reducer(buildReadyProject(), answer('p1', 'c1', true))
    const twice = reducer(once, answer('p1', 'c1', true))
    expect(twice.projects[0].points).toBe(POINTS_PER_CHAPTER)
  })

  it('counts a wrong answer as an attempt without awarding points', () => {
    const next = reducer(buildReadyProject(), answer('p1', 'c1', false))
    expect(next.projects[0].points).toBe(0)
    expect(next.projects[0].chapters[0].completed).toBe(false)
    expect(next.projects[0].chapters[0].attempts).toBe(1)
  })

  it('completes the chapter on a correct answer after a wrong one, keeping the attempt count', () => {
    const wrong = reducer(buildReadyProject(), answer('p1', 'c1', false))
    const right = reducer(wrong, answer('p1', 'c1', true))
    expect(right.projects[0].points).toBe(POINTS_PER_CHAPTER)
    expect(right.projects[0].chapters[0].attempts).toBe(2)
  })

  it('stores a generated lesson on its chapter only', () => {
    const lesson = {
      difficulty: 'core' as const,
      concept: 'concept',
      example: 'x = 1',
      exercise: {
        kind: 'choice' as const,
        question: 'question?',
        options: ['a', 'b', 'c', 'd'],
        correctIndex: 2,
      },
    }
    const next = reducer(buildReadyProject(), { type: 'LESSON_LOADED', projectId: 'p1', chapterId: 'c1', lesson })
    expect(next.projects[0].chapters[0].lesson).toEqual(lesson)
    expect(next.projects[0].chapters[1].lesson).toBeNull()
  })

  it('computes progress from completed chapters', () => {
    const ready = buildReadyProject()
    expect(progressPercent(ready.projects[0])).toBe(0)
    const answered = reducer(ready, answer('p1', 'c1', true))
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

describe('build failure', () => {
  it('stores the error message for display', () => {
    const created = reducer(initialState, { type: 'PROJECT_CREATED', project: makeProject() })
    const next = reducer(created, { type: 'BUILD_FAILED', projectId: 'p1', message: 'unreachable' })
    expect(next.projects[0].status).toBe('failed')
    expect(next.projects[0].error).toBe('unreachable')
  })

  it('clears a previous error on success', () => {
    const created = reducer(initialState, { type: 'PROJECT_CREATED', project: makeProject() })
    const failed = reducer(created, { type: 'BUILD_FAILED', projectId: 'p1', message: 'failed' })
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
  it('distinguishes first-try success from success after a mistake', () => {
    // c1: correct immediately; c2: wrong, then correct
    const afterC1 = reducer(buildReadyProject(), answer('p1', 'c1', true))
    const wrongC2 = reducer(afterC1, answer('p1', 'c2', false))
    const doneC2 = reducer(wrongC2, answer('p1', 'c2', true))
    expect(firstTryStats(doneC2.projects[0])).toEqual({ firstTry: 1, completed: 2 })
  })

  it('returns zeros for an untouched project', () => {
    expect(firstTryStats(buildReadyProject().projects[0])).toEqual({ firstTry: 0, completed: 0 })
  })
})

describe('project deletion', () => {
  it('removes only the targeted project', () => {
    const one = reducer(initialState, { type: 'PROJECT_CREATED', project: makeProject() })
    const two = reducer(one, { type: 'PROJECT_CREATED', project: { ...makeProject(), id: 'p2' } })
    const next = reducer(two, { type: 'PROJECT_DELETED', projectId: 'p1' })
    expect(next.projects.map((p) => p.id)).toEqual(['p2'])
  })
})

describe('completed chapters are closed', () => {
  it('ignores further answers, including the attempt counter', () => {
    const done = reducer(buildReadyProject(), answer('p1', 'c1', true))
    const again = reducer(done, answer('p1', 'c1', false))
    expect(again).toBe(done)
    expect(firstTryStats(again.projects[0]).firstTry).toBe(1)
  })
})

describe('rebuild', () => {
  it('resets a failed project to its initial state', () => {
    const created = reducer(initialState, { type: 'PROJECT_CREATED', project: makeProject() })
    const failed = reducer(created, { type: 'BUILD_FAILED', projectId: 'p1', message: 'failed' })
    const retried = reducer(failed, { type: 'BUILD_STARTED', projectId: 'p1' })

    expect(retried.projects[0].status).toBe('building')
    expect(retried.projects[0].error).toBeNull()
    expect(retried.projects[0].prompt).toBe('memory game')
  })
})

describe('global XP', () => {
  const lesson = {
    difficulty: 'core' as const,
    concept: 'concept',
    example: 'x = 1',
    exercise: { kind: 'choice' as const, question: 'q?', options: ['a', 'b', 'c', 'd'], correctIndex: 0 },
  }

  function readyWithLesson() {
    return reducer(buildReadyProject(), { type: 'LESSON_LOADED', projectId: 'p1', chapterId: 'c1', lesson })
  }

  it('adds difficulty-based XP plus the first-try bonus', () => {
    const next = reducer(readyWithLesson(), answer('p1', 'c1', true))
    expect(next.xp).toBe(25) // core 20 + bonus 5
  })

  it('adds nothing for a wrong answer, and no bonus for a later correct one', () => {
    const wrong = reducer(readyWithLesson(), answer('p1', 'c1', false))
    expect(wrong.xp).toBe(0)
    const right = reducer(wrong, answer('p1', 'c1', true))
    expect(right.xp).toBe(20)
  })

  it('does not add XP when revisiting a completed chapter', () => {
    const once = reducer(readyWithLesson(), answer('p1', 'c1', true))
    const twice = reducer(once, answer('p1', 'c1', true))
    expect(twice.xp).toBe(once.xp)
  })

  it('treats a chapter without a cached lesson as intro difficulty', () => {
    const next = reducer(buildReadyProject(), answer('p1', 'c1', true))
    expect(next.xp).toBe(15)
  })
})

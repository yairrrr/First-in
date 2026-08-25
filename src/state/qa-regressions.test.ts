import { describe, expect, it } from 'vitest'
import { initialState, reducer } from './reducer'
import type { Chapter, Project, Revision } from './types'

// Regression tests for defects found during the release QA audit.

function chapter(id: string, code: string, over: Partial<Chapter> = {}): Chapter {
  return {
    id, title: { kind: 'function', name: id }, extraUnits: 0, code,
    completed: false, attempts: 0, lesson: null, ...over,
  }
}

function readyProject(chapters: Chapter[]): Project {
  return {
    id: 'p1', prompt: 'x', provider: 'fixture', status: 'ready', code: 'v1',
    chapters, revisions: [], previousVersions: [], points: 0, error: null, createdAt: '',
  }
}

const lesson = {
  difficulty: 'intro' as const, concept: 'c', example: 'e',
  exercise: { kind: 'assemble' as const, instruction: 'i', tokens: ['a', 'b', 'c'] },
}

const revision = (id: string): Revision => ({ id, instruction: id, status: 'working', message: null, createdAt: '' })

describe('stale lesson after a revision (QA-002)', () => {
  it('drops a lesson generated for code the chapter no longer has', () => {
    // Chapter ids are positional, so ch-1 keeps its id while its code changes.
    const s0 = reducer(initialState, { type: 'PROJECT_CREATED', project: readyProject([chapter('ch-1', 'old code')]) })
    const s1 = reducer(s0, { type: 'REVISION_STARTED', projectId: 'p1', revision: revision('r1') })
    const s2 = reducer(s1, {
      type: 'REVISION_SUCCEEDED', projectId: 'p1', revisionId: 'r1', code: 'v2',
      chapters: [chapter('ch-1', 'new code')],
    })
    // The lesson request started before the revision and arrives after it.
    const s3 = reducer(s2, { type: 'LESSON_LOADED', projectId: 'p1', chapterId: 'ch-1', code: 'old code', lesson })
    expect(s3.projects[0].chapters[0].lesson).toBeNull()
    expect(s3).toBe(s2)
  })

  it('still attaches a lesson whose code matches', () => {
    const s0 = reducer(initialState, { type: 'PROJECT_CREATED', project: readyProject([chapter('ch-1', 'same')]) })
    const s1 = reducer(s0, { type: 'LESSON_LOADED', projectId: 'p1', chapterId: 'ch-1', code: 'same', lesson })
    expect(s1.projects[0].chapters[0].lesson).toBe(lesson)
  })
})

describe('state hydration from another tab (QA-001)', () => {
  it('replaces the whole state with the persisted version', () => {
    const local = reducer(initialState, { type: 'PROJECT_CREATED', project: readyProject([]) })
    const fromOtherTab = { projects: [], xp: 45, language: 'en' as const }
    const next = reducer(local, { type: 'STATE_HYDRATED', state: fromOtherTab })
    expect(next).toBe(fromOtherTab)
  })
})

describe('undo history (QA-006)', () => {
  it('marks the undone revision as reverted instead of leaving it applied', () => {
    const s0 = reducer(initialState, { type: 'PROJECT_CREATED', project: readyProject([]) })
    const s1 = reducer(s0, { type: 'REVISION_STARTED', projectId: 'p1', revision: revision('r1') })
    const s2 = reducer(s1, { type: 'REVISION_SUCCEEDED', projectId: 'p1', revisionId: 'r1', code: 'v2', chapters: [] })
    const s3 = reducer(s2, { type: 'REVISION_STARTED', projectId: 'p1', revision: revision('r2') })
    const s4 = reducer(s3, { type: 'REVISION_SUCCEEDED', projectId: 'p1', revisionId: 'r2', code: 'v3', chapters: [] })
    const s5 = reducer(s4, { type: 'REVISION_REVERTED', projectId: 'p1' })
    expect(s5.projects[0].revisions.map((r) => r.status)).toEqual(['applied', 'reverted'])
    expect(s5.projects[0].code).toBe('v2')
    const s6 = reducer(s5, { type: 'REVISION_REVERTED', projectId: 'p1' })
    expect(s6.projects[0].revisions.map((r) => r.status)).toEqual(['reverted', 'reverted'])
    expect(s6.projects[0].code).toBe('v1')
  })
})

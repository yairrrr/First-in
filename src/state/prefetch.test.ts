import { describe, expect, it } from 'vitest'
import { nextChapterToPrefetch } from './useProjectActions'
import type { Chapter, Project } from './types'

function chapter(id: string, over: Partial<Chapter> = {}): Chapter {
  return { id, title: { kind: 'markup' }, extraUnits: 0, code: 'x', completed: false, attempts: 0, lesson: null, ...over }
}

function project(chapters: Chapter[]): Project {
  return {
    id: 'p1', prompt: 'x', provider: 'fixture', status: 'ready',
    code: '<html></html>', chapters, revisions: [], previousVersions: [], points: 0, error: null, createdAt: '',
  }
}

describe('nextChapterToPrefetch', () => {
  const lesson = {
    difficulty: 'intro' as const,
    concept: 'c',
    example: 'x = 1',
    exercise: { kind: 'assemble' as const, instruction: 'i', tokens: ['a', 'b', 'c'] },
  }

  it('without an anchor: the first incomplete chapter with no lesson', () => {
    const p = project([chapter('a', { completed: true }), chapter('b'), chapter('c')])
    expect(nextChapterToPrefetch(p)?.id).toBe('b')
  })

  it('stops when the candidate already has a lesson instead of searching further', () => {
    // This prevents cascades: a loaded lesson never triggers the next one.
    const p = project([chapter('a', { lesson }), chapter('b')])
    expect(nextChapterToPrefetch(p)).toBeNull()
    expect(nextChapterToPrefetch(p, 'a')?.id).toBe('b')
  })

  it('with an anchor: only the adjacent chapter, no look-ahead', () => {
    const p = project([chapter('a', { completed: true }), chapter('b', { lesson }), chapter('c')])
    expect(nextChapterToPrefetch(p, 'a')).toBeNull()
  })

  it('with an anchor: starts from the chapter after it', () => {
    const p = project([chapter('a'), chapter('b'), chapter('c')])
    expect(nextChapterToPrefetch(p, 'a')?.id).toBe('b')
  })

  it('returns null when there is nothing to prefetch', () => {
    const p = project([chapter('a', { completed: true }), chapter('b', { lesson })])
    expect(nextChapterToPrefetch(p)).toBeNull()
    expect(nextChapterToPrefetch(p, 'b')).toBeNull()
  })

  it('returns null for an unknown anchor', () => {
    const p = project([chapter('a')])
    expect(nextChapterToPrefetch(p, 'unknown')).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { nextChapterToPrefetch } from './useProjectActions'
import type { Chapter, Project } from './types'

function chapter(id: string, over: Partial<Chapter> = {}): Chapter {
  return { id, title: { kind: 'markup' }, extraUnits: 0, code: 'x', completed: false, attempts: 0, lesson: null, ...over }
}

function project(chapters: Chapter[]): Project {
  return {
    id: 'p1', prompt: 'x', provider: 'fixture', status: 'ready',
    code: '<html></html>', chapters, points: 0, error: null, createdAt: '',
  }
}

describe('nextChapterToPrefetch', () => {
  const lesson = {
    difficulty: 'intro' as const,
    concept: 'c',
    exercise: { kind: 'assemble' as const, instruction: 'i', tokens: ['a', 'b', 'c'] },
  }

  it('בלי נקודת מוצא: הפרק הראשון שטרם הושלם ואין לו שיעור', () => {
    const p = project([chapter('a', { completed: true }), chapter('b'), chapter('c')])
    expect(nextChapterToPrefetch(p)?.id).toBe('b')
  })

  it('כשלמועמד כבר יש שיעור — עוצר ולא ממשיך לפרק הבא', () => {
    // זה מה שמונע שרשרת: שיעור שנטען לא מצית את הבא אחריו.
    const p = project([chapter('a', { lesson }), chapter('b')])
    expect(nextChapterToPrefetch(p)).toBeNull()
    expect(nextChapterToPrefetch(p, 'a')?.id).toBe('b')
  })

  it('עם נקודת מוצא: רק הפרק הצמוד, לא מחפשים קדימה', () => {
    const p = project([chapter('a', { completed: true }), chapter('b', { lesson }), chapter('c')])
    expect(nextChapterToPrefetch(p, 'a')).toBeNull()
  })

  it('עם נקודת מוצא: מתחיל מהפרק שאחריה', () => {
    const p = project([chapter('a'), chapter('b'), chapter('c')])
    expect(nextChapterToPrefetch(p, 'a')?.id).toBe('b')
  })

  it('מחזיר null כשאין מה להטעין', () => {
    const p = project([chapter('a', { completed: true }), chapter('b', { lesson })])
    expect(nextChapterToPrefetch(p)).toBeNull()
    expect(nextChapterToPrefetch(p, 'b')).toBeNull()
  })

  it('נקודת מוצא לא מוכרת: לא מטעין כלום', () => {
    const p = project([chapter('a')])
    expect(nextChapterToPrefetch(p, 'זר')).toBeNull()
  })
})

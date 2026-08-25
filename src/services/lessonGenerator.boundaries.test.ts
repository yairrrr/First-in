import { describe, expect, it } from 'vitest'
import {
  MAX_ASSEMBLED_LENGTH,
  MAX_CONCEPT_CHARS,
  MAX_EXAMPLE_CHARS,
  MAX_OPTION_CHARS,
  MAX_QUESTION_CHARS,
  MAX_TOKENS,
  MIN_TOKENS,
  parseLesson,
} from './lessonGenerator'

// Boundary tests: values exactly at each limit pass, one past it fails.

const choice = {
  concept: 'c', example: 'e', question: 'q?', options: ['a', 'b', 'c', 'd'], correctIndex: 0,
}
const assemble = { concept: 'c', example: 'e', instruction: 'i', tokens: ['a', 'b', 'c'] }

const asChoice = (value: unknown) => parseLesson('choice', 'core', JSON.stringify(value))
const asAssemble = (value: unknown) => parseLesson('assemble', 'intro', JSON.stringify(value))

describe('length limits', () => {
  it('concept', () => {
    expect(() => asChoice({ ...choice, concept: 'x'.repeat(MAX_CONCEPT_CHARS) })).not.toThrow()
    expect(() => asChoice({ ...choice, concept: 'x'.repeat(MAX_CONCEPT_CHARS + 1) })).toThrow()
  })

  it('example characters and lines', () => {
    expect(() => asChoice({ ...choice, example: 'x'.repeat(MAX_EXAMPLE_CHARS) })).not.toThrow()
    expect(() => asChoice({ ...choice, example: 'x'.repeat(MAX_EXAMPLE_CHARS + 1) })).toThrow()
    expect(() => asChoice({ ...choice, example: 'a\nb\nc' })).not.toThrow()
    expect(() => asChoice({ ...choice, example: 'a\nb\nc\nd' })).toThrow()
  })

  it('question', () => {
    expect(() => asChoice({ ...choice, question: 'x'.repeat(MAX_QUESTION_CHARS) })).not.toThrow()
    expect(() => asChoice({ ...choice, question: 'x'.repeat(MAX_QUESTION_CHARS + 1) })).toThrow()
  })

  it('option', () => {
    expect(() => asChoice({ ...choice, options: ['x'.repeat(MAX_OPTION_CHARS), 'b', 'c', 'd'] })).not.toThrow()
    expect(() => asChoice({ ...choice, options: ['x'.repeat(MAX_OPTION_CHARS + 1), 'b', 'c', 'd'] })).toThrow()
  })

  it('correct index range', () => {
    expect(() => asChoice({ ...choice, correctIndex: -1 })).toThrow()
    expect(() => asChoice({ ...choice, correctIndex: 0 })).not.toThrow()
    expect(() => asChoice({ ...choice, correctIndex: 3 })).not.toThrow()
    expect(() => asChoice({ ...choice, correctIndex: 4 })).toThrow()
    expect(() => asChoice({ ...choice, correctIndex: 1.5 })).toThrow()
  })

  it('token count', () => {
    const tokens = (n: number) => Array.from({ length: n }, (_, i) => `t${i}`)
    expect(() => asAssemble({ ...assemble, tokens: tokens(MIN_TOKENS - 1) })).toThrow()
    expect(() => asAssemble({ ...assemble, tokens: tokens(MIN_TOKENS) })).not.toThrow()
    expect(() => asAssemble({ ...assemble, tokens: tokens(MAX_TOKENS) })).not.toThrow()
    expect(() => asAssemble({ ...assemble, tokens: tokens(MAX_TOKENS + 1) })).toThrow()
  })

  it('assembled line length', () => {
    // three tokens joined by two spaces
    const fill = (total: number) => {
      const per = Math.floor((total - 2) / 3)
      const rest = total - 2 - per * 2
      return ['x'.repeat(per), 'x'.repeat(per), 'x'.repeat(rest)]
    }
    expect(() => asAssemble({ ...assemble, tokens: fill(MAX_ASSEMBLED_LENGTH) })).not.toThrow()
    expect(() => asAssemble({ ...assemble, tokens: fill(MAX_ASSEMBLED_LENGTH + 1) })).toThrow()
  })

  it('whitespace-only and non-string tokens are rejected', () => {
    expect(() => asAssemble({ ...assemble, tokens: ['a', '   ', 'c'] })).toThrow()
    expect(() => asAssemble({ ...assemble, tokens: ['a', 1, 'c'] })).toThrow()
  })
})

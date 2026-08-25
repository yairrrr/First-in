import { describe, expect, it } from 'vitest'
import {
  ASSEMBLE_SCHEMA,
  CHOICE_SCHEMA,
  LESSON_SYSTEM_PROMPT,
  LessonError,
  buildPrompt,
  exerciseKindFor,
  generateLesson,
  parseLesson,
} from './lessonGenerator'
import type { LlmProvider, LlmRequest } from '../llm/types'

const validChoice = {
  concept: 'The function checks whether two cards match.',
  example: 'if (card1.dataset.symbol === card2.dataset.symbol) {',
  question: 'What happens when the second card does not match?',
  options: ['Both cards flip back after a delay', 'The card stays open', 'The counter resets', 'The game ends'],
  correctIndex: 0,
}

const validAssemble = {
  concept: 'To change what is shown on screen, the code looks up an element by its id.',
  example: "const moveDisplay = document.getElementById('move-count');",
  instruction: 'Assemble the line that resets the move counter on screen',
  tokens: ['moveDisplay', '.innerText', '=', 'moves;'],
}

const asChoice = (value: unknown) => parseLesson('choice', 'core', JSON.stringify(value))
const asAssemble = (value: unknown) => parseLesson('assemble', 'intro', JSON.stringify(value))

describe('parseLesson: multiple choice', () => {
  it('accepts a valid lesson and stamps the difficulty', () => {
    const lesson = asChoice(validChoice)
    expect(lesson.difficulty).toBe('core')
    expect(lesson.concept).toBe(validChoice.concept)
    expect(lesson.exercise.kind).toBe('choice')
    if (lesson.exercise.kind === 'choice') {
      expect(lesson.exercise.options).toHaveLength(4)
      expect(lesson.exercise.correctIndex).toBe(0)
    }
  })

  it('rejects non-JSON and missing fields', () => {
    expect(() => parseLesson('choice', 'core', 'not json')).toThrow(LessonError)
    expect(() => asChoice({ ...validChoice, concept: '' })).toThrow(/concept/)
    expect(() => asChoice({ ...validChoice, question: ' ' })).toThrow(/question/)
  })

  it('rejects the wrong number of options, empty options and duplicates', () => {
    expect(() => asChoice({ ...validChoice, options: validChoice.options.slice(0, 3) })).toThrow(/4/)
    expect(() => asChoice({ ...validChoice, options: ['a', 'a', 'b', 'c'] })).toThrow(/Duplicate/)
  })

  it('rejects an invalid correct index', () => {
    expect(() => asChoice({ ...validChoice, correctIndex: 4 })).toThrow(/out of range/)
    expect(() => asChoice({ ...validChoice, correctIndex: '0' })).toThrow(LessonError)
  })
})

describe('parseLesson: assemble', () => {
  it('accepts a valid exercise and trims tokens', () => {
    const lesson = asAssemble(validAssemble)
    expect(lesson.difficulty).toBe('intro')
    expect(lesson.exercise.kind).toBe('assemble')
    if (lesson.exercise.kind === 'assemble') {
      expect(lesson.exercise.tokens).toEqual(['moveDisplay', '.innerText', '=', 'moves;'])
    }
  })

  it('rejects too few or too many tokens', () => {
    expect(() => asAssemble({ ...validAssemble, tokens: ['a', 'b'] })).toThrow(/tokens/)
    expect(() => asAssemble({ ...validAssemble, tokens: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] })).toThrow(/tokens/)
  })

  it('rejects an assembled line that is too long', () => {
    const long = { ...validAssemble, tokens: ['x'.repeat(40), 'y'.repeat(40), 'z'.repeat(40)] }
    expect(() => asAssemble(long)).toThrow(/too long/)
  })

  it('rejects a missing instruction', () => {
    expect(() => asAssemble({ ...validAssemble, instruction: '' })).toThrow(/instruction/)
  })
})

describe('exerciseKindFor', () => {
  it('assembles at intro, asks at deep, alternates in between', () => {
    expect(exerciseKindFor('intro', 0)).toBe('assemble')
    expect(exerciseKindFor('intro', 5)).toBe('assemble')
    expect(exerciseKindFor('deep', 6)).toBe('choice')
    expect(exerciseKindFor('core', 2)).toBe('choice')
    expect(exerciseKindFor('core', 3)).toBe('assemble')
  })
})

describe('code example', () => {
  it('is required and limited to three short lines', () => {
    expect(() => asChoice({ ...validChoice, example: '' })).toThrow(/example/)
    expect(() => asChoice({ ...validChoice, example: 'a\nb\nc\nd' })).toThrow(/3 short lines/)
    expect(asChoice(validChoice).example).toBe(validChoice.example)
  })

  it('is required by both schemas', () => {
    expect(CHOICE_SCHEMA.required as string[]).toContain('example')
    expect(ASSEMBLE_SCHEMA.required as string[]).toContain('example')
  })
})

describe('readability', () => {
  it('rejects an overly long question', () => {
    expect(() => asChoice({ ...validChoice, question: 'what '.repeat(60) })).toThrow(/too long/)
  })

  it('rejects an overly long option', () => {
    expect(() => asChoice({ ...validChoice, options: ['x'.repeat(80), 'b', 'c', 'd'] })).toThrow(/too long/)
  })

  it('states the readability rules in the system prompt', () => {
    expect(LESSON_SYSTEM_PROMPT).toContain('at most 15 words')
    expect(LESSON_SYSTEM_PROMPT).toContain('Never chain conditions')
  })
})

describe('generateLesson and buildPrompt', () => {
  function providerReturning(text: string) {
    const seen: LlmRequest[] = []
    const provider: LlmProvider = {
      name: 'stub',
      async complete(request) {
        seen.push(request)
        return { text }
      },
    }
    return { provider, seen }
  }

  it('selects the schema by exercise kind and sends the system prompt', async () => {
    const { provider, seen } = providerReturning(JSON.stringify(validAssemble))
    await generateLesson(provider, {
      title: 'Page structure',
      code: '<div></div>',
      language: 'en',
      difficulty: 'intro',
      kind: 'assemble',
    })
    expect(seen[0].system).toBe(LESSON_SYSTEM_PROMPT)
    expect(seen[0].schema).toBe(ASSEMBLE_SCHEMA)

    const choice = providerReturning(JSON.stringify(validChoice))
    await generateLesson(choice.provider, {
      title: 'Function',
      code: 'f()',
      language: 'en',
      difficulty: 'deep',
      kind: 'choice',
    })
    expect(choice.seen[0].schema).toBe(CHOICE_SCHEMA)
  })

  it('forbids jargon and limits the example at the intro tier', () => {
    const prompt = buildPrompt({ title: 'Chapter', code: 'x', language: 'he', difficulty: 'intro', kind: 'assemble' })
    expect(prompt).toContain('no technical jargon')
    expect(prompt).toContain('exactly ONE short line')
    expect(prompt).toContain('tap the shuffled tokens')
  })

  it('injects tier-specific instructions', () => {
    const base = { title: 'Chapter', code: 'x', language: 'he', kind: 'choice' } as const
    expect(buildPrompt({ ...base, difficulty: 'core' })).toContain('not an expert')
    expect(buildPrompt({ ...base, difficulty: 'deep' })).toContain('one concrete consequence')
  })
})

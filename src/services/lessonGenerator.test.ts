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
  concept: 'הפונקציה בודקת אם שני קלפים תואמים.',
  example: 'if (card1.dataset.symbol === card2.dataset.symbol) {',
  question: 'מה קורה כשהקלף השני אינו תואם?',
  options: ['שני הקלפים נסגרים אחרי השהיה', 'הקלף נשאר פתוח', 'המונה מתאפס', 'המשחק נגמר'],
  correctIndex: 0,
}

const validAssemble = {
  concept: 'כדי לשנות מה שכתוב על המסך, הקוד פונה לאזור לפי השם שלו.',
  example: "const moveDisplay = document.getElementById('move-count');",
  instruction: 'הרכב את השורה שמאפסת את מונה המהלכים על המסך',
  tokens: ['moveDisplay', '.innerText', '=', 'moves;'],
}

describe('parseLesson — שאלה אמריקאית', () => {
  it('מקבל שיעור תקין ומחתים את הרמה', () => {
    const lesson = parseLesson('choice', 'core', JSON.stringify(validChoice))
    expect(lesson.difficulty).toBe('core')
    expect(lesson.concept).toBe(validChoice.concept)
    expect(lesson.exercise.kind).toBe('choice')
    if (lesson.exercise.kind === 'choice') {
      expect(lesson.exercise.options).toHaveLength(4)
      expect(lesson.exercise.correctIndex).toBe(0)
    }
  })

  it('דוחה טקסט שאינו JSON או שדות חסרים', () => {
    expect(() => parseLesson('choice', 'core', 'לא JSON')).toThrow(LessonError)
    expect(() => parseLesson('choice', 'core', JSON.stringify({ ...validChoice, concept: '' }))).toThrow(/עיקרון/)
    expect(() => parseLesson('choice', 'core', JSON.stringify({ ...validChoice, question: ' ' }))).toThrow(/שאלה/)
  })

  it('דוחה אפשרויות שגויות במספרן, ריקות או כפולות', () => {
    const three = { ...validChoice, options: validChoice.options.slice(0, 3) }
    expect(() => parseLesson('choice', 'core', JSON.stringify(three))).toThrow(/4/)
    const dup = { ...validChoice, options: ['א', 'א', 'ב', 'ג'] }
    expect(() => parseLesson('choice', 'core', JSON.stringify(dup))).toThrow(/זהות/)
  })

  it('דוחה מיקום תשובה לא תקין', () => {
    expect(() => parseLesson('choice', 'core', JSON.stringify({ ...validChoice, correctIndex: 4 }))).toThrow(/תחום/)
    expect(() => parseLesson('choice', 'core', JSON.stringify({ ...validChoice, correctIndex: '0' }))).toThrow(LessonError)
  })
})

describe('parseLesson — הרכבה', () => {
  it('מקבל תרגיל הרכבה תקין ומנקה רווחים', () => {
    const lesson = parseLesson('assemble', 'intro', JSON.stringify(validAssemble))
    expect(lesson.difficulty).toBe('intro')
    expect(lesson.exercise.kind).toBe('assemble')
    if (lesson.exercise.kind === 'assemble') {
      expect(lesson.exercise.tokens).toEqual(['moveDisplay', '.innerText', '=', 'moves;'])
    }
  })

  it('דוחה מעט מדי או יותר מדי משבצות', () => {
    const two = { ...validAssemble, tokens: ['a', 'b'] }
    expect(() => parseLesson('assemble', 'intro', JSON.stringify(two))).toThrow(/משבצות/)
    const seven = { ...validAssemble, tokens: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }
    expect(() => parseLesson('assemble', 'intro', JSON.stringify(seven))).toThrow(/משבצות/)
  })

  it('דוחה שורה מורכבת ארוכה מדי — התרגיל אמור להיות קליל', () => {
    const long = { ...validAssemble, tokens: ['x'.repeat(40), 'y'.repeat(40), 'z'.repeat(40)] }
    expect(() => parseLesson('assemble', 'intro', JSON.stringify(long))).toThrow(/ארוכה/)
  })

  it('דוחה הוראה חסרה', () => {
    expect(() =>
      parseLesson('assemble', 'intro', JSON.stringify({ ...validAssemble, instruction: '' })),
    ).toThrow(/הוראת/)
  })
})

describe('exerciseKindFor', () => {
  it('פתיחה בהרכבה, עומק בשאלות, ובאמצע לסירוגין', () => {
    expect(exerciseKindFor('intro', 0)).toBe('assemble')
    expect(exerciseKindFor('intro', 5)).toBe('assemble')
    expect(exerciseKindFor('deep', 6)).toBe('choice')
    expect(exerciseKindFor('core', 2)).toBe('choice')
    expect(exerciseKindFor('core', 3)).toBe('assemble')
  })
})

describe('דוגמת קוד', () => {
  it('נדרשת, ומוגבלת לשלוש שורות קצרות', () => {
    expect(() => parseLesson('choice', 'core', JSON.stringify({ ...validChoice, example: '' }))).toThrow(/דוגמת/)
    const long = { ...validChoice, example: 'a\nb\nc\nd' }
    expect(() => parseLesson('choice', 'core', JSON.stringify(long))).toThrow(/שלוש שורות/)
    expect(parseLesson('choice', 'core', JSON.stringify(validChoice)).example).toBe(validChoice.example)
  })

  it('הסכמות דורשות דוגמה', () => {
    expect((CHOICE_SCHEMA.required as string[])).toContain('example')
    expect((ASSEMBLE_SCHEMA.required as string[])).toContain('example')
  })
})

describe('קריאות', () => {
  it('דוחה שאלה ארוכה ומסובכת', () => {
    const long = { ...validChoice, question: 'מה '.repeat(60) }
    expect(() => parseLesson('choice', 'core', JSON.stringify(long))).toThrow(/מסובכת/)
  })

  it('דוחה אפשרות ארוכה', () => {
    const long = { ...validChoice, options: ['x'.repeat(80), 'ב', 'ג', 'ד'] }
    expect(() => parseLesson('choice', 'core', JSON.stringify(long))).toThrow(/קצרות/)
  })

  it('כללי הקריאות נמצאים בהנחיית המערכת', () => {
    expect(LESSON_SYSTEM_PROMPT).toContain('at most 15 words')
    expect(LESSON_SYSTEM_PROMPT).toContain('Never chain conditions')
  })
})

describe('generateLesson ו-buildPrompt', () => {
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

  it('בוחר סכמה לפי סוג התרגיל ושולח את ההנחיה', async () => {
    const { provider, seen } = providerReturning(JSON.stringify(validAssemble))
    await generateLesson(provider, {
      title: 'מבנה העמוד',
      code: '<div></div>',
      language: 'he',
      difficulty: 'intro',
      kind: 'assemble',
    })
    expect(seen[0].system).toBe(LESSON_SYSTEM_PROMPT)
    expect(seen[0].schema).toBe(ASSEMBLE_SCHEMA)

    const choice = providerReturning(JSON.stringify(validChoice))
    await generateLesson(choice.provider, {
      title: 'פונקציה',
      code: 'f()',
      language: 'he',
      difficulty: 'deep',
      kind: 'choice',
    })
    expect(choice.seen[0].schema).toBe(CHOICE_SCHEMA)
  })

  it('מדרגת intro אוסרת ז\'רגון ומגבילה קוד לשורה קצרה', () => {
    const prompt = buildPrompt({
      title: 'פרק', code: 'x', language: 'he', difficulty: 'intro', kind: 'assemble',
    })
    expect(prompt).toContain('no technical jargon')
    expect(prompt).toContain('exactly ONE short line')
    expect(prompt).toContain('tap the shuffled tokens')
  })

  it('כל מדרגה מזריקה הנחיה משלה', () => {
    const base = { title: 'פרק', code: 'x', language: 'he', kind: 'choice' } as const
    expect(buildPrompt({ ...base, difficulty: 'core' })).toContain('not an expert')
    expect(buildPrompt({ ...base, difficulty: 'deep' })).toContain('one concrete consequence')
  })
})

import { describe, expect, it } from 'vitest'
import {
  LESSON_SCHEMA,
  LESSON_SYSTEM_PROMPT,
  LessonError,
  buildPrompt,
  generateLesson,
  parseLesson,
} from './lessonGenerator'
import type { LlmProvider, LlmRequest } from '../llm/types'

const valid = {
  explanation: 'הפונקציה הופכת קלף ובודקת זוג.',
  question: 'מה קורה כשהקלף השני אינו תואם?',
  options: ['שני הקלפים נסגרים אחרי השהיה', 'הקלף נשאר פתוח', 'המונה מתאפס', 'המשחק נגמר'],
  correctIndex: 0,
}

describe('parseLesson', () => {
  it('מקבל שיעור תקין', () => {
    const lesson = parseLesson(JSON.stringify(valid))
    expect(lesson.explanation).toBe(valid.explanation)
    expect(lesson.question.options).toHaveLength(4)
    expect(lesson.question.correctIndex).toBe(0)
  })

  it('דוחה טקסט שאינו JSON', () => {
    expect(() => parseLesson('הנה השאלה שלך!')).toThrow(LessonError)
  })

  it('דוחה שדות חסרים או ריקים', () => {
    expect(() => parseLesson(JSON.stringify({ ...valid, explanation: '' }))).toThrow(/הסבר/)
    expect(() => parseLesson(JSON.stringify({ ...valid, question: '  ' }))).toThrow(/שאלה/)
  })

  it('דוחה מספר אפשרויות שגוי', () => {
    expect(() => parseLesson(JSON.stringify({ ...valid, options: valid.options.slice(0, 3) }))).toThrow(
      /4/,
    )
    expect(() =>
      parseLesson(JSON.stringify({ ...valid, options: [...valid.options, 'חמישית'] })),
    ).toThrow(/4/)
  })

  it('דוחה אפשרות ריקה ואפשרויות כפולות', () => {
    const withEmpty = { ...valid, options: ['', ...valid.options.slice(1)] }
    expect(() => parseLesson(JSON.stringify(withEmpty))).toThrow(LessonError)

    const withDuplicate = { ...valid, options: [valid.options[0], valid.options[0], 'ג', 'ד'] }
    expect(() => parseLesson(JSON.stringify(withDuplicate))).toThrow(/זהות/)
  })

  it('דוחה מיקום תשובה מחוץ לתחום או לא שלם', () => {
    expect(() => parseLesson(JSON.stringify({ ...valid, correctIndex: 4 }))).toThrow(/תחום/)
    expect(() => parseLesson(JSON.stringify({ ...valid, correctIndex: -1 }))).toThrow(/תחום/)
    expect(() => parseLesson(JSON.stringify({ ...valid, correctIndex: 1.5 }))).toThrow(LessonError)
    expect(() => parseLesson(JSON.stringify({ ...valid, correctIndex: '0' }))).toThrow(LessonError)
  })
})

describe('generateLesson', () => {
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

  it('שולח את ההנחיה, מבקש JSON, ומחזיר שיעור', async () => {
    const { provider, seen } = providerReturning(JSON.stringify(valid))
    const lesson = await generateLesson(provider, {
      title: 'פונקציה: flipCard',
      code: 'function flipCard() {}',
      language: 'he',
    })

    expect(lesson.question.text).toBe(valid.question)
    expect(seen[0].system).toBe(LESSON_SYSTEM_PROMPT)
    expect(seen[0].schema).toBe(LESSON_SCHEMA)
    expect(seen[0].prompt).toContain('flipCard')
  })

  it('מנחה לכתוב בעברית ולשמור מזהים באנגלית', () => {
    const prompt = buildPrompt({ title: 'פרק', code: 'x', language: 'he' })
    expect(prompt).toContain('Hebrew')
    expect(prompt).toContain('identifiers in English')
  })
})

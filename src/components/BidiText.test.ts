import { describe, expect, it } from 'vitest'
import { splitBidiParts } from './BidiText'

describe('splitBidiParts', () => {
  it('מבודד בורר CSS יחד עם הנקודתיים שלו', () => {
    expect(splitBidiParts('עיצוב: :root ועוד 4 כללים')).toEqual([
      { text: 'עיצוב: ', latin: false },
      { text: ':root', latin: true },
      { text: ' ועוד 4 כללים', latin: false },
    ])
  })

  it('מבודד שם פונקציה', () => {
    expect(splitBidiParts('פונקציה: flipCard')).toEqual([
      { text: 'פונקציה: ', latin: false },
      { text: 'flipCard', latin: true },
    ])
  })

  it('מבודד בורר עם מקף ונקודה', () => {
    const parts = splitBidiParts('עיצוב: .card-back ועוד')
    expect(parts[1]).toEqual({ text: '.card-back', latin: true })
  })

  it('מחזיר טקסט עברי טהור כחלק אחד', () => {
    expect(splitBidiParts('מבנה העמוד')).toEqual([{ text: 'מבנה העמוד', latin: false }])
  })

  it('מרכיב בחזרה בדיוק את הטקסט המקורי', () => {
    const title = 'עיצוב: .todo-item:last-child ועוד 6 כללים'
    expect(splitBidiParts(title).map((p) => p.text).join('')).toBe(title)
  })
})

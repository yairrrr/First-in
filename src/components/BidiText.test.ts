import { describe, expect, it } from 'vitest'
import { splitBidiParts } from './BidiText'

describe('splitBidiParts', () => {
  it('isolates a CSS selector together with its leading colon', () => {
    expect(splitBidiParts('עיצוב: :root ועוד 4 כללים')).toEqual([
      { text: 'עיצוב: ', latin: false },
      { text: ':root', latin: true },
      { text: ' ועוד 4 כללים', latin: false },
    ])
  })

  it('isolates a function name', () => {
    expect(splitBidiParts('פונקציה: flipCard')).toEqual([
      { text: 'פונקציה: ', latin: false },
      { text: 'flipCard', latin: true },
    ])
  })

  it('isolates a selector with a dot and a hyphen', () => {
    const parts = splitBidiParts('עיצוב: .card-back ועוד')
    expect(parts[1]).toEqual({ text: '.card-back', latin: true })
  })

  it('returns pure Hebrew text as a single part', () => {
    expect(splitBidiParts('מבנה העמוד')).toEqual([{ text: 'מבנה העמוד', latin: false }])
  })

  it('reassembles to exactly the original text', () => {
    const title = 'עיצוב: .todo-item:last-child ועוד 6 כללים'
    expect(splitBidiParts(title).map((p) => p.text).join('')).toBe(title)
  })
})

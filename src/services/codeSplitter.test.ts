import { describe, expect, it } from 'vitest'
import {
  MAX_CHAPTERS,
  extractMarkup,
  extractTagContent,
  splitCode,
  splitCssRules,
  splitJsUnits,
} from './codeSplitter'
import memoryHtml from '../llm/fixtures/samples/memory.html?raw'
import todoHtml from '../llm/fixtures/samples/todo.html?raw'
import { chapterTitleText } from '../i18n/chapterTitle'

const he = (chapter: Parameters<typeof chapterTitleText>[1]) => chapterTitleText('he', chapter)

describe('extractTagContent', () => {
  it('extracts content from a tag with attributes', () => {
    expect(extractTagContent('<script type="module">let a = 1;</script>', 'script')).toBe('let a = 1;')
  })

  it('concatenates multiple tags of the same kind', () => {
    const html = '<style>a {}</style><body><style>b {}</style></body>'
    expect(extractTagContent(html, 'style')).toBe('a {}\n\nb {}')
  })

  it('returns an empty string when the tag is absent', () => {
    expect(extractTagContent('<p>hello</p>', 'script')).toBe('')
  })
})

describe('extractMarkup', () => {
  it('returns the body without style and script blocks', () => {
    const html = '<html><head><style>a {}</style></head><body><h1>hi</h1><script>x();</script></body></html>'
    expect(extractMarkup(html)).toBe('<h1>hi</h1>')
  })
})

describe('splitCssRules', () => {
  it('splits top-level rules and keeps the selector', () => {
    const rules = splitCssRules('body { margin: 0; }\n.card { display: flex; }')
    expect(rules.map((r) => r.selector)).toEqual(['body', '.card'])
  })

  it('keeps an @media rule intact', () => {
    const rules = splitCssRules('@media (max-width: 600px) { body { color: red; } .a { color: blue; } }')
    expect(rules).toHaveLength(1)
    expect(rules[0].selector).toBe('@media (max-width: 600px)')
  })

  it('ignores braces inside comments', () => {
    const rules = splitCssRules('/* } not a real end */ body { margin: 0; }')
    expect(rules).toHaveLength(1)
    expect(rules[0].selector).toBe('body')
  })
})

describe('splitJsUnits', () => {
  it('splits top-level statements', () => {
    const units = splitJsUnits('let a = 1;\nlet b = 2;')
    expect(units.map((u) => u.code)).toEqual(['let a = 1;', 'let b = 2;'])
  })

  it('detects function declarations and function assignments', () => {
    const units = splitJsUnits('function run() { go(); }\nconst go = () => { done(); };')
    expect(units.map((u) => u.name)).toEqual(['run', 'go'])
  })

  it('handles template literals with braces inside', () => {
    const js = 'const label = `${count} ${count === 1 ? "item" : "items"}`;\nlet after = 1;'
    const units = splitJsUnits(js)
    expect(units).toHaveLength(2)
    expect(units[1].code).toBe('let after = 1;')
  })

  it('does not split inside a callback argument', () => {
    const js = 'button.addEventListener("click", () => { a(); b(); });\nlet after = 1;'
    const units = splitJsUnits(js)
    expect(units).toHaveLength(2)
    expect(units[1].code).toBe('let after = 1;')
  })

  it('does not split on semicolons inside a for header', () => {
    const js = 'for (let i = 0; i < 3; i++) { go(i); }\nlet after = 1;'
    expect(splitJsUnits(js)).toHaveLength(2)
  })

  it('keeps the semicolon after an object literal in the same unit', () => {
    const units = splitJsUnits('const config = { a: 1 };')
    expect(units).toHaveLength(1)
    expect(units[0].code).toBe('const config = { a: 1 };')
  })

  it('ignores boundary-like characters inside comments', () => {
    const units = splitJsUnits('// not an end; nor here }\nlet a = 1;')
    expect(units).toHaveLength(1)
    expect(units[0].code).toContain('let a = 1;')
  })
})

describe('splitCode on real model output', () => {
  const samples = [
    { name: 'memory', html: memoryHtml, functions: ['initGame', 'flipCard', 'resetGame'] },
    { name: 'todo', html: todoHtml, functions: ['updateCounter', 'createTodo'] },
  ]

  for (const sample of samples) {
    describe(sample.name, () => {
      const chapters = splitCode(sample.html)

      it('produces a reasonable number of chapters', () => {
        expect(chapters.length).toBeGreaterThanOrEqual(5)
        expect(chapters.length).toBeLessThanOrEqual(MAX_CHAPTERS)
      })

      it('numbers chapters sequentially with unique ids', () => {
        expect(chapters.map((c) => c.id)).toEqual(chapters.map((_, i) => `ch-${i + 1}`))
      })

      it('has no empty chapter and no empty title', () => {
        for (const chapter of chapters) {
          expect(chapter.code.trim().length).toBeGreaterThan(0)
          expect(he(chapter).trim().length).toBeGreaterThan(0)
        }
      })

      it('starts every chapter as incomplete', () => {
        expect(chapters.every((c) => !c.completed)).toBe(true)
      })

      it('places every function in exactly one chapter', () => {
        for (const name of sample.functions) {
          const holders = chapters.filter((c) => c.code.includes(`function ${name}`))
          expect(holders, name).toHaveLength(1)
        }
      })

      it('starts with the markup chapter', () => {
        expect(chapters[0].title.kind).toBe('markup')
        expect(he(chapters[0])).toBe('מבנה העמוד')
      })

      it('contains style and function chapters with localized titles', () => {
        expect(chapters.some((c) => c.title.kind === 'css')).toBe(true)
        expect(chapters.some((c) => c.title.kind === 'function')).toBe(true)
        const fn = chapters.find((c) => c.title.kind === 'function')!
        expect(he(fn)).toMatch(/^פונקציה: /)
        expect(chapterTitleText('en', fn)).toMatch(/^Function: /)
      })
    })
  }

  it('respects the chapter cap even for a huge stylesheet', () => {
    const rules = Array.from({ length: 120 }, (_, i) => `.rule-${i} { color: #00${i % 10}; padding: ${i}px; }`)
    const html = `<html><body><p>hi</p><style>${rules.join('\n')}</style></body></html>`
    expect(splitCode(html).length).toBeLessThanOrEqual(MAX_CHAPTERS)
  })

  it('declares absorbed units in the title, in both languages', () => {
    const chapters = splitCode(memoryHtml)
    const swallower = chapters.find((c) => c.code.includes('function resetGame'))!
    expect(swallower.extraUnits).toBeGreaterThan(0)
    expect(he(swallower)).toContain('ועוד')
    expect(chapterTitleText('en', swallower)).toContain('more unit')
  })
})

import { describe, expect, it } from 'vitest'
import { highlight } from './highlight'

const joined = (code: string, lang: 'html' | 'css' | 'js') =>
  highlight(code, lang).map((t) => t.text).join('')

describe('highlight', () => {
  it('preserves the original text exactly in every language', () => {
    const js = 'const x = "a;b"; // note\nfunction go() { return x }'
    const css = 'body { color: white; }\n@media (max-width: 600px) { .a { margin: 0 } }'
    const html = '<button onclick="resetGame()">Restart</button><!-- c -->'
    expect(joined(js, 'js')).toBe(js)
    expect(joined(css, 'css')).toBe(css)
    expect(joined(html, 'html')).toBe(html)
  })

  it('JS: keywords, strings, numbers, functions and comments', () => {
    const tokens = highlight('const n = 3; // hi\nflip("a")', 'js')
    const by = (type: string) => tokens.filter((t) => t.type === type).map((t) => t.text)
    expect(by('keyword')).toEqual(['const'])
    expect(by('number')).toEqual(['3'])
    expect(by('comment')).toEqual(['// hi'])
    expect(by('fn')).toEqual(['flip'])
    expect(by('string')).toEqual(['"a"'])
  })

  it('JS: a semicolon inside a string is not punctuation', () => {
    const tokens = highlight('let s = "a;b";', 'js')
    expect(tokens.find((t) => t.type === 'string')?.text).toBe('"a;b"')
  })

  it('CSS: selector, property, numeric value and color', () => {
    const tokens = highlight('.card { width: 80px; color: #333; }', 'css')
    const by = (type: string) => tokens.filter((t) => t.type === type).map((t) => t.text)
    expect(by('selector')).toEqual(['.card '])
    expect(by('property')).toEqual(['width', 'color'])
    expect(by('number')).toEqual(['80px', '#333'])
  })

  it('HTML: tags, attributes and strings', () => {
    const tokens = highlight('<div class="grid" id=\'g\'>hi</div>', 'html')
    const by = (type: string) => tokens.filter((t) => t.type === type).map((t) => t.text)
    // A closing tag merges into one token because it has no attributes
    expect(by('tag')).toEqual(['<div', '>', '</div>'])
    expect(by('attr')).toEqual(['class', 'id'])
    expect(by('string')).toEqual(['"grid"', "'g'"])
  })
})

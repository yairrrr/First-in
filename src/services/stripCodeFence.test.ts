import { describe, expect, it } from 'vitest'
import { stripCodeFence } from './stripCodeFence'
import memoryHtml from '../llm/fixtures/samples/memory.html?raw'

describe('stripCodeFence', () => {
  it('strips a fence with a language tag', () => {
    expect(stripCodeFence('```html\n<h1>hello</h1>\n```')).toBe('<h1>hello</h1>')
  })

  it('strips a fence without a language tag', () => {
    expect(stripCodeFence('```\n<h1>hello</h1>\n```')).toBe('<h1>hello</h1>')
  })

  it('returns unfenced text trimmed', () => {
    expect(stripCodeFence('  <h1>hello</h1>  ')).toBe('<h1>hello</h1>')
  })

  it('tolerates an opening fence without a closing one', () => {
    expect(stripCodeFence('```html\n<h1>hello</h1>')).toBe('<h1>hello</h1>')
  })

  it('leaves fences inside the code alone', () => {
    const code = '<pre>```</pre>\n<h1>hello</h1>'
    expect(stripCodeFence(code)).toBe(code)
  })

  it('recorded sample is already unfenced and starts with a doctype', () => {
    expect(stripCodeFence(memoryHtml).startsWith('<!DOCTYPE html>')).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { stripCodeFence } from './stripCodeFence'
import memoryHtml from '../llm/fixtures/samples/memory.html?raw'

describe('stripCodeFence', () => {
  it('מקלף גדר עם שם שפה', () => {
    expect(stripCodeFence('```html\n<h1>שלום</h1>\n```')).toBe('<h1>שלום</h1>')
  })

  it('מקלף גדר ללא שם שפה', () => {
    expect(stripCodeFence('```\n<h1>שלום</h1>\n```')).toBe('<h1>שלום</h1>')
  })

  it('מחזיר טקסט ללא גדר כמות שהוא', () => {
    expect(stripCodeFence('  <h1>שלום</h1>  ')).toBe('<h1>שלום</h1>')
  })

  it('שורד גדר פותחת ללא גדר סוגרת', () => {
    expect(stripCodeFence('```html\n<h1>שלום</h1>')).toBe('<h1>שלום</h1>')
  })

  it('אינו פוגע בגדרות שנמצאות בתוך הקוד עצמו', () => {
    const code = '<pre>```</pre>\n<h1>שלום</h1>'
    expect(stripCodeFence(code)).toBe(code)
  })

  it('הדגימה האמיתית שנשמרה כבר מקולפת ומתחילה במסמך HTML', () => {
    expect(stripCodeFence(memoryHtml).startsWith('<!DOCTYPE html>')).toBe(true)
  })
})

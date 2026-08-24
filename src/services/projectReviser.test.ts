import { describe, expect, it } from 'vitest'
import { REVISE_MARKER, REVISE_SYSTEM_PROMPT, buildRevisePrompt, reviseProject } from './projectReviser'
import { createFixtureProvider } from '../llm/fixtureProvider'
import type { LlmProvider, LlmRequest } from '../llm/types'

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

describe('reviseProject', () => {
  it('שולח את ההוראה ואת הקוד הנוכחי, ומחזיר את הקובץ המעודכן', async () => {
    const { provider, seen } = providerReturning('```html\n<!DOCTYPE html><html><body>v2</body></html>\n```')
    const html = await reviseProject(provider, '<!DOCTYPE html><html><body>v1</body></html>', ' תגדיל את הכפתור ')
    expect(html).toContain('v2')
    expect(seen[0].system).toBe(REVISE_SYSTEM_PROMPT)
    expect(seen[0].prompt).toContain('תגדיל את הכפתור')
    expect(seen[0].prompt).toContain(REVISE_MARKER)
    expect(seen[0].prompt).toContain('v1')
  })

  it('דוחה הוראה ריקה בלי לפנות למודל', async () => {
    const { provider, seen } = providerReturning('<html></html>')
    await expect(reviseProject(provider, '<html></html>', '  ')).rejects.toMatchObject({ code: 'emptyPrompt' })
    expect(seen).toHaveLength(0)
  })

  it('נכשל כשהמודל החזיר טקסט במקום קובץ', async () => {
    const { provider } = providerReturning('בטח, הנה מה שהייתי משנה...')
    await expect(reviseProject(provider, '<html></html>', 'שנה')).rejects.toMatchObject({ code: 'notHtml' })
  })

  it('הספק השמור מחזיר את הקוד עם סימון השינוי — כדי שמצב ההדגמה יראה את הזרימה', async () => {
    const code = '<!DOCTYPE html><html><body><h1>hi</h1></body></html>'
    const html = await reviseProject(createFixtureProvider(), code, 'צבע אדום')
    expect(html).toContain('<h1>hi</h1>')
    expect(html).toContain('צבע אדום')
  })
})

describe('buildRevisePrompt', () => {
  it('ההוראה קודמת לקוד, עם סימון ביניהם', () => {
    const prompt = buildRevisePrompt('<html></html>', 'x')
    expect(prompt.indexOf('x')).toBeLessThan(prompt.indexOf(REVISE_MARKER))
    expect(prompt.indexOf(REVISE_MARKER)).toBeLessThan(prompt.indexOf('<html></html>'))
  })
})

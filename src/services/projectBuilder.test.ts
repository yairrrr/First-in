import { describe, expect, it } from 'vitest'
import { BUILD_SYSTEM_PROMPT, BuildError, buildProject, looksLikeHtml } from './projectBuilder'
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

describe('buildProject', () => {
  it('מחזיר את ה-HTML שהמודל בנה', async () => {
    const { provider } = providerReturning('<!DOCTYPE html><html><body>שלום</body></html>')
    await expect(buildProject(provider, 'בנה משחק')).resolves.toContain('שלום')
  })

  it('מעביר את ההנחיה ואת הפרומפט של המשתמש', async () => {
    const { provider, seen } = providerReturning('<!DOCTYPE html><html></html>')
    await buildProject(provider, '  בנה משחק זיכרון  ')

    expect(seen[0].system).toBe(BUILD_SYSTEM_PROMPT)
    expect(seen[0].prompt).toBe('בנה משחק זיכרון')
  })

  it('מקלף את גדר ה-markdown שהמודל מוסיף', async () => {
    const { provider } = providerReturning('```html\n<!DOCTYPE html><html></html>\n```')
    await expect(buildProject(provider, 'בנה משחק')).resolves.toBe('<!DOCTYPE html><html></html>')
  })

  it('נכשל בבירור כשהמודל החזיר טקסט ולא קוד', async () => {
    const { provider } = providerReturning('בשמחה! הנה הסבר על משחקי זיכרון.')
    await expect(buildProject(provider, 'בנה משחק')).rejects.toThrow(BuildError)
  })

  it('אינו פונה למודל על פרומפט ריק', async () => {
    const { provider, seen } = providerReturning('<!DOCTYPE html><html></html>')
    await expect(buildProject(provider, '   ')).rejects.toThrow(/ריק/)
    expect(seen).toHaveLength(0)
  })

  it('עובד מקצה לקצה מול הספק השמור', async () => {
    const html = await buildProject(createFixtureProvider(), 'משחק זיכרון')
    expect(html).toContain('<script>')
  })
})

describe('looksLikeHtml', () => {
  it('מזהה מסמך HTML', () => {
    expect(looksLikeHtml('<!DOCTYPE html><html></html>')).toBe(true)
    expect(looksLikeHtml('\n  <html lang="he">')).toBe(true)
  })

  it('דוחה טקסט חופשי, גם כשיש בו תגיות', () => {
    expect(looksLikeHtml('הנה הקוד: <div>שלום</div>')).toBe(false)
    expect(looksLikeHtml('')).toBe(false)
  })
})

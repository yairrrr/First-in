import { describe, expect, it } from 'vitest'
import process from 'node:process'
import { createOllamaProvider } from '../llm/ollamaProvider'
import { buildProject } from './projectBuilder'
import { splitCode } from './codeSplitter'
import { looksLikeHtml } from './projectBuilder'

/**
 * בדיקת אינטגרציה מול Ollama אמיתי. מדלגת על עצמה ב-`npm test`,
 * כי היא לוקחת כשתי דקות ותלויה בשרת חיצוני.
 * להרצה: `npm run test:e2e`, ובתנאי ש-Ollama רץ והמודל מותקן.
 *
 * הבדיקות הרגילות משתמשות בספק שמור, כי אי אפשר לבדוק קוד
 * שמדבר עם מודל שמחזיר כל פעם משהו אחר.
 */
describe.skipIf(!process.env.FIRST_IN_E2E)('הנתיב המלא מול המודל המקומי', () => {
  it('פרומפט נכנס, קוד עובד יוצא, ופרקים מתפצלים ממנו', { timeout: 600_000 }, async () => {
    const provider = createOllamaProvider()

    const html = await buildProject(
      provider,
      'A counter app with a plus button, a minus button and a reset button.',
    )

    expect(looksLikeHtml(html)).toBe(true)
    expect(html).toContain('<script')

    const chapters = splitCode(html)
    expect(chapters.length).toBeGreaterThan(2)
    expect(chapters.every((chapter) => chapter.code.trim().length > 0)).toBe(true)
  })
})

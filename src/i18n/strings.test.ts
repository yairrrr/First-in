import { describe, expect, it } from 'vitest'
import { LANGUAGES, STRINGS, translate } from './strings'

describe('strings', () => {
  it('לכל מפתח יש תרגום בכל שפה, ואף אחד לא ריק', () => {
    const keys = Object.keys(STRINGS.he)
    for (const language of LANGUAGES) {
      for (const key of keys) {
        expect(STRINGS[language][key as keyof typeof STRINGS.he], `${language}:${key}`).toBeTruthy()
      }
    }
  })

  it('מחליף משתנים, גם כשהם חוזרים', () => {
    expect(translate('he', 'chapter.heading', { n: 2, total: 7 })).toBe('פרק 2 מתוך 7')
    expect(translate('en', 'chapter.heading', { n: 2, total: 7 })).toBe('Chapter 2 of 7')
  })

  it('העברית ניטרלית: אין פנייה ביחיד בזכר או בנקבה', () => {
    // צורות שאסורות לפי הנחיית המוצר. הרשימה גדלה כשמוצאים עוד.
    const forbidden = [/\bבנה\b/, /\bבני\b/, /\bלחץ\b/, /\bלחצי\b/, /\bנסה\b/, /\bנסי\b/, /\bקרא\b/, /\bקראי\b/, /\bבחר\b/, /\bבחרי\b/, /\bסדר\b/, /\bסדרי\b/]
    for (const [key, text] of Object.entries(STRINGS.he)) {
      for (const pattern of forbidden) {
        expect(pattern.test(text), `${key}: ${text}`).toBe(false)
      }
    }
  })
})

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

describe('extractTagContent', () => {
  it('מחלץ תוכן מתגית עם מאפיינים', () => {
    expect(extractTagContent('<script type="module">let a = 1;</script>', 'script')).toBe('let a = 1;')
  })

  it('מחבר כמה תגיות מאותו סוג', () => {
    const html = '<style>a {}</style><body><style>b {}</style></body>'
    expect(extractTagContent(html, 'style')).toBe('a {}\n\nb {}')
  })

  it('מחזיר מחרוזת ריקה כשאין תגית כזו', () => {
    expect(extractTagContent('<p>שלום</p>', 'script')).toBe('')
  })
})

describe('extractMarkup', () => {
  it('מחזיר את תוכן ה-body ללא עיצוב והתנהגות', () => {
    const html = '<html><head><style>a {}</style></head><body><h1>שלום</h1><script>x();</script></body></html>'
    expect(extractMarkup(html)).toBe('<h1>שלום</h1>')
  })
})

describe('splitCssRules', () => {
  it('מפצל כללים ברמה העליונה ושומר את הבורר', () => {
    const rules = splitCssRules('body { margin: 0; }\n.card { display: flex; }')
    expect(rules.map((r) => r.selector)).toEqual(['body', '.card'])
  })

  it('משאיר כלל @media שלם ולא מפצל את תוכנו', () => {
    const rules = splitCssRules('@media (max-width: 600px) { body { color: red; } .a { color: blue; } }')
    expect(rules).toHaveLength(1)
    expect(rules[0].selector).toBe('@media (max-width: 600px)')
  })

  it('מתעלם מסוגריים שנמצאים בתוך הערה', () => {
    const rules = splitCssRules('/* } לא באמת סוף */ body { margin: 0; }')
    expect(rules).toHaveLength(1)
    expect(rules[0].selector).toBe('body')
  })
})

describe('splitJsUnits', () => {
  it('מפצל הצהרות ברמה העליונה', () => {
    const units = splitJsUnits('let a = 1;\nlet b = 2;')
    expect(units.map((u) => u.code)).toEqual(['let a = 1;', 'let b = 2;'])
  })

  it('מזהה פונקציה בהצהרה ובהשמה', () => {
    const units = splitJsUnits('function run() { go(); }\nconst go = () => { done(); };')
    expect(units.map((u) => u.name)).toEqual(['run', 'go'])
  })

  it('אינו נשבר על מחרוזת תבנית עם סוגריים בפנים', () => {
    const js = 'const label = `${count} ${count === 1 ? "פריט" : "פריטים"}`;\nlet after = 1;'
    const units = splitJsUnits(js)
    expect(units).toHaveLength(2)
    expect(units[1].code).toBe('let after = 1;')
  })

  it('אינו מפצל בתוך פונקציה שהועברה כארגומנט', () => {
    const js = 'button.addEventListener("click", () => { a(); b(); });\nlet after = 1;'
    const units = splitJsUnits(js)
    expect(units).toHaveLength(2)
    expect(units[1].code).toBe('let after = 1;')
  })

  it('אינו מפצל על נקודה-פסיק שבתוך לולאת for', () => {
    const js = 'for (let i = 0; i < 3; i++) { go(i); }\nlet after = 1;'
    const units = splitJsUnits(js)
    expect(units).toHaveLength(2)
  })

  it('מצרף נקודה-פסיק שסוגרת אובייקט לאותה יחידה', () => {
    const units = splitJsUnits('const config = { a: 1 };')
    expect(units).toHaveLength(1)
    expect(units[0].code).toBe('const config = { a: 1 };')
  })

  it('מתעלם מתווים שנראים כמו גבול אך נמצאים בהערה', () => {
    const units = splitJsUnits('// אין כאן סוף; ולא כאן }\nlet a = 1;')
    expect(units).toHaveLength(1)
    expect(units[0].code).toContain('let a = 1;')
  })
})

describe('splitCode על פלט אמיתי של המודל', () => {
  const samples = [
    { name: 'memory', html: memoryHtml, functions: ['initGame', 'flipCard', 'resetGame'] },
    { name: 'todo', html: todoHtml, functions: ['updateCounter', 'createTodo'] },
  ]

  for (const sample of samples) {
    describe(sample.name, () => {
      const chapters = splitCode(sample.html)

      it('מייצר מספר פרקים סביר', () => {
        expect(chapters.length).toBeGreaterThanOrEqual(5)
        expect(chapters.length).toBeLessThanOrEqual(MAX_CHAPTERS)
      })

      it('מספר את הפרקים ברצף ולא חוזר על מזהה', () => {
        expect(chapters.map((c) => c.id)).toEqual(chapters.map((_, i) => `ch-${i + 1}`))
      })

      it('אין פרק ריק ואין פרק ללא כותרת', () => {
        for (const chapter of chapters) {
          expect(chapter.code.trim().length).toBeGreaterThan(0)
          expect(chapter.title.trim().length).toBeGreaterThan(0)
        }
      })

      it('כל פרק מתחיל כלא-הושלם', () => {
        expect(chapters.every((c) => !c.completed)).toBe(true)
      })

      it('כל פונקציה שבקוד נמצאת בפרק אחד בדיוק', () => {
        for (const name of sample.functions) {
          const holders = chapters.filter((c) => c.code.includes(`function ${name}`))
          expect(holders, name).toHaveLength(1)
        }
      })

      it('הפרק הראשון הוא מבנה העמוד', () => {
        expect(chapters[0].title).toContain('מבנה העמוד')
      })

      it('יש פרק עיצוב ופרק פונקציה', () => {
        expect(chapters.some((c) => c.title.startsWith('עיצוב:'))).toBe(true)
        expect(chapters.some((c) => c.title.startsWith('פונקציה:'))).toBe(true)
      })
    })
  }

  it('מכבד את התקרה גם על גיליון סגנונות ענק', () => {
    const rules = Array.from({ length: 120 }, (_, i) => `.rule-${i} { color: #00${i % 10}; padding: ${i}px; }`)
    const html = `<html><body><p>שלום</p><style>${rules.join('\n')}</style></body></html>`
    expect(splitCode(html).length).toBeLessThanOrEqual(MAX_CHAPTERS)
  })

  it('פרק שבלע יחידות מצהיר על כך בכותרת', () => {
    const chapters = splitCode(memoryHtml)
    const swallower = chapters.find((c) => c.code.includes('function resetGame'))
    expect(swallower?.title).toContain('ועוד')
  })
})

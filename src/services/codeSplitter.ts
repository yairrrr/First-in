import type { Chapter } from '../state/types'

/**
 * codeSplitter — קוד HTML שלם נכנס, פרקי למידה יוצאים.
 *
 * קוד רגיל בלבד, ללא מודל. מיידי, דטרמיניסטי וניתן לבדיקה אוטומטית — ראה ADR-005.
 * גבול הפרק נקבע ב-ADR-008: אזורי הקובץ כשלד, ובתוכם יחידות בעלות שם.
 */

/** גודל היעד של פרק שנוצר מקיבוץ יחידות קטנות. */
export const CHAPTER_TARGET_CHARS = 800

/** פרק קצר מזה אינו עומד בפני עצמו, ומתמזג לשכנו. */
export const MIN_CHAPTER_CHARS = 150

/** תקרה רכה. פונקציות לעולם אינן מתמזגות, ולכן פרויקט עתיר פונקציות עשוי לחרוג. */
export const MAX_CHAPTERS = 12

interface Piece {
  title: string
  code: string
}

export function splitCode(html: string): Chapter[] {
  const css = extractTagContent(html, 'style')
  const js = extractTagContent(html, 'script')
  const markup = extractMarkup(html)

  let target = CHAPTER_TARGET_CHARS
  let pieces = buildPieces(markup, css, js, target)

  // אם יצאו יותר מדי פרקים, מגדילים את גודל היעד ומקבצים מחדש.
  for (let attempt = 0; attempt < 4 && pieces.length > MAX_CHAPTERS; attempt++) {
    target = Math.ceil(target * (pieces.length / MAX_CHAPTERS))
    pieces = buildPieces(markup, css, js, target)
  }

  return pieces.map((piece, index) => ({
    id: `ch-${index + 1}`,
    title: piece.title,
    code: piece.code,
    completed: false,
  }))
}

function buildPieces(markup: string, css: string, js: string, target: number): Piece[] {
  const pieces: Piece[] = []
  if (markup) pieces.push({ title: 'מבנה העמוד', code: markup })
  pieces.push(...cssPieces(css, target))
  pieces.push(...jsPieces(js, target))
  return mergeTiny(pieces)
}

// ---------- אזורים ----------

/** מחזיר את התוכן של כל התגיות מסוג אחד, מחובר יחד. */
export function extractTagContent(html: string, tag: 'style' | 'script'): string {
  const pattern = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'gi')
  const parts: string[] = []
  for (const match of html.matchAll(pattern)) {
    const content = match[1].trim()
    if (content) parts.push(content)
  }
  return parts.join('\n\n')
}

/** תוכן ה-body ללא בלוקים של עיצוב והתנהגות. */
export function extractMarkup(html: string): string {
  const body = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html)
  const source = body ? body[1] : html
  return source
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ---------- CSS ----------

interface CssRule {
  selector: string
  code: string
}

/** מפצל גיליון סגנונות לכללים ברמה העליונה. כלל @media נשאר שלם. */
export function splitCssRules(css: string): CssRule[] {
  const rules: CssRule[] = []
  let depth = 0
  let start = 0
  let inComment = false

  for (let i = 0; i < css.length; i++) {
    const char = css[i]
    const next = css[i + 1]

    if (inComment) {
      if (char === '*' && next === '/') {
        inComment = false
        i++
      }
      continue
    }
    if (char === '/' && next === '*') {
      inComment = true
      i++
      continue
    }

    if (char === '{') depth++
    else if (char === '}') {
      depth--
      if (depth === 0) {
        const code = css.slice(start, i + 1).trim()
        if (code) rules.push({ selector: selectorOf(code), code })
        start = i + 1
      }
    }
  }

  return rules
}

function selectorOf(rule: string): string {
  const head = rule.slice(0, rule.indexOf('{'))
  // הערה שקדמה לכלל נשמרת בקוד הפרק, אך אינה חלק מהבורר.
  return head
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function cssPieces(css: string, target: number): Piece[] {
  const rules = splitCssRules(css)
  const groups = groupByTarget(rules, target, (rule) => rule.code)

  return groups.map((group) => ({
    title: cssTitle(group),
    code: group.map((rule) => rule.code).join('\n\n'),
  }))
}

function cssTitle(group: CssRule[]): string {
  const first = group[0].selector
  if (group.length === 1) return `עיצוב: ${first}`
  return `עיצוב: ${first} ועוד ${group.length - 1} כללים`
}

// ---------- JavaScript ----------

interface JsUnit {
  /** שם הפונקציה, אם היחידה היא הגדרת פונקציה. */
  name: string | null
  code: string
}

/**
 * מפצל קוד לפקודות ברמה העליונה.
 * מטפל בהערות, במחרוזות ובמחרוזות תבנית עם אינטרפולציה — שלושתם מכילים
 * תווים שנראים כמו גבול פקודה ואינם כאלה.
 */
export function splitJsUnits(js: string): JsUnit[] {
  const units: JsUnit[] = []
  let start = 0
  let braces = 0
  let parens = 0
  let mode: 'code' | 'line' | 'block' | 'single' | 'double' | 'template' = 'code'
  /** עומק הסוגריים שבו נפתחה כל אינטרפולציה פתוחה. */
  const interpolations: number[] = []
  let i = 0

  const push = (end: number) => {
    const code = js.slice(start, end).trim()
    if (code) units.push({ name: functionName(code), code })
    start = end
  }

  while (i < js.length) {
    const char = js[i]
    const next = js[i + 1]

    if (mode === 'line') {
      if (char === '\n') mode = 'code'
      i++
      continue
    }
    if (mode === 'block') {
      if (char === '*' && next === '/') {
        mode = 'code'
        i++
      }
      i++
      continue
    }
    if (mode === 'single' || mode === 'double') {
      if (char === '\\') {
        i += 2
        continue
      }
      if ((mode === 'single' && char === "'") || (mode === 'double' && char === '"')) mode = 'code'
      i++
      continue
    }
    if (mode === 'template') {
      if (char === '\\') {
        i += 2
        continue
      }
      if (char === '`') mode = 'code'
      else if (char === '$' && next === '{') {
        interpolations.push(braces)
        braces++
        mode = 'code'
        i += 2
        continue
      }
      i++
      continue
    }

    // mode === 'code'
    if (char === '/' && next === '/') {
      mode = 'line'
      i += 2
      continue
    }
    if (char === '/' && next === '*') {
      mode = 'block'
      i += 2
      continue
    }
    if (char === "'") mode = 'single'
    else if (char === '"') mode = 'double'
    else if (char === '`') mode = 'template'
    else if (char === '(') parens++
    else if (char === ')') parens--
    else if (char === '{') braces++
    else if (char === '}') {
      braces--
      if (interpolations.length > 0 && braces === interpolations[interpolations.length - 1]) {
        interpolations.pop()
        mode = 'template'
        i++
        continue
      }
      if (braces === 0 && parens === 0) {
        i++
        i = skipTrailingSemicolon(js, i)
        push(i)
        continue
      }
    } else if (char === ';' && braces === 0 && parens === 0) {
      i++
      push(i)
      continue
    }
    i++
  }

  push(js.length)
  return units
}

function skipTrailingSemicolon(js: string, from: number): number {
  let i = from
  while (i < js.length && (js[i] === ' ' || js[i] === '\t')) i++
  return i < js.length && js[i] === ';' ? i + 1 : from
}

/** מזהה הגדרת פונקציה, בין אם בהצהרה ובין אם בהשמה לקבוע. */
function functionName(code: string): string | null {
  const declaration = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/.exec(code)
  if (declaration) return declaration[1]

  const assignment =
    /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/.exec(
      code,
    )
  return assignment ? assignment[1] : null
}

function jsPieces(js: string, target: number): Piece[] {
  const units = splitJsUnits(js)
  const pieces: Piece[] = []
  let pending: JsUnit[] = []
  let wiringCount = 0

  const flushPending = () => {
    if (pending.length === 0) return
    const groups = groupByTarget(pending, target, (unit) => unit.code)
    for (const group of groups) {
      wiringCount++
      pieces.push({
        title: wiringCount === 1 ? 'מצב וחיווט' : `מצב וחיווט ${wiringCount}`,
        code: group.map((unit) => unit.code).join('\n\n'),
      })
    }
    pending = []
  }

  for (const unit of units) {
    if (unit.name) {
      flushPending()
      pieces.push({ title: `פונקציה: ${unit.name}`, code: unit.code })
    } else {
      pending.push(unit)
    }
  }
  flushPending()

  return pieces
}

// ---------- כלים משותפים ----------

/** מקבץ פריטים עוקבים עד שהגודל המצטבר מגיע ליעד. הסדר נשמר. */
function groupByTarget<T>(items: T[], target: number, sizeOf: (item: T) => string): T[][] {
  const groups: T[][] = []
  let current: T[] = []
  let size = 0

  for (const item of items) {
    current.push(item)
    size += sizeOf(item).length
    if (size >= target) {
      groups.push(current)
      current = []
      size = 0
    }
  }
  if (current.length > 0) groups.push(current)

  return groups
}

/**
 * פרק קצר מדי מתמזג לשכן, כדי שלא ייווצר פרק שאין עליו מה לשאול.
 * הכותרת מעודכנת בהתאם: פרק שבלע יחידות חייב להצהיר על כך,
 * אחרת המשתמש יקבל שאלה על קוד שהכותרת לא הבטיחה.
 */
function mergeTiny(pieces: Piece[]): Piece[] {
  if (pieces.length <= 1) return pieces

  const merged: { title: string; code: string; swallowed: number }[] = []
  for (const piece of pieces) {
    const previous = merged[merged.length - 1]
    if (piece.code.length < MIN_CHAPTER_CHARS && previous) {
      previous.code = `${previous.code}\n\n${piece.code}`
      previous.swallowed++
    } else {
      merged.push({ title: piece.title, code: piece.code, swallowed: 0 })
    }
  }

  // אם הפרק הראשון היה קצר ולא היה לו שכן קודם, הוא מתמזג קדימה.
  if (merged.length > 1 && merged[0].code.length < MIN_CHAPTER_CHARS) {
    merged[1].code = `${merged[0].code}\n\n${merged[1].code}`
    merged[1].swallowed++
    merged.shift()
  }

  return merged.map(({ title, code, swallowed }) => ({
    title: swallowed === 0 ? title : `${title} ${extraUnits(swallowed)}`,
    code,
  }))
}

function extraUnits(count: number): string {
  return count === 1 ? 'ועוד יחידה אחת' : `ועוד ${count} יחידות`
}

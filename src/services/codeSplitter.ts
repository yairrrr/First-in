import type { Chapter, ChapterTitle } from '../state/types'

/**
 * codeSplitter: a complete single-file HTML app in, learning chapters out.
 *
 * Deterministic and model-free, so it is instant and unit-testable. The file's
 * zones (markup, CSS, JavaScript) form the skeleton; within each zone, named
 * units (functions, CSS rules) become chapters.
 */

/** Target size when grouping small units into one chapter. */
export const CHAPTER_TARGET_CHARS = 800

/** Chapters shorter than this cannot stand alone and are merged into a neighbour. */
export const MIN_CHAPTER_CHARS = 150

/** Soft cap. Functions are never merged, so function-heavy projects may exceed it. */
export const MAX_CHAPTERS = 12

interface Piece {
  title: ChapterTitle
  code: string
}

export function splitCode(html: string): Chapter[] {
  const css = extractTagContent(html, 'style')
  const js = extractTagContent(html, 'script')
  const markup = extractMarkup(html)

  let target = CHAPTER_TARGET_CHARS
  let pieces = buildPieces(markup, css, js, target)

  // Too many chapters: raise the grouping target and regroup.
  for (let attempt = 0; attempt < 4 && pieces.length > MAX_CHAPTERS; attempt++) {
    target = Math.ceil(target * (pieces.length / MAX_CHAPTERS))
    pieces = buildPieces(markup, css, js, target)
  }

  return pieces.map((piece, index) => ({
    id: `ch-${index + 1}`,
    title: piece.title,
    extraUnits: piece.extraUnits,
    code: piece.code,
    completed: false,
    lesson: null,
    attempts: 0,
  }))
}

function buildPieces(markup: string, css: string, js: string, target: number): MergedPiece[] {
  const pieces: Piece[] = []
  if (markup) pieces.push({ title: { kind: 'markup' }, code: markup })
  pieces.push(...cssPieces(css, target))
  pieces.push(...jsPieces(js, target))
  return mergeTiny(pieces)
}

// ---------- Zones ----------

/** Concatenated content of every tag of the given kind. */
export function extractTagContent(html: string, tag: 'style' | 'script'): string {
  const pattern = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'gi')
  const parts: string[] = []
  for (const match of html.matchAll(pattern)) {
    const content = match[1].trim()
    if (content) parts.push(content)
  }
  return parts.join('\n\n')
}

/** Body content with style and script blocks removed. */
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

/** Splits a stylesheet into top-level rules. Nested rules such as @media stay intact. */
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
  // A comment preceding the rule stays in the chapter code but is not part of the selector.
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

function cssTitle(group: CssRule[]): ChapterTitle {
  return { kind: 'css', selector: group[0].selector, more: group.length - 1 }
}

// ---------- JavaScript ----------

interface JsUnit {
  /** Function name when the unit is a function definition. */
  name: string | null
  code: string
}

/**
 * Splits JavaScript into top-level statements. Tracks comments, strings and
 * template literals with interpolation, since all three contain characters
 * that look like statement boundaries but are not.
 */
export function splitJsUnits(js: string): JsUnit[] {
  const units: JsUnit[] = []
  let start = 0
  let braces = 0
  let parens = 0
  let mode: 'code' | 'line' | 'block' | 'single' | 'double' | 'template' = 'code'
  /** Brace depth at which each open template interpolation started. */
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

/** Detects a function definition, either a declaration or an assignment to a binding. */
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
        title: { kind: 'wiring', n: wiringCount },
        code: group.map((unit) => unit.code).join('\n\n'),
      })
    }
    pending = []
  }

  for (const unit of units) {
    if (unit.name) {
      flushPending()
      pieces.push({ title: { kind: 'function', name: unit.name }, code: unit.code })
    } else {
      pending.push(unit)
    }
  }
  flushPending()

  return pieces
}

// ---------- Shared helpers ----------

/** Groups consecutive items until the accumulated size reaches the target. Order is preserved. */
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

interface MergedPiece extends Piece {
  /** Units absorbed into this piece. Surfaced in the displayed title. */
  extraUnits: number
}

/**
 * Merges pieces that are too short to carry a lesson into a neighbour.
 * The count of absorbed units is kept so the chapter title can declare them;
 * otherwise the learner would be quizzed on code the title never mentioned.
 */
function mergeTiny(pieces: Piece[]): MergedPiece[] {
  const merged: MergedPiece[] = []
  if (pieces.length <= 1) return pieces.map((piece) => ({ ...piece, extraUnits: 0 }))

  for (const piece of pieces) {
    const previous = merged[merged.length - 1]
    if (piece.code.length < MIN_CHAPTER_CHARS && previous) {
      previous.code = `${previous.code}\n\n${piece.code}`
      previous.extraUnits++
    } else {
      merged.push({ title: piece.title, code: piece.code, extraUnits: 0 })
    }
  }

  // A short first piece has no previous neighbour; merge it forward instead.
  if (merged.length > 1 && merged[0].code.length < MIN_CHAPTER_CHARS) {
    merged[1].code = `${merged[0].code}\n\n${merged[1].code}`
    merged[1].extraUnits++
    merged.shift()
  }

  return merged
}

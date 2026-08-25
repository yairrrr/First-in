/**
 * Minimal dependency-free syntax highlighter for HTML, CSS and JavaScript.
 * Not a full parser; tokenizes enough for readable display.
 */

export type CodeLanguage = 'html' | 'css' | 'js'

export type TokenType =
  | 'keyword'
  | 'string'
  | 'number'
  | 'comment'
  | 'tag'
  | 'attr'
  | 'selector'
  | 'property'
  | 'fn'
  | 'punct'
  | 'text'

export interface Token {
  type: TokenType
  text: string
}

const JS_KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'of', 'in',
  'new', 'true', 'false', 'null', 'undefined', 'class', 'this', 'await', 'async', 'switch',
  'case', 'break', 'default', 'typeof', 'continue', 'throw', 'try', 'catch', 'do',
])

const JS_PATTERN =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|(=>)|([A-Za-z_$][\w$]*)|([{}()[\];,.<>=+\-*/%!&|?:])|(\s+)|(.)/g

export function highlight(code: string, language: CodeLanguage): Token[] {
  if (language === 'js') return highlightJs(code)
  if (language === 'css') return highlightCss(code)
  return highlightHtml(code)
}

function highlightJs(code: string): Token[] {
  const tokens: Token[] = []
  for (const match of code.matchAll(JS_PATTERN)) {
    const [text, comment, string, number, arrow, ident, punct] = match
    if (comment) tokens.push({ type: 'comment', text })
    else if (string) tokens.push({ type: 'string', text })
    else if (number) tokens.push({ type: 'number', text })
    else if (arrow) tokens.push({ type: 'keyword', text })
    else if (ident) {
      const followedByParen = /^\s*\(/.test(code.slice(match.index + text.length))
      tokens.push({
        type: JS_KEYWORDS.has(ident) ? 'keyword' : followedByParen ? 'fn' : 'text',
        text,
      })
    } else if (punct) tokens.push({ type: 'punct', text })
    else tokens.push({ type: 'text', text })
  }
  return merge(tokens)
}

const CSS_INNER =
  /(\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*")|(#[0-9a-fA-F]{3,8}\b|-?\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|vmin|vmax|s|ms|deg|fr)?\b)|(!important)|([-\w]+(?=\s*:))|([{}();:,])|(\s+)|([^\s{}();:,]+)/g

function highlightCss(code: string): Token[] {
  const tokens: Token[] = []
  let depth = 0
  let i = 0

  while (i < code.length) {
    if (depth === 0) {
      // Outside braces: a comment, or a selector up to the opening brace
      const comment = /^\/\*[\s\S]*?\*\//.exec(code.slice(i))
      if (comment) {
        tokens.push({ type: 'comment', text: comment[0] })
        i += comment[0].length
        continue
      }
      const brace = code.indexOf('{', i)
      if (brace === -1) {
        tokens.push({ type: 'text', text: code.slice(i) })
        break
      }
      const head = code.slice(i, brace)
      const lead = head.match(/^\s*/)?.[0] ?? ''
      if (lead) tokens.push({ type: 'text', text: lead })
      const selector = head.slice(lead.length)
      if (selector) tokens.push({ type: 'selector', text: selector })
      tokens.push({ type: 'punct', text: '{' })
      depth = 1
      i = brace + 1
      continue
    }

    // Inside braces: properties, values and punctuation
    const close = code.indexOf('}', i)
    const nextOpen = code.indexOf('{', i)
    const end = close === -1 ? code.length : nextOpen !== -1 && nextOpen < close ? nextOpen : close
    const body = code.slice(i, end)
    for (const match of body.matchAll(CSS_INNER)) {
      const [text, comment, string, number, important, property, punct] = match
      if (comment) tokens.push({ type: 'comment', text })
      else if (string) tokens.push({ type: 'string', text })
      else if (number) tokens.push({ type: 'number', text })
      else if (important) tokens.push({ type: 'keyword', text })
      else if (property) tokens.push({ type: 'property', text })
      else if (punct) tokens.push({ type: 'punct', text })
      else tokens.push({ type: 'text', text })
    }
    i = end
    if (i < code.length) {
      const char = code[i]
      tokens.push({ type: 'punct', text: char })
      // Nested rule (e.g. @media): depth increases; text before the brace is already emitted
      depth += char === '{' ? 1 : -1
      i++
    }
  }
  return merge(tokens)
}

function highlightHtml(code: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < code.length) {
    const rest = code.slice(i)
    const comment = /^<!--[\s\S]*?-->/.exec(rest)
    if (comment) {
      tokens.push({ type: 'comment', text: comment[0] })
      i += comment[0].length
      continue
    }
    const open = /^<\/?[A-Za-z][\w-]*/.exec(rest)
    if (open) {
      tokens.push({ type: 'tag', text: open[0] })
      i += open[0].length
      // Inside a tag: attributes, strings and '=' until the closing bracket
      while (i < code.length) {
        const inner = code.slice(i)
        const closeTag = /^\s*\/?>/.exec(inner)
        if (closeTag) {
          tokens.push({ type: 'tag', text: closeTag[0] })
          i += closeTag[0].length
          break
        }
        const part =
          /^(\s+)|^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|^([\w:.-]+)|^(=)|^(.)/.exec(inner)
        if (!part) break
        const [text, space, string, attr, eq] = part
        tokens.push({
          type: space ? 'text' : string ? 'string' : attr ? 'attr' : eq ? 'punct' : 'text',
          text,
        })
        i += text.length
      }
      continue
    }
    const next = code.indexOf('<', i + 1)
    const text = next === -1 ? rest : code.slice(i, next)
    tokens.push({ type: 'text', text })
    i += text.length
  }
  return merge(tokens)
}

/** Merges adjacent tokens of the same type to keep the DOM small. */
function merge(tokens: Token[]): Token[] {
  const out: Token[] = []
  for (const token of tokens) {
    const last = out[out.length - 1]
    if (last && last.type === token.type) last.text += token.text
    else out.push({ ...token })
  }
  return out
}

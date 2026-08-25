import { highlight, type CodeLanguage } from './highlight'
import type { ChapterTitle } from '../state/types'

/** Highlight language by chapter kind; each chapter belongs to exactly one zone. */
export function languageForChapter(title: ChapterTitle): CodeLanguage {
  if (title.kind === 'markup') return 'html'
  if (title.kind === 'css') return 'css'
  return 'js'
}

/** Syntax-highlighted code block. Always left-to-right, regardless of UI direction. */
export function CodeBlock({
  code,
  language,
  compact = false,
}: {
  code: string
  language: CodeLanguage
  compact?: boolean
}) {
  return (
    <pre className={`code ${compact ? 'code-compact' : ''}`}>
      <code>
        {highlight(code, language).map((token, index) =>
          token.type === 'text' ? (
            token.text
          ) : (
            <span key={index} className={`tk-${token.type}`}>
              {token.text}
            </span>
          ),
        )}
      </code>
    </pre>
  )
}

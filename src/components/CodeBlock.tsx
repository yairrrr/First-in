import { highlight, type CodeLanguage } from './highlight'
import type { ChapterTitle } from '../state/types'

/** שפת ההדגשה לפי סוג הפרק: כל פרק הוא אזור אחד בלבד — מבנה, עיצוב או התנהגות. */
export function languageForChapter(title: ChapterTitle): CodeLanguage {
  if (title.kind === 'markup') return 'html'
  if (title.kind === 'css') return 'css'
  return 'js'
}

/** בלוק קוד עם הדגשת תחביר. תמיד משמאל לימין, גם בממשק עברי. */
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

import type { Chapter, ChapterTitle } from '../state/types'
import { translate, type Language } from './strings'

/** Renders a structured chapter title in the given language. */
export function formatChapterTitle(
  language: Language,
  title: ChapterTitle,
  extraUnits = 0,
): string {
  let text: string
  switch (title.kind) {
    case 'markup':
      text = translate(language, 'title.markup')
      break
    case 'css':
      text =
        title.more === 0
          ? translate(language, 'title.css', { selector: title.selector })
          : translate(language, 'title.cssMore', { selector: title.selector, count: title.more })
      break
    case 'function':
      text = translate(language, 'title.function', { name: title.name })
      break
    case 'wiring':
      text =
        title.n === 1
          ? translate(language, 'title.wiring')
          : translate(language, 'title.wiringN', { n: title.n })
      break
  }
  if (extraUnits === 1) text += translate(language, 'title.extraOne')
  else if (extraUnits > 1) text += translate(language, 'title.extraMany', { count: extraUnits })
  return text
}

export function chapterTitleText(language: Language, chapter: Chapter): string {
  return formatChapterTitle(language, chapter.title, chapter.extraUnits)
}

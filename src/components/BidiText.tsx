/**
 * Chapter titles mix RTL text with code identifiers (e.g. "עיצוב: :root ועוד 4 כללים").
 * In an RTL run, punctuation adjacent to a Latin fragment attaches to the wrong side,
 * rendering `:root` as `root:`. Wrapping each Latin run in <bdi> isolates it.
 */

export interface BidiPart {
  text: string
  latin: boolean
}

/** Matches Latin runs, including a leading CSS selector prefix when present. */
const LATIN_RUN = /((?:[.:#@])?[A-Za-z][A-Za-z0-9_$-]*)/g

export function splitBidiParts(text: string): BidiPart[] {
  const parts: BidiPart[] = []
  let lastIndex = 0

  for (const match of text.matchAll(LATIN_RUN)) {
    const start = match.index
    if (start > lastIndex) parts.push({ text: text.slice(lastIndex, start), latin: false })
    parts.push({ text: match[0], latin: true })
    lastIndex = start + match[0].length
  }
  if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex), latin: false })

  return parts
}

export function BidiText({ text }: { text: string }) {
  return (
    <>
      {splitBidiParts(text).map((part, index) =>
        part.latin ? <bdi key={index}>{part.text}</bdi> : part.text,
      )}
    </>
  )
}

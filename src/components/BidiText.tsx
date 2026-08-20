/**
 * כותרות הפרקים מערבבות עברית עם שמות מהקוד, למשל "עיצוב: :root ועוד 4 כללים".
 * בטקסט מימין לשמאל, סימן פיסוק שצמוד לקטע לטיני נדבק לצד הלא נכון,
 * וכך `:root` מוצג כ-`root:`. עטיפה ב-bdi מבודדת את הקטע ומחזירה את הסדר.
 */

export interface BidiPart {
  text: string
  latin: boolean
}

/** בורר קטעים לטיניים, כולל תו פתיחה של בורר CSS אם יש. */
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

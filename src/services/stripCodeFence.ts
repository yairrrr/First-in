/**
 * המודל עוטף את הקוד שהוא מחזיר בגדר markdown, גם כשמבקשים ממנו במפורש שלא.
 * אומת על שתי דגימות אמיתיות, ראה SPIKE-003.
 *
 * מקלף את הגדר אם היא קיימת, ומחזיר את הטקסט כמות שהוא אם לא.
 */
export function stripCodeFence(text: string): string {
  const trimmed = text.trim()
  if (!trimmed.startsWith('```')) return trimmed

  // שורה ראשונה היא הגדר עצמה, ואולי שם שפה אחריה.
  const firstLineEnd = trimmed.indexOf('\n')
  if (firstLineEnd === -1) return trimmed

  const withoutOpening = trimmed.slice(firstLineEnd + 1)
  const closing = withoutOpening.lastIndexOf('```')
  if (closing === -1) return withoutOpening.trim()

  return withoutOpening.slice(0, closing).trim()
}

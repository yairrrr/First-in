/**
 * Models tend to wrap code in a markdown fence even when told not to.
 * Removes the fence when present; returns the trimmed text unchanged otherwise.
 */
export function stripCodeFence(text: string): string {
  const trimmed = text.trim()
  if (!trimmed.startsWith('```')) return trimmed

  // The first line is the fence itself, optionally followed by a language tag.
  const firstLineEnd = trimmed.indexOf('\n')
  if (firstLineEnd === -1) return trimmed

  const withoutOpening = trimmed.slice(firstLineEnd + 1)
  const closing = withoutOpening.lastIndexOf('```')
  if (closing === -1) return withoutOpening.trim()

  return withoutOpening.slice(0, closing).trim()
}

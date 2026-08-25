import type { LlmProvider } from '../llm/types'
import { stripCodeFence } from './stripCodeFence'

/**
 * projectBuilder: the user's prompt in, a complete HTML file out.
 *
 * Output is a single self-contained file because the app runs entirely in the
 * browser with no file system; one file is the unit the preview and the
 * chapter splitter both understand.
 */

export const BUILD_SYSTEM_PROMPT = [
  'You are a code generator. You output code and nothing else.',
  'Return exactly one self-contained HTML file: markup, CSS in a <style> tag, and JavaScript in a <script> tag.',
  'Use flexbox for layout. Do not use any external library, font, image, or network request.',
  'Do not write explanations, comments about your process, or markdown fences.',
].join(' ')

export type BuildErrorCode = 'emptyPrompt' | 'notHtml'

/** Thrown on empty input or when the model returns something that is not an HTML document. */
export class BuildError extends Error {
  readonly code: BuildErrorCode

  constructor(code: BuildErrorCode) {
    super(`build:${code}`)
    this.name = 'BuildError'
    this.code = code
  }
}

export async function buildProject(provider: LlmProvider, prompt: string): Promise<string> {
  const trimmed = prompt.trim()
  if (!trimmed) throw new BuildError('emptyPrompt')

  const { text } = await provider.complete({
    system: BUILD_SYSTEM_PROMPT,
    prompt: trimmed,
  })

  const html = stripCodeFence(text)
  if (!looksLikeHtml(html)) {
    throw new BuildError('notHtml')
  }

  return html
}

/**
 * Sanity check, not full validation: catches the model answering with prose
 * instead of code before it is rendered as a blank iframe.
 */
export function looksLikeHtml(text: string): boolean {
  const head = text.trimStart().slice(0, 200).toLowerCase()
  return head.startsWith('<!doctype html') || head.startsWith('<html')
}

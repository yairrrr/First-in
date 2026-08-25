import { OllamaError } from '../llm/ollamaProvider'
import { BuildError } from '../services/projectBuilder'
import { translate, type Language } from './strings'

/**
 * User-facing error message in the current language. Coded errors are
 * localized; unknown errors fall back to their own message.
 */
export function errorMessage(language: Language, error: unknown): string {
  if (error instanceof OllamaError) {
    if (error.code === 'unreachable') return translate(language, 'error.ollamaUnreachable')
    if (error.code === 'http') return translate(language, 'error.ollamaHttp', { status: error.status ?? '?' })
    return translate(language, 'error.ollamaFormat')
  }
  if (error instanceof BuildError) {
    return translate(language, error.code === 'emptyPrompt' ? 'error.emptyPrompt' : 'error.notHtml')
  }
  if (error instanceof Error && error.message) return error.message
  return translate(language, 'error.unknown')
}

/** Message persisted with a project or revision; the 'interrupted' code is localized. */
export function storedMessage(language: Language, message: string | null): string | null {
  if (message === 'interrupted') return translate(language, 'error.interrupted')
  return message
}

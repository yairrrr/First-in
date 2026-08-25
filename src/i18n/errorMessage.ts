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
    if (error.code === 'timeout') return translate(language, 'error.ollamaTimeout')
    if (error.code === 'http') {
      const base = translate(language, 'error.ollamaHttp', { status: error.status ?? '?' })
      return error.detail ? `${base} ${error.detail}` : base
    }
    return translate(language, 'error.ollamaFormat')
  }
  if (error instanceof BuildError) {
    if (error.code === 'emptyPrompt') return translate(language, 'error.emptyPrompt')
    if (error.code === 'emptyOutput') return translate(language, 'error.emptyOutput')
    return translate(language, 'error.notHtml')
  }
  if (error instanceof Error && error.message) return error.message
  return translate(language, 'error.unknown')
}

/** Message persisted with a project or revision; the 'interrupted' code is localized. */
export function storedMessage(language: Language, message: string | null): string | null {
  if (message === 'interrupted') return translate(language, 'error.interrupted')
  return message
}

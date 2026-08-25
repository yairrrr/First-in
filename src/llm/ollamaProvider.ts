import type { LlmProvider, LlmRequest, LlmResponse } from './types'

/** Default local Ollama endpoint. Ollama permits browser requests from localhost origins. */
export const OLLAMA_BASE_URL = 'http://localhost:11434'

export const OLLAMA_MODEL = 'gemma4:12b'

export interface OllamaOptions {
  baseUrl?: string
  model?: string
  /** Injected in tests to avoid real network calls. */
  fetchImpl?: typeof fetch
}

export type OllamaErrorCode = 'unreachable' | 'http' | 'format'

/**
 * Thrown when the model is unreachable or returns an unreadable response.
 * Carries a code rather than display text; the UI localizes it.
 */
export class OllamaError extends Error {
  readonly code: OllamaErrorCode
  readonly status?: number

  constructor(code: OllamaErrorCode, options?: { cause?: unknown; status?: number }) {
    super(`ollama:${code}${options?.status ? `:${options.status}` : ''}`, { cause: options?.cause })
    this.name = 'OllamaError'
    this.code = code
    this.status = options?.status
  }
}

export function createOllamaProvider(options: OllamaOptions = {}): LlmProvider {
  const baseUrl = options.baseUrl ?? OLLAMA_BASE_URL
  const model = options.model ?? OLLAMA_MODEL
  const doFetch = options.fetchImpl ?? fetch

  return {
    name: `ollama:${model}`,

    async complete(request: LlmRequest): Promise<LlmResponse> {
      const body = {
        model,
        prompt: request.prompt,
        system: request.system,
        stream: false,
        // gemma4 is a reasoning model. With thinking enabled it can spend its
        // whole budget on the hidden reasoning and return an empty response.
        think: false,
        // A full JSON schema (not just 'json') constrains the model to the exact shape.
        ...(request.schema ? { format: request.schema } : {}),
      }

      let response: Response
      try {
        response = await doFetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } catch (cause) {
        throw new OllamaError('unreachable', { cause })
      }

      if (!response.ok) {
        throw new OllamaError('http', { status: response.status })
      }

      const payload = (await response.json()) as { response?: unknown }
      if (typeof payload.response !== 'string') {
        throw new OllamaError('format')
      }

      return { text: payload.response }
    },
  }
}

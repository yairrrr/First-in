import type { LlmProvider, LlmRequest, LlmResponse } from './types'

/** Default local Ollama endpoint. Ollama permits browser requests from localhost origins. */
export const OLLAMA_BASE_URL = 'http://localhost:11434'

export const OLLAMA_MODEL = 'gemma4:12b'

/**
 * Upper bound for one generation. A full-file build takes about two minutes on
 * a laptop; without a bound, a hung server leaves the UI "building" forever.
 */
export const OLLAMA_TIMEOUT_MS = 10 * 60 * 1000

export interface OllamaOptions {
  baseUrl?: string
  model?: string
  timeoutMs?: number
  /** Injected in tests to avoid real network calls. */
  fetchImpl?: typeof fetch
}

export type OllamaErrorCode = 'unreachable' | 'timeout' | 'http' | 'format'

/**
 * Thrown when the model is unreachable or returns an unreadable response.
 * Carries a code rather than display text; the UI localizes it.
 */
export class OllamaError extends Error {
  readonly code: OllamaErrorCode
  readonly status?: number
  /** Server-provided reason, e.g. "model 'x' not found". */
  readonly detail?: string

  constructor(code: OllamaErrorCode, options?: { cause?: unknown; status?: number; detail?: string }) {
    super(`ollama:${code}${options?.status ? `:${options.status}` : ''}`, { cause: options?.cause })
    this.name = 'OllamaError'
    this.code = code
    this.status = options?.status
    this.detail = options?.detail
  }
}

export function createOllamaProvider(options: OllamaOptions = {}): LlmProvider {
  const baseUrl = options.baseUrl ?? OLLAMA_BASE_URL
  const model = options.model ?? OLLAMA_MODEL
  const timeoutMs = options.timeoutMs ?? OLLAMA_TIMEOUT_MS
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

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      let response: Response
      try {
        response = await doFetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        })
      } catch (cause) {
        clearTimeout(timer)
        throw new OllamaError(controller.signal.aborted ? 'timeout' : 'unreachable', { cause })
      }

      let payload: unknown
      try {
        payload = await response.json()
      } catch (cause) {
        clearTimeout(timer)
        if (!response.ok) throw new OllamaError('http', { status: response.status })
        throw new OllamaError('format', { cause })
      } finally {
        clearTimeout(timer)
      }

      if (!response.ok) {
        // Ollama reports the reason in `error`, e.g. a model that is not pulled.
        const detail = isRecord(payload) && typeof payload.error === 'string' ? payload.error : undefined
        throw new OllamaError('http', { status: response.status, detail })
      }

      if (!isRecord(payload) || typeof payload.response !== 'string') {
        throw new OllamaError('format')
      }

      return { text: payload.response }
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

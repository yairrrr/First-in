// LLM provider interface. Layers above depend only on this contract,
// never on Ollama, HTTP, or fixtures directly.

export interface LlmRequest {
  prompt: string
  system?: string
  /**
   * JSON schema the output must satisfy. When present, the provider constrains
   * the model to structured output. Without it, models frequently return the
   * wrong shape or nothing at all.
   */
  schema?: Record<string, unknown>
  /**
   * Called for each chunk of streamed output. Currently unused; part of the
   * contract so streaming can be added without changing callers.
   */
  onToken?: (chunk: string) => void
}

export interface LlmResponse {
  text: string
}

export interface LlmProvider {
  /** Display and diagnostics name. */
  readonly name: string
  complete(request: LlmRequest): Promise<LlmResponse>
}

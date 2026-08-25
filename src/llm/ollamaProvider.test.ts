import { describe, expect, it } from 'vitest'
import { OLLAMA_MODEL, OllamaError, createOllamaProvider } from './ollamaProvider'

function stubFetch(handler: (url: string, init: RequestInit) => unknown) {
  const calls: { url: string; body: Record<string, unknown> }[] = []
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)) })
    return handler(url, init)
  }) as unknown as typeof fetch
  return { impl, calls }
}

function jsonResponse(payload: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => payload } as Response
}

describe('createOllamaProvider', () => {
  it('posts to /api/generate with model, prompt and system', async () => {
    const { impl, calls } = stubFetch(() => jsonResponse({ response: 'hello' }))
    const provider = createOllamaProvider({ fetchImpl: impl })

    const result = await provider.complete({ prompt: 'build a game', system: 'code only' })

    expect(result.text).toBe('hello')
    expect(calls[0].url).toBe('http://localhost:11434/api/generate')
    expect(calls[0].body).toEqual({
      model: OLLAMA_MODEL,
      prompt: 'build a game',
      system: 'code only',
      stream: false,
      think: false,
    })
  })

  it('does not request streaming', async () => {
    const { impl, calls } = stubFetch(() => jsonResponse({ response: '' }))
    await createOllamaProvider({ fetchImpl: impl }).complete({ prompt: 'hi' })
    expect(calls[0].body.stream).toBe(false)
  })

  it('honors an injected base URL and model', async () => {
    const { impl, calls } = stubFetch(() => jsonResponse({ response: '' }))
    const provider = createOllamaProvider({
      baseUrl: 'http://example.test:1234',
      model: 'other',
      fetchImpl: impl,
    })

    expect(provider.name).toBe('ollama:other')
    await provider.complete({ prompt: 'hi' })
    expect(calls[0].url).toBe('http://example.test:1234/api/generate')
    expect(calls[0].body.model).toBe('other')
  })

  it('reports an unreachable server with a code', async () => {
    const { impl } = stubFetch(() => {
      throw new TypeError('fetch failed')
    })
    const provider = createOllamaProvider({ fetchImpl: impl })

    await expect(provider.complete({ prompt: 'hi' })).rejects.toThrow(OllamaError)
    await expect(provider.complete({ prompt: 'hi' })).rejects.toMatchObject({ code: 'unreachable' })
  })

  it('fails on an HTTP error status', async () => {
    const { impl } = stubFetch(() => jsonResponse({}, false, 404))
    const provider = createOllamaProvider({ fetchImpl: impl })
    await expect(provider.complete({ prompt: 'hi' })).rejects.toMatchObject({ code: 'http', status: 404 })
  })

  it('fails on an unexpected payload shape', async () => {
    const { impl } = stubFetch(() => jsonResponse({ nothing: true }))
    const provider = createOllamaProvider({ fetchImpl: impl })
    await expect(provider.complete({ prompt: 'hi' })).rejects.toMatchObject({ code: 'format' })
  })
})

describe('structured output', () => {
  it('sends the schema as format only when provided', async () => {
    const { impl, calls } = stubFetch(() => jsonResponse({ response: '{}' }))
    const provider = createOllamaProvider({ fetchImpl: impl })
    const schema = { type: 'object' }

    await provider.complete({ prompt: 'hi' })
    expect(calls[0].body.format).toBeUndefined()

    await provider.complete({ prompt: 'hi', schema })
    expect(calls[1].body.format).toEqual(schema)
  })

  it('disables model thinking on every request', async () => {
    const { impl, calls } = stubFetch(() => jsonResponse({ response: '' }))
    await createOllamaProvider({ fetchImpl: impl }).complete({ prompt: 'hi' })
    expect(calls[0].body.think).toBe(false)
  })
})

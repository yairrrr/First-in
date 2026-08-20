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
  it('פונה לנתיב הנכון ושולח את המודל, הפרומפט וההנחיה', async () => {
    const { impl, calls } = stubFetch(() => jsonResponse({ response: 'שלום' }))
    const provider = createOllamaProvider({ fetchImpl: impl })

    const result = await provider.complete({ prompt: 'בנה משחק', system: 'החזר קוד בלבד' })

    expect(result.text).toBe('שלום')
    expect(calls[0].url).toBe('http://localhost:11434/api/generate')
    expect(calls[0].body).toEqual({
      model: OLLAMA_MODEL,
      prompt: 'בנה משחק',
      system: 'החזר קוד בלבד',
      stream: false,
    })
  })

  it('אינו מבקש שידור, כי ה-MVP אינו משתמש בו', async () => {
    const { impl, calls } = stubFetch(() => jsonResponse({ response: '' }))
    await createOllamaProvider({ fetchImpl: impl }).complete({ prompt: 'שלום' })
    expect(calls[0].body.stream).toBe(false)
  })

  it('מכבד כתובת ומודל שהוזרקו', async () => {
    const { impl, calls } = stubFetch(() => jsonResponse({ response: '' }))
    const provider = createOllamaProvider({
      baseUrl: 'http://example.test:1234',
      model: 'other',
      fetchImpl: impl,
    })

    expect(provider.name).toBe('ollama:other')
    await provider.complete({ prompt: 'שלום' })
    expect(calls[0].url).toBe('http://example.test:1234/api/generate')
    expect(calls[0].body.model).toBe('other')
  })

  it('מסביר בבירור כששרת המודל אינו זמין', async () => {
    const { impl } = stubFetch(() => {
      throw new TypeError('fetch failed')
    })
    const provider = createOllamaProvider({ fetchImpl: impl })

    await expect(provider.complete({ prompt: 'שלום' })).rejects.toThrow(OllamaError)
    await expect(provider.complete({ prompt: 'שלום' })).rejects.toThrow(/ודא שהוא רץ/)
  })

  it('נכשל כשהשרת מחזיר קוד שגיאה', async () => {
    const { impl } = stubFetch(() => jsonResponse({}, false, 404))
    const provider = createOllamaProvider({ fetchImpl: impl })
    await expect(provider.complete({ prompt: 'שלום' })).rejects.toThrow(/404/)
  })

  it('נכשל כשהתשובה אינה בפורמט המצופה', async () => {
    const { impl } = stubFetch(() => jsonResponse({ nothing: true }))
    const provider = createOllamaProvider({ fetchImpl: impl })
    await expect(provider.complete({ prompt: 'שלום' })).rejects.toThrow(/פורמט/)
  })
})

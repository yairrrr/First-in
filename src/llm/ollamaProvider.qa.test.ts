import { describe, expect, it } from 'vitest'
import { createOllamaProvider } from './ollamaProvider'

// Regression tests for reliability defects found during the release QA audit.

describe('createOllamaProvider failure modes', () => {
  it('times out a request that never completes (QA-004)', async () => {
    const neverResolving = ((_url: string, init: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      })) as unknown as typeof fetch
    const provider = createOllamaProvider({ fetchImpl: neverResolving, timeoutMs: 20 })
    await expect(provider.complete({ prompt: 'hi' })).rejects.toMatchObject({ code: 'timeout' })
  })

  it('surfaces the server-provided reason on HTTP errors (QA-003)', async () => {
    const notFound = (async () =>
      ({ ok: false, status: 404, json: async () => ({ error: "model 'gemma4:12b' not found" }) }) as unknown as Response) as unknown as typeof fetch
    const provider = createOllamaProvider({ fetchImpl: notFound })
    await expect(provider.complete({ prompt: 'hi' })).rejects.toMatchObject({
      code: 'http',
      status: 404,
      detail: "model 'gemma4:12b' not found",
    })
  })

  it('reports a non-JSON body as a format error rather than crashing (QA-005)', async () => {
    const html = (async () =>
      ({ ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token <') } }) as unknown as Response) as unknown as typeof fetch
    const provider = createOllamaProvider({ fetchImpl: html })
    await expect(provider.complete({ prompt: 'hi' })).rejects.toMatchObject({ code: 'format' })
  })

  it('reports an HTTP error even when its body is not JSON', async () => {
    const proxyError = (async () =>
      ({ ok: false, status: 502, json: async () => { throw new SyntaxError('bad') } }) as unknown as Response) as unknown as typeof fetch
    const provider = createOllamaProvider({ fetchImpl: proxyError })
    await expect(provider.complete({ prompt: 'hi' })).rejects.toMatchObject({ code: 'http', status: 502 })
  })
})

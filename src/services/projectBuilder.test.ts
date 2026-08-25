import { describe, expect, it } from 'vitest'
import { BUILD_SYSTEM_PROMPT, BuildError, buildProject, looksLikeHtml } from './projectBuilder'
import { createFixtureProvider } from '../llm/fixtureProvider'
import type { LlmProvider, LlmRequest } from '../llm/types'

function providerReturning(text: string) {
  const seen: LlmRequest[] = []
  const provider: LlmProvider = {
    name: 'stub',
    async complete(request) {
      seen.push(request)
      return { text }
    },
  }
  return { provider, seen }
}

describe('buildProject', () => {
  it('returns the HTML the model produced', async () => {
    const { provider } = providerReturning('<!DOCTYPE html><html><body>hello</body></html>')
    await expect(buildProject(provider, 'build a game')).resolves.toContain('hello')
  })

  it('sends the system prompt and the trimmed user prompt', async () => {
    const { provider, seen } = providerReturning('<!DOCTYPE html><html></html>')
    await buildProject(provider, '  build a memory game  ')

    expect(seen[0].system).toBe(BUILD_SYSTEM_PROMPT)
    expect(seen[0].prompt).toBe('build a memory game')
  })

  it('strips the markdown fence the model adds', async () => {
    const { provider } = providerReturning('```html\n<!DOCTYPE html><html></html>\n```')
    await expect(buildProject(provider, 'build a game')).resolves.toBe('<!DOCTYPE html><html></html>')
  })

  it('fails clearly when the model returns prose instead of code', async () => {
    const { provider } = providerReturning('Sure! Here is an explanation of memory games.')
    await expect(buildProject(provider, 'build a game')).rejects.toThrow(BuildError)
  })

  it('does not call the model for an empty prompt', async () => {
    const { provider, seen } = providerReturning('<!DOCTYPE html><html></html>')
    await expect(buildProject(provider, '   ')).rejects.toMatchObject({ code: 'emptyPrompt' })
    expect(seen).toHaveLength(0)
  })

  it('rejects a document that yields no chapters (QA-007)', async () => {
    const { provider } = providerReturning('<!DOCTYPE html><html><head></head><body></body></html>')
    await expect(buildProject(provider, 'build')).rejects.toMatchObject({ code: 'emptyOutput' })
  })

  it('works end to end with the recorded provider', async () => {
    const html = await buildProject(createFixtureProvider(), 'memory game')
    expect(html).toContain('<script>')
  })
})

describe('looksLikeHtml', () => {
  it('recognizes an HTML document', () => {
    expect(looksLikeHtml('<!DOCTYPE html><html></html>')).toBe(true)
    expect(looksLikeHtml('\n  <html lang="he">')).toBe(true)
  })

  it('rejects prose even when it contains tags', () => {
    expect(looksLikeHtml('Here is the code: <div>hi</div>')).toBe(false)
    expect(looksLikeHtml('')).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { REVISE_MARKER, REVISE_SYSTEM_PROMPT, buildRevisePrompt, reviseProject } from './projectReviser'
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

describe('reviseProject', () => {
  it('sends the instruction and current code, and returns the updated file', async () => {
    const { provider, seen } = providerReturning('```html\n<!DOCTYPE html><html><body>v2</body></html>\n```')
    const html = await reviseProject(provider, '<!DOCTYPE html><html><body>v1</body></html>', ' make the button bigger ')
    expect(html).toContain('v2')
    expect(seen[0].system).toBe(REVISE_SYSTEM_PROMPT)
    expect(seen[0].prompt).toContain('make the button bigger')
    expect(seen[0].prompt).toContain(REVISE_MARKER)
    expect(seen[0].prompt).toContain('v1')
  })

  it('rejects an empty instruction without calling the model', async () => {
    const { provider, seen } = providerReturning('<html></html>')
    await expect(reviseProject(provider, '<html></html>', '  ')).rejects.toMatchObject({ code: 'emptyPrompt' })
    expect(seen).toHaveLength(0)
  })

  it('fails when the model returns prose instead of a file', async () => {
    const { provider } = providerReturning('Sure, here is what I would change...')
    await expect(reviseProject(provider, '<html></html>', 'change')).rejects.toMatchObject({ code: 'notHtml' })
  })

  it('recorded provider echoes the code with the instruction, so demo mode shows the flow', async () => {
    const code = '<!DOCTYPE html><html><body><h1>hi</h1></body></html>'
    const html = await reviseProject(createFixtureProvider(), code, 'red color')
    expect(html).toContain('<h1>hi</h1>')
    expect(html).toContain('red color')
  })
})

describe('buildRevisePrompt', () => {
  it('places the instruction before the code, separated by the marker', () => {
    const prompt = buildRevisePrompt('<html></html>', 'x')
    expect(prompt.indexOf('x')).toBeLessThan(prompt.indexOf(REVISE_MARKER))
    expect(prompt.indexOf(REVISE_MARKER)).toBeLessThan(prompt.indexOf('<html></html>'))
  })
})

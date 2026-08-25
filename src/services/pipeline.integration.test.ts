import { describe, expect, it } from 'vitest'
import process from 'node:process'
import { createOllamaProvider } from '../llm/ollamaProvider'
import { buildProject } from './projectBuilder'
import { splitCode } from './codeSplitter'
import { looksLikeHtml } from './projectBuilder'

/**
 * Integration test against a live Ollama instance. Skipped by `npm test`
 * because it takes about a minute and depends on an external process.
 * Run with `npm run test:e2e` while Ollama is running with the model pulled.
 */
describe.skipIf(!process.env.FIRST_IN_E2E)('full pipeline against the local model', () => {
  it('builds working code from a prompt and splits it into chapters', { timeout: 600_000 }, async () => {
    const provider = createOllamaProvider()

    const html = await buildProject(
      provider,
      'A counter app with a plus button, a minus button and a reset button.',
    )

    expect(looksLikeHtml(html)).toBe(true)
    expect(html).toContain('<script')

    const chapters = splitCode(html)
    expect(chapters.length).toBeGreaterThan(2)
    expect(chapters.every((chapter) => chapter.code.trim().length > 0)).toBe(true)
  })
})

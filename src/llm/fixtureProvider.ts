import type { LlmProvider, LlmRequest, LlmResponse } from './types'
import type { Language } from '../state/types'
import { REVISE_MARKER } from '../services/projectReviser'
import memoryHtml from './fixtures/samples/memory.html?raw'
import assembleHe from './fixtures/samples/lesson-assemble.json?raw'
import choiceHe from './fixtures/samples/lesson-choice.json?raw'
import assembleEn from './fixtures/samples/lesson-assemble.en.json?raw'
import choiceEn from './fixtures/samples/lesson-choice.en.json?raw'

const LESSONS: Record<Language, { assemble: string; choice: string }> = {
  he: { assemble: assembleHe, choice: choiceHe },
  en: { assemble: assembleEn, choice: choiceEn },
}

/**
 * Provider that returns recorded responses without contacting a model.
 * Used for deterministic tests and for demo mode when Ollama is unavailable.
 *
 * The recordings are real gemma4:12b output. Known limitation: in demo mode
 * every chapter shares the same two recorded lessons per language.
 */
export function createFixtureProvider(language: Language = 'he'): LlmProvider {
  return {
    name: 'fixture',
    async complete(request: LlmRequest): Promise<LlmResponse> {
      // Revision request: echo the current code with a visible demo note.
      if (!request.schema && request.prompt.includes(REVISE_MARKER)) {
        return { text: demoRevision(request.prompt) }
      }
      // No schema means a build request; with a schema, the lesson kind is inferred from its shape.
      if (!request.schema) return { text: memoryHtml }
      const properties = (request.schema.properties ?? {}) as Record<string, unknown>
      const lessons = LESSONS[language]
      return { text: 'tokens' in properties ? lessons.assemble : lessons.choice }
    },
  }
}

/**
 * Demo mode cannot rewrite code. The current code is returned with a small
 * banner quoting the instruction, so the revision flow is visible end to end.
 */
function demoRevision(prompt: string): string {
  const instruction = (/^The user's request: (.*)$/m.exec(prompt)?.[1] ?? '').trim()
  const code = prompt.slice(prompt.indexOf(REVISE_MARKER) + REVISE_MARKER.length).trim()
  const note =
    `<p style="margin:0;padding:6px 12px;background:#1b1b26;color:#9b9bb0;` +
    `font:13px system-ui;text-align:center">Demo revision: ${escapeHtml(instruction)}</p>`
  return code.includes('<body') ? code.replace(/<body([^>]*)>/i, `<body$1>${note}`) : note + code
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)
}

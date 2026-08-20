import type { LlmProvider, LlmRequest, LlmResponse } from './types'

/** Ollama רץ מקומית ואינו דורש מפתח. אומת ב-SPIKE-002 שהדפדפן רשאי לפנות אליו. */
export const OLLAMA_BASE_URL = 'http://localhost:11434'

/** נבחר ב-ADR-002. */
export const OLLAMA_MODEL = 'gemma4:12b'

export interface OllamaOptions {
  baseUrl?: string
  model?: string
  /** מוזרק בבדיקות, כדי שלא נדבר עם שרת אמיתי. */
  fetchImpl?: typeof fetch
}

/** נזרקת כשהמודל לא זמין או החזיר תשובה שאי אפשר לקרוא. */
export class OllamaError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'OllamaError'
  }
}

export function createOllamaProvider(options: OllamaOptions = {}): LlmProvider {
  const baseUrl = options.baseUrl ?? OLLAMA_BASE_URL
  const model = options.model ?? OLLAMA_MODEL
  const doFetch = options.fetchImpl ?? fetch

  return {
    name: `ollama:${model}`,

    async complete(request: LlmRequest): Promise<LlmResponse> {
      // ה-MVP אינו משתמש בשידור — ראה ADR-004. הממשק מאפשר להוסיפו בלי לשנות חוזה.
      const body = {
        model,
        prompt: request.prompt,
        system: request.system,
        stream: false,
        // gemma4 הוא מודל חושב. בלי לכבות את זה, החשיבה בולעת את התשובה —
        // דקות של עבודה ואז response ריק. אומת ב-SPIKE-004.
        think: false,
        // סכמה מלאה במקום 'json': המודל מאולץ לצורה הנכונה, לא רק ל-JSON כלשהו.
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
        throw new OllamaError(
          `אין תשובה מ-Ollama בכתובת ${baseUrl}. ודא שהוא רץ, ושהמודל ${model} מותקן.`,
          { cause },
        )
      }

      if (!response.ok) {
        throw new OllamaError(`Ollama החזיר שגיאה ${response.status}`)
      }

      const payload = (await response.json()) as { response?: unknown }
      if (typeof payload.response !== 'string') {
        throw new OllamaError('התשובה מ-Ollama אינה בפורמט המצופה')
      }

      return { text: payload.response }
    },
  }
}

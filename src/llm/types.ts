// ממשק ספק ה-LLM.
// השכבות שמעל מכירות רק את הממשק הזה, ולא את Ollama, HTTP או fixtures.

export interface LlmRequest {
  prompt: string
  system?: string
  /**
   * סכמת JSON שהפלט חייב לעמוד בה. כשהיא קיימת, הספק כופה על המודל פלט מובנה.
   * אומת ב-SPIKE-004: בלי אכיפה המודל מחזיר צורות שגויות או כלום.
   */
  schema?: Record<string, unknown>
  /**
   * נקרא לכל פיסת טקסט שמגיעה מהמודל.
   * ה-MVP אינו משתמש בו, אבל הממשק מאפשר שידור חי בעתיד ללא שינוי חוזה.
   */
  onToken?: (chunk: string) => void
}

export interface LlmResponse {
  text: string
}

export interface LlmProvider {
  /** שם לתצוגה ולניפוי שגיאות. */
  readonly name: string
  complete(request: LlmRequest): Promise<LlmResponse>
}

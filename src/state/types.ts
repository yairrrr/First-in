// Data model of the state layer. Everything the app knows lives in `AppState`;
// no other module holds application data.

export type ProjectStatus = 'building' | 'ready' | 'failed'

/** Difficulty tiers. Derived from the learner's global rank, see rank.ts. */
export type LessonDifficulty = 'intro' | 'core' | 'deep'

/** Multiple-choice exercise: exactly four options, one correct answer. */
export interface ChoiceExercise {
  kind: 'choice'
  question: string
  options: string[]
  /** Zero-based index of the correct option. */
  correctIndex: number
}

/**
 * Tap-to-assemble exercise: the learner taps shuffled tokens in order to
 * rebuild a real line from the project's code.
 */
export interface AssembleExercise {
  kind: 'assemble'
  /** Plain-language description of what the assembled line does. */
  instruction: string
  /** Tokens in the correct order. The UI shuffles them before display. */
  tokens: string[]
}

export type Exercise = ChoiceExercise | AssembleExercise

/** A chapter lesson: a short concept paragraph, a code example, then an exercise. */
export interface Lesson {
  /** Difficulty the lesson was generated at. Also controls how much code the chapter screen shows. */
  difficulty: LessonDifficulty
  /** The concept paragraph shown before the exercise. */
  concept: string
  /**
   * One to three real lines from the chapter code that demonstrate the concept.
   * Beginners may not know any syntax, so the concept must be shown, not just told.
   */
  example: string
  exercise: Exercise
}

/**
 * Chapter titles are structured rather than pre-rendered strings so they can be
 * displayed in the current UI language, not the language active at build time.
 */
export type ChapterTitle =
  | { kind: 'markup' }
  | { kind: 'css'; selector: string; more: number }
  | { kind: 'function'; name: string }
  | { kind: 'wiring'; n: number }

/** One learning chapter: a slice of the generated project and the learner's progress on it. */
export interface Chapter {
  id: string
  title: ChapterTitle
  /** Small units merged into this chapter because they were too short to stand alone. Surfaced in the title. */
  extraUnits: number
  /** The slice of generated code this chapter teaches. */
  code: string
  completed: boolean
  /** Generated on demand and cached so the model is not called again on every visit. */
  lesson: Lesson | null
  /** Number of answers submitted. Drives the "correct on first try" metric. */
  attempts: number
}

export type RevisionStatus = 'working' | 'applied' | 'failed'

/**
 * One instruction in the conversation about a built project ("make the buttons bigger").
 * The model receives the current code and returns an updated version.
 */
export interface Revision {
  id: string
  instruction: string
  status: RevisionStatus
  /** Display message when the revision failed. */
  message: string | null
  createdAt: string
}

/** Number of previous versions kept for undo. Bounded because state lives in localStorage. */
export const MAX_PREVIOUS_VERSIONS = 5

/** Snapshot of a version: code and chapters together, so undo restores learning progress too. */
export interface ProjectVersion {
  code: string
  chapters: Chapter[]
}

export interface Project {
  id: string
  /** The user's original request, verbatim. */
  prompt: string
  /** Revision history after the initial build, oldest first. */
  revisions: Revision[]
  /** Previous versions, oldest first, for undo. */
  previousVersions: ProjectVersion[]
  /** Provider that built the project. Lessons must come from the same source. */
  provider: 'ollama' | 'fixture'
  status: ProjectStatus
  /** Generated HTML. Empty until the build completes. */
  code: string
  chapters: Chapter[]
  points: number
  /** Display message when the build failed. */
  error: string | null
  /** ISO 8601. */
  createdAt: string
}

export type Language = 'he' | 'en'

export interface AppState {
  projects: Project[]
  /** Accumulated experience across all projects. Determines the rank, see rank.ts. */
  xp: number
  /** UI and lesson language. */
  language: Language
}

export type Action =
  | { type: 'PROJECT_CREATED'; project: Project }
  | { type: 'BUILD_SUCCEEDED'; projectId: string; code: string; chapters: Chapter[] }
  | { type: 'BUILD_FAILED'; projectId: string; message: string }
  | { type: 'PROJECT_DELETED'; projectId: string }
  | { type: 'BUILD_STARTED'; projectId: string }
  | { type: 'LANGUAGE_CHANGED'; language: Language }
  | { type: 'REVISION_STARTED'; projectId: string; revision: Revision }
  | { type: 'REVISION_SUCCEEDED'; projectId: string; revisionId: string; code: string; chapters: Chapter[] }
  | { type: 'REVISION_FAILED'; projectId: string; revisionId: string; message: string }
  | { type: 'REVISION_REVERTED'; projectId: string }
  | { type: 'LESSON_LOADED'; projectId: string; chapterId: string; lesson: Lesson }
  | { type: 'CHAPTER_ANSWERED'; projectId: string; chapterId: string; correct: boolean }

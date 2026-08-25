import type {
  AppState,
  Chapter,
  ChapterTitle,
  Exercise,
  Language,
  Lesson,
  Project,
  ProjectStatus,
  ProjectVersion,
  Revision,
} from './types'
import { MAX_TOKENS, MIN_TOKENS, OPTION_COUNT } from '../services/lessonGenerator'

/**
 * State persistence in localStorage. There is no server and no database.
 *
 * The key is versioned: when the data model changes incompatibly, old state
 * must not be loaded into code that no longer understands it.
 */
export const STORAGE_KEY = 'first-in/state/v1'

/** Minimal localStorage surface, so tests can inject a fake. */
export interface StateStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const EMPTY: AppState = { projects: [], xp: 0, language: 'he' }

export function loadState(storage: StateStorage | undefined): AppState {
  if (!storage) return EMPTY

  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    // Storage access can throw (privacy settings). Start empty rather than crash.
    return EMPTY
  }
  if (!raw) return EMPTY

  try {
    const parsed: unknown = JSON.parse(raw)
    return { projects: toProjects(parsed), xp: toXp(parsed), language: toLanguage(parsed) }
  } catch {
    return EMPTY
  }
}

/** Returns false when the write failed (typically quota exceeded), so the UI can warn. */
export function saveState(storage: StateStorage | undefined, state: AppState): boolean {
  if (!storage) return true
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

function toLanguage(parsed: unknown): Language {
  if (!isRecord(parsed)) return 'he'
  return parsed.language === 'en' ? 'en' : 'he'
}

/** State saved before XP existed loads with zero. */
function toXp(parsed: unknown): number {
  if (!isRecord(parsed)) return 0
  const xp = parsed.xp
  return typeof xp === 'number' && Number.isFinite(xp) && xp >= 0 ? Math.floor(xp) : 0
}

/**
 * Stored state comes from disk, not from this code, so every field is validated.
 * A corrupt project is dropped without discarding the rest.
 */
function toProjects(parsed: unknown): Project[] {
  if (!isRecord(parsed) || !Array.isArray(parsed.projects)) return []

  const projects: Project[] = []
  for (const candidate of parsed.projects) {
    const project = toProject(candidate)
    if (project) projects.push(project)
  }
  return projects
}

function toProject(candidate: unknown): Project | null {
  if (!isRecord(candidate)) return null
  if (typeof candidate.id !== 'string' || typeof candidate.prompt !== 'string') return null

  return {
    id: candidate.id,
    prompt: candidate.prompt,
    // Projects saved before the field existed default to the real model.
    provider: candidate.provider === 'fixture' ? 'fixture' : 'ollama',
    // A build interrupted by a reload can never finish, so it loads as failed.
    status: toStatus(candidate.status),
    code: typeof candidate.code === 'string' ? candidate.code : '',
    chapters: Array.isArray(candidate.chapters) ? candidate.chapters.flatMap(toChapter) : [],
    revisions: Array.isArray(candidate.revisions) ? candidate.revisions.flatMap(toRevision) : [],
    previousVersions: Array.isArray(candidate.previousVersions)
      ? candidate.previousVersions.flatMap(toVersion)
      : [],
    points: typeof candidate.points === 'number' ? candidate.points : 0,
    error: candidate.status === 'building' ? 'interrupted' : toError(candidate.error),
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : '',
  }
}

function toVersion(candidate: unknown): ProjectVersion[] {
  if (!isRecord(candidate) || typeof candidate.code !== 'string') return []
  const chapters = Array.isArray(candidate.chapters) ? candidate.chapters.flatMap(toChapter) : []
  return [{ code: candidate.code, chapters }]
}

/** A revision interrupted by a reload can never finish; it loads as failed. */
function toRevision(candidate: unknown): Revision[] {
  if (!isRecord(candidate)) return []
  if (typeof candidate.id !== 'string' || typeof candidate.instruction !== 'string') return []
  const status =
    candidate.status === 'applied' || candidate.status === 'reverted' ? candidate.status : 'failed'
  return [
    {
      id: candidate.id,
      instruction: candidate.instruction,
      status,
      message:
        candidate.status === 'working'
          ? 'interrupted'
          : typeof candidate.message === 'string'
            ? candidate.message
            : null,
      createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : '',
    },
  ]
}

function toStatus(value: unknown): ProjectStatus {
  if (value === 'ready') return 'ready'
  return 'failed'
}

function toError(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function toChapter(candidate: unknown): Chapter[] {
  if (!isRecord(candidate)) return []
  if (typeof candidate.id !== 'string' || typeof candidate.code !== 'string') return []

  const title = toTitle(candidate.title)
  if (!title) return []

  return [
    {
      id: candidate.id,
      title,
      extraUnits: typeof candidate.extraUnits === 'number' ? candidate.extraUnits : 0,
      code: candidate.code,
      completed: candidate.completed === true,
      lesson: toLesson(candidate.lesson),
      attempts: typeof candidate.attempts === 'number' ? candidate.attempts : 0,
    },
  ]
}

/** Legacy string titles cannot be localized; such chapters are dropped. */
function toTitle(candidate: unknown): ChapterTitle | null {
  if (!isRecord(candidate)) return null
  switch (candidate.kind) {
    case 'markup':
      return { kind: 'markup' }
    case 'css':
      return typeof candidate.selector === 'string' && typeof candidate.more === 'number'
        ? { kind: 'css', selector: candidate.selector, more: candidate.more }
        : null
    case 'function':
      return typeof candidate.name === 'string' ? { kind: 'function', name: candidate.name } : null
    case 'wiring':
      return typeof candidate.n === 'number' ? { kind: 'wiring', n: candidate.n } : null
    default:
      return null
  }
}

/** A corrupt or legacy lesson is dropped and regenerated on the next visit. */
function toLesson(candidate: unknown): Lesson | null {
  if (!isRecord(candidate)) return null
  if (typeof candidate.concept !== 'string' || !candidate.concept) return null
  const difficulty = candidate.difficulty
  if (difficulty !== 'intro' && difficulty !== 'core' && difficulty !== 'deep') return null
  const exercise = toExercise(candidate.exercise)
  if (!exercise) return null

  const example = typeof candidate.example === 'string' ? candidate.example : ''
  return { difficulty, concept: candidate.concept, example, exercise }
}

function toExercise(candidate: unknown): Exercise | null {
  if (!isRecord(candidate)) return null

  if (candidate.kind === 'choice') {
    if (typeof candidate.question !== 'string' || !candidate.question) return null
    if (!Array.isArray(candidate.options) || candidate.options.length !== OPTION_COUNT) return null
    if (!candidate.options.every((option) => typeof option === 'string')) return null
    const correctIndex = candidate.correctIndex
    if (typeof correctIndex !== 'number' || correctIndex < 0 || correctIndex >= OPTION_COUNT) {
      return null
    }
    return { kind: 'choice', question: candidate.question, options: candidate.options, correctIndex }
  }

  if (candidate.kind === 'assemble') {
    if (typeof candidate.instruction !== 'string' || !candidate.instruction) return null
    if (!Array.isArray(candidate.tokens)) return null
    if (candidate.tokens.length < MIN_TOKENS || candidate.tokens.length > MAX_TOKENS) return null
    if (!candidate.tokens.every((token) => typeof token === 'string' && token)) return null
    return { kind: 'assemble', instruction: candidate.instruction, tokens: candidate.tokens }
  }

  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

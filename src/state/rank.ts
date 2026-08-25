import type { LessonDifficulty } from './types'

/**
 * Learner rank. Global across projects: every correct answer adds XP, XP
 * determines the rank, and the rank determines lesson difficulty everywhere.
 */

export interface Rank {
  /** 1-based level. The display name is localized by level, see strings.ts (`rank.N`). */
  level: number
  /** Minimum XP for this rank. */
  minXp: number
  /** Lesson difficulty served to learners at this rank. */
  difficulty: LessonDifficulty
}

/** Rank ladder. Thresholds are strictly increasing. */
export const RANKS: readonly Rank[] = [
  { level: 1, minXp: 0, difficulty: 'intro' },
  { level: 2, minXp: 60, difficulty: 'intro' },
  { level: 3, minXp: 150, difficulty: 'core' },
  { level: 4, minXp: 300, difficulty: 'core' },
  { level: 5, minXp: 500, difficulty: 'deep' },
]

/** Base XP for a correct answer, by the difficulty of the question answered. */
export const XP_BY_DIFFICULTY: Record<LessonDifficulty, number> = {
  intro: 10,
  core: 20,
  deep: 30,
}

/** Bonus for answering correctly on the first attempt. */
export const FIRST_TRY_BONUS = 5

export function rankForXp(xp: number): Rank {
  let current = RANKS[0]
  for (const rank of RANKS) {
    if (xp >= rank.minXp) current = rank
  }
  return current
}

/** The next rank, or null at the top. */
export function nextRank(xp: number): Rank | null {
  const current = rankForXp(xp)
  return RANKS.find((rank) => rank.level === current.level + 1) ?? null
}

/** Progress within the current rank, 0..1. Always 1 at the top rank. */
export function rankProgress(xp: number): number {
  const current = rankForXp(xp)
  const next = nextRank(xp)
  if (!next) return 1
  return (xp - current.minXp) / (next.minXp - current.minXp)
}

/** XP earned by a correct answer. */
export function xpForAnswer(difficulty: LessonDifficulty, attempts: number): number {
  return XP_BY_DIFFICULTY[difficulty] + (attempts === 1 ? FIRST_TRY_BONUS : 0)
}

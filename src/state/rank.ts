import type { LessonDifficulty } from './types'

/**
 * דרגת המשתמש — גלובלית, חוצה פרויקטים. כל תשובה נכונה מוסיפה XP,
 * וה-XP קובע את הדרגה. הדרגה קובעת את רמת השאלות בכל פרויקט.
 *
 * זו ההבהרה של יאיר (2026-08-21): "שלבים" הם דרגת המשתמש, לא התקדמות בפרויקט.
 */

export interface Rank {
  /** מספר הדרגה, החל מ-1. השם מתורגם לפי המספר — ראה strings.ts, rank.N. */
  level: number
  /** XP מינימלי לדרגה. */
  minXp: number
  /** רמת השאלות למי שבדרגה זו. */
  difficulty: LessonDifficulty
}

/** סולם הדרגות. הסף של כל דרגה גבוה מקודמתה. */
export const RANKS: readonly Rank[] = [
  { level: 1, minXp: 0, difficulty: 'intro' },
  { level: 2, minXp: 60, difficulty: 'intro' },
  { level: 3, minXp: 150, difficulty: 'core' },
  { level: 4, minXp: 300, difficulty: 'core' },
  { level: 5, minXp: 500, difficulty: 'deep' },
]

/** XP בסיסי לתשובה נכונה, לפי רמת השאלה שנענתה. */
export const XP_BY_DIFFICULTY: Record<LessonDifficulty, number> = {
  intro: 10,
  core: 20,
  deep: 30,
}

/** תוספת למי שענה נכון מהניסיון הראשון. */
export const FIRST_TRY_BONUS = 5

export function rankForXp(xp: number): Rank {
  let current = RANKS[0]
  for (const rank of RANKS) {
    if (xp >= rank.minXp) current = rank
  }
  return current
}

/** הדרגה הבאה, או null בדרגה העליונה. */
export function nextRank(xp: number): Rank | null {
  const current = rankForXp(xp)
  return RANKS.find((rank) => rank.level === current.level + 1) ?? null
}

/** התקדמות בתוך הדרגה הנוכחית, בין 0 ל-1. בדרגה העליונה תמיד 1. */
export function rankProgress(xp: number): number {
  const current = rankForXp(xp)
  const next = nextRank(xp)
  if (!next) return 1
  return (xp - current.minXp) / (next.minXp - current.minXp)
}

/** ה-XP שתשובה נכונה מזכה בו. */
export function xpForAnswer(difficulty: LessonDifficulty, attempts: number): number {
  return XP_BY_DIFFICULTY[difficulty] + (attempts === 1 ? FIRST_TRY_BONUS : 0)
}

import { describe, expect, it } from 'vitest'
import { RANKS, nextRank, rankForXp, rankProgress, xpForAnswer } from './rank'

describe('rankForXp', () => {
  it('starts at rank 1 and climbs by threshold', () => {
    expect(rankForXp(0).level).toBe(1)
    expect(rankForXp(59).level).toBe(1)
    expect(rankForXp(60).level).toBe(2)
    expect(rankForXp(150).level).toBe(3)
    expect(rankForXp(500).level).toBe(5)
    expect(rankForXp(9999).level).toBe(5)
  })

  it('maps low ranks to easy questions and high ranks to hard ones', () => {
    expect(rankForXp(0).difficulty).toBe('intro')
    expect(rankForXp(150).difficulty).toBe('core')
    expect(rankForXp(500).difficulty).toBe('deep')
  })

  it('has strictly increasing thresholds and levels', () => {
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i].minXp).toBeGreaterThan(RANKS[i - 1].minXp)
      expect(RANKS[i].level).toBe(RANKS[i - 1].level + 1)
    }
  })
})

describe('nextRank and rankProgress', () => {
  it('computes progress within the current rank', () => {
    expect(nextRank(0)?.level).toBe(2)
    expect(rankProgress(0)).toBe(0)
    expect(rankProgress(30)).toBe(0.5)
    expect(rankProgress(60)).toBe(0)
  })

  it('has no next rank at the top and full progress', () => {
    expect(nextRank(500)).toBeNull()
    expect(rankProgress(700)).toBe(1)
  })
})

describe('xpForAnswer', () => {
  it('rewards harder questions more and adds a first-try bonus', () => {
    expect(xpForAnswer('intro', 1)).toBe(15)
    expect(xpForAnswer('intro', 2)).toBe(10)
    expect(xpForAnswer('deep', 1)).toBe(35)
  })
})

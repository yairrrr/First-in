import { useApp } from '../state/AppContext'
import { nextRank, rankForXp, rankProgress } from '../state/rank'

/**
 * באנר הדרגה בכותרת העליונה: הדרגה הגלובלית של המשתמש, ה-XP,
 * וכמה חסר לדרגה הבאה. מוצג בכל מסך, כי הדרגה חוצה פרויקטים.
 */
export function StageBanner() {
  const { state } = useApp()
  const rank = rankForXp(state.xp)
  const next = nextRank(state.xp)
  const progress = Math.round(rankProgress(state.xp) * 100)

  const hint = next
    ? `${next.minXp - state.xp} XP לדרגה ${next.level} · ${next.name}`
    : 'הדרגה העליונה'

  return (
    <div className="stage-banner" title={hint}>
      <span className="rank-level" aria-hidden="true">
        {rank.level}
      </span>
      <span className="rank-body">
        <span className="stage-text">
          דרגה {rank.level} · {rank.name}
        </span>
        <span className="rank-bar" aria-hidden="true">
          <span className="rank-fill" style={{ width: `${progress}%` }} />
        </span>
      </span>
      <span className="stage-points">{state.xp} XP</span>
    </div>
  )
}

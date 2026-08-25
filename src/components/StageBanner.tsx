import { useApp } from '../state/AppContext'
import { nextRank, rankForXp, rankProgress } from '../state/rank'
import { useT } from '../i18n/useT'
import type { StringKey } from '../i18n/strings'

/** Header rank banner: current rank, XP, and progress toward the next rank. */
export function StageBanner() {
  const { state } = useApp()
  const { t } = useT()
  const rank = rankForXp(state.xp)
  const next = nextRank(state.xp)
  const progress = Math.round(rankProgress(state.xp) * 100)
  const nameOf = (level: number) => t(`rank.${level}` as StringKey)

  const hint = next
    ? t('rank.toNext', { xp: next.minXp - state.xp, level: next.level, name: nameOf(next.level) })
    : t('rank.top')

  return (
    <div className="stage-banner" title={hint}>
      <span className="rank-level" aria-hidden="true">
        {rank.level}
      </span>
      <span className="rank-body">
        <span className="stage-text">
          {t('rank.label', { level: rank.level, name: nameOf(rank.level) })}
        </span>
        <span className="rank-bar" aria-hidden="true">
          <span className="rank-fill" style={{ width: `${progress}%` }} />
        </span>
      </span>
      <span className="stage-points">{state.xp} XP</span>
    </div>
  )
}

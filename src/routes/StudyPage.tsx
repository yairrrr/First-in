import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { nextChapterToPrefetch, useProjectActions } from '../state/useProjectActions'
import { firstTryStats, progressPercent } from '../state/reducer'
import { rankForXp, xpForAnswer } from '../state/rank'
import { BidiText } from '../components/BidiText'
import { Icon, type IconName } from '../components/Icon'
import { ProgressRing } from '../components/ProgressRing'
import { useT } from '../i18n/useT'
import { chapterTitleText } from '../i18n/chapterTitle'
import type { ChapterTitle } from '../state/types'

/** Icon per chapter kind, shared across the app. */
export function iconForChapter(title: ChapterTitle): IconName {
  if (title.kind === 'markup') return 'layout'
  if (title.kind === 'css') return 'palette'
  return 'braces'
}

/** Study map: one station per chapter, connected in build order. */
export function StudyPage() {
  const { id } = useParams()
  const { state } = useApp()
  const { loadLesson } = useProjectActions()
  const { t, language } = useT()
  const project = state.projects.find((candidate) => candidate.id === id)

  // Visitors usually continue to the next chapter in line; generating its lesson
  // now makes opening it instant instead of a model round-trip.
  const projectId = project?.id
  useEffect(() => {
    if (!project || project.status !== 'ready') return
    const target = nextChapterToPrefetch(project)
    if (target) void loadLesson(project, target)
    // Runs once per project; `project` and `loadLesson` change on every state update.
  }, [projectId])

  if (!project || project.status !== 'ready') {
    return (
      <section className="panel page-enter">
        <h2>{t('study.nothingYet')}</h2>
        <p className="empty">{t('study.nothingHint')}</p>
        <Link to="/">{t('nav.back')}</Link>
      </section>
    )
  }

  const percent = progressPercent(project)
  const { firstTry, completed } = firstTryStats(project)
  const left = project.chapters.length - completed
  // Completion is decided by count: a rounded percentage can reach 100 with a chapter left.
  const allDone = project.chapters.length > 0 && left === 0
  // The next station: the first chapter not yet completed.
  const nextIndex = project.chapters.findIndex((chapter) => !chapter.completed)
  // XP an open chapter yields for a first-try answer at the current rank.
  const reward = xpForAnswer(rankForXp(state.xp).difficulty, 1)

  return (
    <section className="panel page-enter">
      <div className="study-head">
        <h2>{t('study.title')}</h2>
        <Link to={`/project/${project.id}`} className="ghost link-button">
          <Icon name="back" size={14} />
          {t('nav.backToProject')}
        </Link>
      </div>

      {allDone && (
        <div className="done-banner">
          <Icon name="trophy" size={28} />
          <span>
            <p>{t('study.done')}</p>
            <p className="empty">
              {t('study.doneStats', { points: project.points, firstTry, completed })}
            </p>
          </span>
        </div>
      )}

      <div className="summary">
        <ProgressRing percent={percent} />
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-value">{project.points}</span>
            <span className="stat-label">{t('study.summary.points')}</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {firstTry}/{completed}
            </span>
            <span className="stat-label">{t('study.summary.firstTry')}</span>
          </div>
          <div className="stat">
            <span className="stat-value">{left}</span>
            <span className="stat-label">{t('study.summary.left')}</span>
          </div>
        </div>
      </div>

      <ol className="chapter-list">
        {project.chapters.map((chapter, index) => {
          const rowState = chapter.completed ? 'done' : index === nextIndex ? 'next' : ''
          return (
            <li key={chapter.id} className={`chapter-row ${rowState}`}>
              <span className="node-col" aria-hidden="true">
                <span className="node">
                  {chapter.completed ? <Icon name="check" size={16} /> : index + 1}
                </span>
                <span className="trail" />
              </span>
              <Link to={`/project/${project.id}/study/${index + 1}`} className="chapter-card">
                <span className="chapter-icon">
                  <Icon name={iconForChapter(chapter.title)} size={18} />
                </span>
                <span className="chapter-title">
                  <BidiText text={chapterTitleText(language, chapter)} />
                </span>
                <span className="chapter-side">
                  {chapter.completed ? (
                    <span className="meta">
                      {chapter.attempts === 1 ? t('study.completedFirstTry') : t('study.completed')}
                    </span>
                  ) : (
                    <>
                      {index === nextIndex && <span className="meta">{t('study.next')}</span>}
                      <span className="xp-chip">
                        <Icon name="bolt" size={11} />
                        {t('study.xpReward', { xp: reward })}
                      </span>
                    </>
                  )}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { nextChapterToPrefetch, useProjectActions } from '../state/useProjectActions'
import { firstTryStats, progressPercent } from '../state/reducer'
import { BidiText } from '../components/BidiText'
import { useT } from '../i18n/useT'
import { chapterTitleText } from '../i18n/chapterTitle'

/** Your Study — מפת המסע: תחנה לכל פרק, קו שמחבר ביניהן. חדר נפרד, ראה ADR-003. */
export function StudyPage() {
  const { id } = useParams()
  const { state } = useApp()
  const { loadLesson } = useProjectActions()
  const { t, language } = useT()
  const project = state.projects.find((candidate) => candidate.id === id)

  // מי שנכנס למפה בדרך כלל ימשיך לפרק הבא בתור. השיעור שלו נוצר כבר עכשיו
  // ברקע, כדי שהכניסה לפרק תהיה מיידית במקום רבע דקה של המתנה.
  useEffect(() => {
    if (!project || project.status !== 'ready') return
    const target = nextChapterToPrefetch(project)
    if (target) void loadLesson(project, target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id])

  if (!project || project.status !== 'ready') {
    return (
      <section className="panel">
        <h2>{t('study.nothingYet')}</h2>
        <p className="empty">{t('study.nothingHint')}</p>
        <Link to="/">{t('nav.back')}</Link>
      </section>
    )
  }

  const percent = progressPercent(project)
  const { firstTry, completed } = firstTryStats(project)
  // התחנה הבאה בתור: הפרק הראשון שטרם הושלם.
  const nextIndex = project.chapters.findIndex((chapter) => !chapter.completed)

  return (
    <section className="panel">
      <h2>{t('study.title')}</h2>

      {percent === 100 && (
        <div className="done-banner">
          <p>{t('study.done')}</p>
          <p className="empty">
            {t('study.doneStats', { points: project.points, firstTry, completed })}
          </p>
        </div>
      )}

      <div className="progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <span className="meta">
          {t('study.progress', { percent, points: project.points })}
          {completed > 0 && percent < 100 && t('study.firstTry', { firstTry, completed })}
        </span>
      </div>

      <ol className="chapter-list">
        {project.chapters.map((chapter, index) => {
          const rowState = chapter.completed ? 'done' : index === nextIndex ? 'next' : ''
          return (
            <li key={chapter.id} className={`chapter-row ${rowState}`}>
              <span className="node-col" aria-hidden="true">
                <span className="node">{chapter.completed ? '✓' : index + 1}</span>
                <span className="trail" />
              </span>
              <Link to={`/project/${project.id}/study/${index + 1}`} className="chapter-card">
                <span className="chapter-title">
                  <BidiText text={chapterTitleText(language, chapter)} />
                </span>
                <span className="meta">
                  {chapter.completed
                    ? chapter.attempts === 1
                      ? t('study.completedFirstTry')
                      : t('study.completed')
                    : index === nextIndex
                      ? t('study.next')
                      : ''}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>

      <Link to={`/project/${project.id}`}>{t('nav.backToProject')}</Link>
    </section>
  )
}

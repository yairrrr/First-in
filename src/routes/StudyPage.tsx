import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { nextChapterToPrefetch, useProjectActions } from '../state/useProjectActions'
import { firstTryStats, progressPercent } from '../state/reducer'
import { BidiText } from '../components/BidiText'

/** Your Study — מפת המסע: תחנה לכל פרק, קו שמחבר ביניהן. חדר נפרד, ראה ADR-003. */
export function StudyPage() {
  const { id } = useParams()
  const { state } = useApp()
  const { loadLesson } = useProjectActions()
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
        <h2>אין עדיין מה ללמוד</h2>
        <p className="empty">הפרקים נוצרים אחרי שהפרויקט נבנה.</p>
        <Link to="/">חזרה לרשימה</Link>
      </section>
    )
  }

  const percent = progressPercent(project)
  const { firstTry, completed } = firstTryStats(project)
  // התחנה הבאה בתור: הפרק הראשון שטרם הושלם.
  const nextIndex = project.chapters.findIndex((chapter) => !chapter.completed)

  return (
    <section className="panel">
      <h2>מפת הפרויקט</h2>

      {percent === 100 && (
        <div className="done-banner">
          <p>🏆 למדת את כל הפרויקט שיצרת.</p>
          <p className="empty">
            {project.points} נקודות, {firstTry} מתוך {completed} פרקים נכונים מהניסיון הראשון.
          </p>
        </div>
      )}

      <div className="progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <span className="meta">
          {percent}% נלמדו · {project.points} נקודות
          {completed > 0 && percent < 100 && ` · ${firstTry}/${completed} מהניסיון הראשון`}
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
                  <BidiText text={chapter.title} />
                </span>
                <span className="meta">
                  {chapter.completed
                    ? chapter.attempts === 1
                      ? 'הושלם מהניסיון הראשון'
                      : 'הושלם'
                    : index === nextIndex
                      ? 'הבא בתור'
                      : ''}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>

      <Link to={`/project/${project.id}`}>חזרה לפרויקט</Link>
    </section>
  )
}

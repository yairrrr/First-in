import { Link, useParams } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { progressPercent } from '../state/reducer'
import { BidiText } from '../components/BidiText'

/** Your Study — מפת הפרקים, ההתקדמות והנקודות. חדר נפרד, ראה ADR-003. */
export function StudyPage() {
  const { id } = useParams()
  const { state } = useApp()
  const project = state.projects.find((candidate) => candidate.id === id)

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

  return (
    <section className="panel">
      <h2>מפת הפרויקט</h2>

      <div className="progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <span className="meta">
          {percent}% נלמדו · {project.points} נקודות
        </span>
      </div>

      <ol className="chapter-list">
        {project.chapters.map((chapter, index) => (
          <li key={chapter.id} className="chapter-row">
            <Link to={`/project/${project.id}/study/${index + 1}`}>
              <BidiText text={chapter.title} />
            </Link>
            <span className="meta">{chapter.completed ? 'הושלם' : `${chapter.code.length} תווים`}</span>
          </li>
        ))}
      </ol>

      <Link to={`/project/${project.id}`}>חזרה לפרויקט</Link>
    </section>
  )
}

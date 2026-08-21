import { Link, useParams } from 'react-router-dom'
import { useApp } from '../state/AppContext'

/**
 * Your Project — המשתמש מקבל מוצר עובד ורואה אותו רץ. אין כאן למידה.
 * מסך ההמתנה פשוט בכוונה, ראה ADR-004.
 */
export function ProjectPage() {
  const { id } = useParams()
  const { state } = useApp()
  const project = state.projects.find((candidate) => candidate.id === id)

  if (!project) {
    return (
      <section className="panel">
        <h2>הפרויקט לא נמצא</h2>
        <Link to="/">חזרה לרשימה</Link>
      </section>
    )
  }

  return (
    <section className="panel">
      {/* הפרומפט הוא טקסט של המשתמש, ויכול להיות בכל שפה. dir="auto" מונע פיסוק שקופץ. */}
      <h2 dir="auto">{project.prompt}</h2>

      {project.status === 'building' && (
        <div className="waiting">
          <div className="pulse" aria-hidden="true" />
          <p>בונה את הפרויקט שלך.</p>
          <p className="empty">המודל רץ מקומית על המחשב שלך. זה לוקח בערך שתי דקות.</p>
        </div>
      )}

      {project.status === 'failed' && (
        <div className="error">
          <p>הבנייה נכשלה.</p>
          <p className="empty">{project.error}</p>
          <Link to="/">לנסות שוב</Link>
        </div>
      )}

      {project.status === 'ready' && (
        <>
          <iframe
            className="preview"
            title={project.prompt}
            srcDoc={project.code}
            // הקוד נוצר על ידי מודל. הוא רץ מבודד, בלי גישה לדף שמסביבו.
            sandbox="allow-scripts"
          />
          <Link to={`/project/${project.id}/study`} className="study-cta">
            <span>ללמוד את הקוד הזה</span>
            <span className="meta">{project.chapters.length} פרקים ממתינים</span>
          </Link>
        </>
      )}
    </section>
  )
}

import { Link, useParams } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { useProjectActions } from '../state/useProjectActions'
import type { Project } from '../state/types'

/**
 * Your Project — המשתמש מקבל מוצר עובד ורואה אותו רץ. אין כאן למידה.
 * מסך ההמתנה פשוט בכוונה, ראה ADR-004.
 */
export function ProjectPage() {
  const { id } = useParams()
  const { state } = useApp()
  const { retryBuild } = useProjectActions()
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
          <div className="error-actions">
            <button type="button" className="primary" onClick={() => retryBuild(project)}>
              לבנות שוב
            </button>
            <Link to="/">חזרה לרשימה</Link>
          </div>
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
          <div className="project-tools">
            <button type="button" className="ghost" onClick={() => downloadProject(project)}>
              הורדה כקובץ HTML
            </button>
          </div>
        </>
      )}
    </section>
  )
}

/**
 * מוריד את הפרויקט שנבנה כקובץ HTML עצמאי.
 * הקוד חי רק ב-localStorage; זו הדרך של המשתמש לקחת אותו איתו.
 */
function downloadProject(project: Project): void {
  const blob = new Blob([project.code], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `first-in-${project.id.slice(0, 8)}.html`
  link.click()
  URL.revokeObjectURL(url)
}

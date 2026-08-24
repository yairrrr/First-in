import { useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { useProjectActions } from '../state/useProjectActions'
import { useT } from '../i18n/useT'
import type { Project } from '../state/types'

/**
 * Your Project — המשתמש מקבל מוצר עובד ורואה אותו רץ. אין כאן למידה.
 * מסך ההמתנה פשוט בכוונה, ראה ADR-004.
 */
export function ProjectPage() {
  const { id } = useParams()
  const { state } = useApp()
  const { retryBuild } = useProjectActions()
  const { t } = useT()
  const previewRef = useRef<HTMLIFrameElement>(null)
  const project = state.projects.find((candidate) => candidate.id === id)

  if (!project) {
    return (
      <section className="panel">
        <h2>{t('project.notFound')}</h2>
        <Link to="/">{t('nav.back')}</Link>
      </section>
    )
  }

  // פרויקט מוכן מקבל את כל המסך: שורת כלים דקה, ומתחתיה התוצר ממלא את השאר.
  if (project.status === 'ready') {
    return (
      <section className="stage">
        <div className="stage-bar">
          {/* הפרומפט הוא טקסט של המשתמש, ויכול להיות בכל שפה. dir="auto" מונע פיסוק שקופץ. */}
          <h2 className="stage-title" dir="auto">
            {project.prompt}
          </h2>
          <div className="stage-tools">
            <button
              type="button"
              className="ghost"
              onClick={() => void previewRef.current?.requestFullscreen?.()}
            >
              {t('project.fullscreen')}
            </button>
            <button type="button" className="ghost" onClick={() => downloadProject(project)}>
              {t('project.download')}
            </button>
            <Link to={`/project/${project.id}/study`} className="stage-cta">
              {t('project.study')} · {t('project.chaptersWaiting', { count: project.chapters.length })}
            </Link>
          </div>
        </div>
        <iframe
          ref={previewRef}
          className="preview"
          title={project.prompt}
          srcDoc={project.code}
          // הקוד נוצר על ידי מודל. הוא רץ מבודד, בלי גישה לדף שמסביבו.
          sandbox="allow-scripts"
        />
      </section>
    )
  }

  return (
    <section className="panel panel-wide">
      <h2 dir="auto">{project.prompt}</h2>

      {project.status === 'building' && (
        <div className="waiting">
          <div className="pulse" aria-hidden="true" />
          <p>{t('project.building')}</p>
          <p className="empty">{t('project.buildingHint')}</p>
        </div>
      )}

      {project.status === 'failed' && (
        <div className="error">
          <p>{t('project.failed')}</p>
          <p className="empty">{project.error}</p>
          <div className="error-actions">
            <button type="button" className="primary" onClick={() => retryBuild(project)}>
              {t('project.rebuild')}
            </button>
            <Link to="/">{t('nav.back')}</Link>
          </div>
        </div>
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

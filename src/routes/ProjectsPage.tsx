import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { useProjectActions } from '../state/useProjectActions'
import { progressPercent } from '../state/reducer'
import { useT } from '../i18n/useT'
import logoMark from '../assets/logo-mark.png'

/** רשימת הפרויקטים, ונקודת הכניסה: פרומפט חופשי. */
export function ProjectsPage() {
  const { state } = useApp()
  const { startProject, deleteProject } = useProjectActions()
  const { t } = useT()
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [demoMode, setDemoMode] = useState(false)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!prompt.trim()) return
    const id = startProject(prompt, demoMode ? 'fixture' : 'ollama')
    navigate(`/project/${id}`)
  }

  return (
    <section className="panel">
      <div className="hero">
        <img src={logoMark} alt="" className="hero-logo" aria-hidden="true" />
        <h1 className="hero-name" dir="ltr">First-In</h1>
        <p className="hero-slogan" dir="ltr">{t('app.slogan')}</p>
      </div>

      <h2 className="hero-title">{t('home.title')}</h2>

      <form className="build-form" onSubmit={handleSubmit}>
        <textarea
          className="prompt-input"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={t('home.placeholder')}
          rows={4}
        />

        <div className="build-actions">
          <button type="submit" className="primary" disabled={!prompt.trim()}>
            {t('home.build')}
          </button>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={demoMode}
              onChange={(event) => setDemoMode(event.target.checked)}
            />
            {t('home.demo')}
          </label>
        </div>
      </form>

      <h2>{t('home.projects')}</h2>
      {state.projects.length === 0 ? (
        <p className="empty">{t('home.empty')}</p>
      ) : (
        <ul className="project-list">
          {state.projects.map((project) => (
            <li key={project.id} className="project-row">
              <Link to={`/project/${project.id}`} dir="auto">
                {project.prompt}
              </Link>
              <span className="row-side">
                <span className="meta">
                  {project.status === 'building' && t('status.building')}
                  {project.status === 'failed' && t('status.failed')}
                  {project.status === 'ready' &&
                    t('status.learned', { percent: progressPercent(project) })}
                </span>
                <button
                  type="button"
                  className="delete"
                  onClick={() => {
                    // בנייה עולה שתי דקות. מחיקה בטעות לא צריכה להיות בלחיצה אחת.
                    if (window.confirm(t('home.deleteConfirm'))) deleteProject(project.id)
                  }}
                >
                  {t('home.delete')}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

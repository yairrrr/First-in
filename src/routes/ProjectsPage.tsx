import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { useProjectActions } from '../state/useProjectActions'
import { progressPercent } from '../state/reducer'
import { useT } from '../i18n/useT'
import { Icon } from '../components/Icon'
import type { Project } from '../state/types'
import logoMark from '../assets/logo-mark.png'

/** Upper bound for a build prompt; longer prompts only degrade model output. */
export const PROMPT_MAX_CHARS = 2000

/** Home: the build form and the project list. */
export function ProjectsPage() {
  const { state } = useApp()
  const { startProject, deleteProject } = useProjectActions()
  const { t, language } = useT()
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [demoMode, setDemoMode] = useState(false)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!prompt.trim()) return
    const id = startProject(prompt, demoMode ? 'fixture' : 'ollama')
    navigate(`/project/${id}`)
  }

  const isEmpty = state.projects.length === 0

  return (
    <section className="panel page-enter">
      <div className="hero">
        <img src={logoMark} alt="" className="hero-logo" aria-hidden="true" />
        <h1 className="hero-name" dir="ltr">First-In</h1>
        <p className="hero-slogan" dir="ltr">{t('app.slogan')}</p>
      </div>

      <form className="build-form" onSubmit={handleSubmit}>
        <label className="build-label" htmlFor="prompt">
          <Icon name="sparkles" size={18} />
          {t('home.title')}
        </label>
        <textarea
          id="prompt"
          className="prompt-input"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={t('home.placeholder')}
          rows={4}
          maxLength={PROMPT_MAX_CHARS}
        />

        <div className="build-actions">
          <button type="submit" className="primary" disabled={!prompt.trim()}>
            <Icon name="sparkles" size={16} />
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

      {/* First visit: a three-step overview instead of an empty list */}
      {isEmpty ? (
        <div className="how">
          <h2>{t('how.title')}</h2>
          <ol className="how-steps">
            {(['sparkles', 'code', 'book'] as const).map((icon, index) => (
              <li key={icon} className="how-step">
                <span className="how-icon">
                  <Icon name={icon} size={22} />
                </span>
                <span className="how-number">{index + 1}</span>
                <span className="how-title">{t(`how.${index + 1}.title` as 'how.1.title')}</span>
                <span className="how-text">{t(`how.${index + 1}.text` as 'how.1.text')}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <>
          <h2>{t('home.projects')}</h2>
          <ul className="project-grid">
            {state.projects.map((project) => (
              <li key={project.id} className="project-card">
                <Link to={`/project/${project.id}`} className="project-thumb-link">
                  <ProjectThumb project={project} />
                </Link>
                <div className="project-card-body">
                  <Link to={`/project/${project.id}`} className="project-card-title" dir="auto">
                    {project.prompt}
                  </Link>
                  <div className="project-card-meta">
                    <StatusChip project={project} />
                    {project.status === 'ready' && (
                      <span className="meta">
                        {t('home.chapters', { count: project.chapters.length })}
                      </span>
                    )}
                    {formatCreated(project.createdAt, language) && (
                      <span className="meta">
                        {t('home.created', { date: formatCreated(project.createdAt, language) })}
                      </span>
                    )}
                  </div>
                  {project.status === 'ready' && (
                    <div className="progress-bar slim">
                      <div
                        className="progress-fill"
                        style={{ width: `${progressPercent(project)}%` }}
                      />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="icon-button"
                  title={t('home.delete')}
                  aria-label={t('home.delete')}
                  onClick={() => {
                    // A build costs about two minutes; deletion should not be a single click.
                    if (window.confirm(t('home.deleteConfirm'))) deleteProject(project.id)
                  }}
                >
                  <Icon name="trash" size={16} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

/** Stored timestamps may be missing or invalid; in that case the date is simply not shown. */
function formatCreated(iso: string, language: 'he' | 'en'): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short' })
}

/** Thumbnails only need markup and styles; scripts are stripped so the sandbox does not log blocked executions. */
function staticSnapshot(code: string): string {
  return code.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
}

/** Scaled-down static render of the project's own HTML, non-interactive. */
function ProjectThumb({ project }: { project: Project }) {
  if (project.status !== 'ready') {
    return (
      <div className={`project-thumb thumb-${project.status}`}>
        <Icon name={project.status === 'building' ? 'clock' : 'alert'} size={26} />
      </div>
    )
  }
  return (
    <div className="project-thumb">
      <iframe
        className="thumb-frame"
        title=""
        srcDoc={staticSnapshot(project.code)}
        sandbox=""
        loading="lazy"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  )
}

function StatusChip({ project }: { project: Project }) {
  const { t } = useT()
  if (project.status === 'building') {
    return (
      <span className="chip chip-building">
        <Icon name="clock" size={12} />
        {t('status.building')}
      </span>
    )
  }
  if (project.status === 'failed') {
    return (
      <span className="chip chip-failed">
        <Icon name="alert" size={12} />
        {t('status.failed')}
      </span>
    )
  }
  const percent = progressPercent(project)
  return (
    <span className={`chip ${percent === 100 ? 'chip-done' : 'chip-ready'}`}>
      {percent === 100 ? <Icon name="trophy" size={12} /> : <Icon name="book" size={12} />}
      {t('status.learned', { percent })}
    </span>
  )
}

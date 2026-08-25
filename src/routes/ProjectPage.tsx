import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { useProjectActions } from '../state/useProjectActions'
import { useT } from '../i18n/useT'
import { storedMessage } from '../i18n/errorMessage'
import { Icon } from '../components/Icon'
import { RevisionPanel } from '../components/RevisionPanel'
import { useToast } from '../components/Toast'
import type { Project } from '../state/types'

/**
 * Project screen: the built app running in an isolated iframe, with tools and
 * the revision panel. Learning happens elsewhere.
 */
export function ProjectPage() {
  const { id } = useParams()
  const { state } = useApp()
  const { retryBuild } = useProjectActions()
  const { t, language } = useT()
  const { showToast } = useToast()
  const previewRef = useRef<HTMLIFrameElement>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const project = state.projects.find((candidate) => candidate.id === id)

  if (!project) {
    return (
      <section className="panel page-enter">
        <h2>{t('project.notFound')}</h2>
        <Link to="/">{t('nav.back')}</Link>
      </section>
    )
  }

  // A ready project takes the whole viewport: a slim toolbar, then the preview.
  if (project.status === 'ready') {
    return (
      <section className="stage page-enter">
        <div className="stage-bar">
          {/* User text may be in any language; dir="auto" keeps punctuation in place. */}
          <h2 className="stage-title" dir="auto">
            {project.prompt}
          </h2>
          <div className="stage-tools">
            <button
              type="button"
              className={`ghost ${panelOpen ? 'ghost-active' : ''}`}
              aria-pressed={panelOpen}
              onClick={() => setPanelOpen((open) => !open)}
            >
              <Icon name="sparkles" size={15} />
              {t('revise.open')}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => void previewRef.current?.requestFullscreen?.()}
            >
              <Icon name="fullscreen" size={15} />
              {t('project.fullscreen')}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                downloadProject(project)
                showToast({ title: t('toast.downloaded'), icon: 'download' })
              }}
            >
              <Icon name="download" size={15} />
              {t('project.download')}
            </button>
            <Link to={`/project/${project.id}/study`} className="stage-cta">
              <Icon name="book" size={15} />
              {t('project.study')} · {t('project.chaptersWaiting', { count: project.chapters.length })}
            </Link>
          </div>
        </div>
        <div className="stage-body">
          {panelOpen && <RevisionPanel project={project} />}
          <iframe
            ref={previewRef}
            className="preview"
            title={project.prompt}
            srcDoc={project.code}
            // Model-generated code runs sandboxed, without access to the host page.
            sandbox="allow-scripts"
          />
        </div>
      </section>
    )
  }

  return (
    <section className="panel panel-wide page-enter">
      <h2 dir="auto">{project.prompt}</h2>

      {project.status === 'building' && <BuildingCard createdAt={project.createdAt} />}

      {project.status === 'failed' && (
        <div className="error">
          <p className="error-title">
            <Icon name="alert" size={18} />
            {t('project.failed')}
          </p>
          <p className="empty">{storedMessage(language, project.error)}</p>
          <div className="error-actions">
            <button type="button" className="primary" onClick={() => retryBuild(project)}>
              <Icon name="refresh" size={16} />
              {t('project.rebuild')}
            </button>
            <Link to="/">{t('nav.back')}</Link>
          </div>
        </div>
      )}
    </section>
  )
}

/** Build wait state: an elapsed-time counter and rotating tips. No fake progress bar. */
function BuildingCard({ createdAt }: { createdAt: string }) {
  const { t } = useT()
  const [seconds, setSeconds] = useState(() => elapsedSince(createdAt))

  useEffect(() => {
    const timer = setInterval(() => setSeconds(elapsedSince(createdAt)), 1000)
    return () => clearInterval(timer)
  }, [createdAt])

  const tips = ['project.tip.1', 'project.tip.2', 'project.tip.3'] as const
  const tip = tips[Math.floor(seconds / 8) % tips.length]

  return (
    <div className="waiting">
      <div className="pulse" aria-hidden="true" />
      <p>{t('project.building')}</p>
      <p className="empty">{t('project.buildingHint')}</p>
      <span className="chip chip-building">
        <Icon name="clock" size={12} />
        {t('project.elapsed', { seconds })}
      </span>
      <p className="tip" key={tip}>
        {t(tip)}
      </p>
    </div>
  )
}

function elapsedSince(iso: string): number {
  const started = Date.parse(iso)
  if (Number.isNaN(started)) return 0
  return Math.max(0, Math.floor((Date.now() - started) / 1000))
}

/** Downloads the built project as a standalone HTML file. */
function downloadProject(project: Project): void {
  const blob = new Blob([project.code], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `first-in-${project.id.slice(0, 8)}.html`
  link.click()
  URL.revokeObjectURL(url)
}

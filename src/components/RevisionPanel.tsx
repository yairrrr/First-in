import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useProjectActions } from '../state/useProjectActions'
import { useT } from '../i18n/useT'
import { storedMessage } from '../i18n/errorMessage'
import { Icon } from './Icon'
import { useToast } from './Toast'
import type { Project } from '../state/types'

/** Upper bound for one instruction. */
export const INSTRUCTION_MAX_CHARS = 1000

/**
 * Revision panel: free-text instructions are applied to the built project by the
 * model. History is shown as a thread, with undo, since a full-file rewrite can
 * also break things.
 */
export function RevisionPanel({ project }: { project: Project }) {
  const { reviseProject, revertRevision } = useProjectActions()
  const { t, language } = useT()
  const { showToast } = useToast()
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const working = project.revisions.some((r) => r.status === 'working')
  const appliedCount = project.revisions.filter((r) => r.status === 'applied').length
  // Applied revisions still in effect; the undo stack is capped, so it cannot be used here.
  const version = appliedCount + 1

  // Keep the latest entry in view when the thread grows or a status changes
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [project.revisions.length, working])

  // Toast once per newly applied revision
  const lastApplied = useRef(appliedCount)
  useEffect(() => {
    if (appliedCount > lastApplied.current) {
      showToast({
        title: t('toast.revised'),
        detail: t('toast.revisedDetail', { count: project.chapters.length }),
        icon: 'sparkles',
      })
    }
    lastApplied.current = appliedCount
  }, [appliedCount, project.chapters.length, showToast, t])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft.trim() || working) return
    reviseProject(project, draft)
    setDraft('')
  }

  return (
    <aside className="revision-panel" aria-label={t('revise.open')}>
      <div className="revision-head">
        <span className="revision-title">
          <Icon name="sparkles" size={16} />
          {t('revise.title')}
        </span>
        <span className="chip chip-ready">{t('revise.version', { n: version })}</span>
      </div>

      <div className="revision-list" ref={listRef}>
        {project.revisions.length === 0 && <p className="revision-empty">{t('revise.empty')}</p>}
        {project.revisions.map((revision) => (
          <div key={revision.id} className={`revision revision-${revision.status}`}>
            <p className="revision-text" dir="auto">
              {revision.instruction}
            </p>
            <span className="revision-status">
              {revision.status === 'working' && (
                <>
                  <span className="dot-pulse" aria-hidden="true" />
                  {t('revise.working')}
                </>
              )}
              {revision.status === 'applied' && (
                <>
                  <Icon name="check" size={13} />
                  {t('revise.applied')}
                </>
              )}
              {revision.status === 'failed' && (
                <>
                  <Icon name="alert" size={13} />
                  {storedMessage(language, revision.message) ?? t('revise.failed')}
                </>
              )}
              {revision.status === 'reverted' && (
                <>
                  <Icon name="refresh" size={13} />
                  {t('revise.reverted')}
                </>
              )}
            </span>
          </div>
        ))}
      </div>

      <form className="revision-form" onSubmit={submit}>
        <textarea
          className="prompt-input revision-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t('revise.placeholder')}
          rows={2}
          maxLength={INSTRUCTION_MAX_CHARS}
          disabled={working}
          onKeyDown={(event) => {
            // Enter submits, Shift+Enter inserts a newline
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }}
        />
        <div className="revision-actions">
          <button type="submit" className="primary" disabled={!draft.trim() || working}>
            <Icon name="forward" size={15} />
            {t('revise.send')}
          </button>
          {project.previousVersions.length > 0 && !working && (
            <button
              type="button"
              className="ghost"
              onClick={() => {
                revertRevision(project)
                showToast({ title: t('toast.reverted'), icon: 'refresh' })
              }}
            >
              <Icon name="refresh" size={14} />
              {t('revise.undo')}
            </button>
          )}
        </div>
        <p className="revision-hint">{t('revise.hint')}</p>
      </form>
    </aside>
  )
}

import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { useProjectActions } from '../state/useProjectActions'
import { progressPercent } from '../state/reducer'

/** רשימת הפרויקטים, ונקודת הכניסה: פרומפט חופשי. */
export function ProjectsPage() {
  const { state } = useApp()
  const { startProject } = useProjectActions()
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
      <h2>מה נבנה היום?</h2>

      <form className="build-form" onSubmit={handleSubmit}>
        <textarea
          className="prompt-input"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="לדוגמה: משחק זיכרון עם 8 זוגות קלפים, מונה מהלכים וכפתור התחלה מחדש"
          rows={4}
        />

        <div className="build-actions">
          <button type="submit" className="primary" disabled={!prompt.trim()}>
            בנה את זה
          </button>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={demoMode}
              onChange={(event) => setDemoMode(event.target.checked)}
            />
            מצב הדגמה, ללא Ollama
          </label>
        </div>
      </form>

      <h2>הפרויקטים שלי</h2>
      {state.projects.length === 0 ? (
        <p className="empty">עדיין אין פרויקטים.</p>
      ) : (
        <ul className="project-list">
          {state.projects.map((project) => (
            <li key={project.id} className="project-row">
              <Link to={`/project/${project.id}`} dir="auto">
                {project.prompt}
              </Link>
              <span className="meta">
                {project.status === 'building' && 'בבנייה'}
                {project.status === 'failed' && 'נכשל'}
                {project.status === 'ready' && `${progressPercent(project)}% נלמדו`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

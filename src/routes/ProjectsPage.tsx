import { Link } from 'react-router-dom'
import { useApp } from '../state/AppContext'

/** רשימת הפרויקטים. נקודת הכניסה של המשתמש. */
export function ProjectsPage() {
  const { state } = useApp()

  return (
    <section className="panel">
      <h2>הפרויקטים שלי</h2>
      {state.projects.length === 0 ? (
        <p className="empty">עדיין אין פרויקטים. כאן ייכנס שדה הפרומפט.</p>
      ) : (
        <ul className="project-list">
          {state.projects.map((project) => (
            <li key={project.id}>
              <Link to={`/project/${project.id}`}>{project.prompt}</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

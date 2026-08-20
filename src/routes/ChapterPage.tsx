import { Link, useParams } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { BidiText } from '../components/BidiText'

/** שלב למידה בודד. ההסבר והשאלה יגיעו מ-lessonGenerator, שטרם נבנה. */
export function ChapterPage() {
  const { id, step } = useParams()
  const { state } = useApp()
  const project = state.projects.find((candidate) => candidate.id === id)
  const index = Number(step) - 1
  const chapter = project?.chapters[index]

  if (!project || !chapter) {
    return (
      <section className="panel">
        <h2>הפרק לא נמצא</h2>
        <Link to="/">חזרה לרשימה</Link>
      </section>
    )
  }

  const previous = index > 0 ? index : null
  const next = index + 1 < project.chapters.length ? index + 2 : null

  return (
    <section className="panel">
      <h2>
        פרק {index + 1} מתוך {project.chapters.length} — <BidiText text={chapter.title} />
      </h2>

      <pre className="code">
        <code>{chapter.code}</code>
      </pre>

      <p className="empty">ההסבר והשאלה על הקוד הזה יתווספו בשלב הבא.</p>

      <nav className="chapter-nav">
        {previous && <Link to={`/project/${project.id}/study/${previous}`}>הפרק הקודם</Link>}
        <Link to={`/project/${project.id}/study`}>מפת הפרקים</Link>
        {next && <Link to={`/project/${project.id}/study/${next}`}>הפרק הבא</Link>}
      </nav>
    </section>
  )
}

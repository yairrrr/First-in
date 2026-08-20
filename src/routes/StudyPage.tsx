import { Link, useParams } from 'react-router-dom'

/** Your Study — חדר נפרד. המשתמש נכנס כשהוא רוצה, ולומד על מה שכבר נבנה. */
export function StudyPage() {
  const { id } = useParams()

  return (
    <section className="panel">
      <h2>Your Study</h2>
      <p className="empty">כאן תוצג מפת הפרקים, ההתקדמות והנקודות.</p>
      <Link to={`/project/${id}/study/1`}>פרק ראשון</Link>
    </section>
  )
}

import { Link, useParams } from 'react-router-dom'

/** Your Project — כאן המשתמש מתאר, המערכת בונה, והוא רואה מוצר עובד. אין כאן למידה. */
export function ProjectPage() {
  const { id } = useParams()

  return (
    <section className="panel">
      <h2>Your Project</h2>
      <p className="empty">מזהה פרויקט: {id}</p>
      <p className="empty">כאן יוצג הפרויקט שנבנה, רץ בתוך הדף.</p>
      <Link to={`/project/${id}/study`}>מעבר ללמידה</Link>
    </section>
  )
}

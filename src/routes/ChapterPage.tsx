import { Link, useParams } from 'react-router-dom'

/** שלב למידה בודד: פיסת קוד, הסבר קצר, ושאלה אמריקאית אחת. */
export function ChapterPage() {
  const { id, step } = useParams()

  return (
    <section className="panel">
      <h2>פרק {step}</h2>
      <p className="empty">כאן ייכנסו קטע הקוד, ההסבר והשאלה.</p>
      <Link to={`/project/${id}/study`}>חזרה למפת הפרקים</Link>
    </section>
  )
}

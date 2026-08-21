import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { useProjectActions } from '../state/useProjectActions'
import { BidiText } from '../components/BidiText'
import type { Chapter, Project } from '../state/types'

/** אותיות האפשרויות, בסדר הא"ב. */
const OPTION_LETTERS = ['א', 'ב', 'ג', 'ד']

/** שלב למידה בודד: קוד, הסבר קצר, ושאלה אמריקאית אחת. */
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

  return (
    <section className="panel">
      <h2>
        פרק {index + 1} מתוך {project.chapters.length} — <BidiText text={chapter.title} />
      </h2>

      <pre className="code">
        <code>{chapter.code}</code>
      </pre>

      <LessonBlock project={project} chapter={chapter} />

      <nav className="chapter-nav">
        {index > 0 && <Link to={`/project/${project.id}/study/${index}`}>הפרק הקודם</Link>}
        <Link to={`/project/${project.id}/study`}>מפת הפרקים</Link>
        {index + 1 < project.chapters.length && (
          <Link
            to={`/project/${project.id}/study/${index + 2}`}
            className={chapter.completed ? 'next-link' : ''}
          >
            הפרק הבא
          </Link>
        )}
      </nav>
    </section>
  )
}

function LessonBlock({ project, chapter }: { project: Project; chapter: Chapter }) {
  const { loadLesson } = useProjectActions()
  const [error, setError] = useState<string | null>(null)

  // פרק בלי שיעור מזמין אחד מהמודל. פרק עם שיעור שמור לא פונה למודל שוב.
  useEffect(() => {
    setError(null)
    if (chapter.lesson) return
    let cancelled = false
    void loadLesson(project, chapter).then((failure) => {
      if (!cancelled && failure) setError(failure)
    })
    return () => {
      cancelled = true
    }
  }, [project, chapter, loadLesson])

  if (error) {
    return (
      <div className="error">
        <p>יצירת השיעור נכשלה.</p>
        <p className="empty">{error}</p>
        <button
          type="button"
          className="primary"
          onClick={() => {
            setError(null)
            void loadLesson(project, chapter).then((failure) => {
              if (failure) setError(failure)
            })
          }}
        >
          לנסות שוב
        </button>
      </div>
    )
  }

  if (!chapter.lesson) {
    return (
      <div className="waiting">
        <p>מכין את השיעור על הקוד הזה.</p>
        <p className="empty">בערך רבע דקה.</p>
      </div>
    )
  }

  return (
    <>
      <p className="explanation">{chapter.lesson.explanation}</p>
      <QuestionBlock project={project} chapter={chapter} />
    </>
  )
}

function QuestionBlock({ project, chapter }: { project: Project; chapter: Chapter }) {
  const { answerQuestion } = useProjectActions()
  const [choice, setChoice] = useState<number | null>(null)
  const question = chapter.lesson!.question

  // מעבר לפרק אחר מאפס את הבחירה המקומית.
  useEffect(() => setChoice(null), [chapter.id])

  // בפרק שכבר הושלם השאלה נעולה, והתשובה הנכונה מוצגת מסומנת.
  const locked = chapter.completed
  const answered = choice !== null
  const correct = locked || (answered && choice === question.correctIndex)

  function choose(option: number) {
    if (correct) return
    setChoice(option)
    answerQuestion(project.id, chapter.id, option === question.correctIndex)
  }

  return (
    <div className="question">
      <h3>{question.text}</h3>

      <div className="options">
        {question.options.map((option, optionIndex) => {
          const isMarkedCorrect = correct && optionIndex === question.correctIndex
          const isMarkedWrong = !correct && choice === optionIndex
          const state = isMarkedCorrect ? 'correct' : isMarkedWrong ? 'wrong' : ''
          return (
            <button
              key={optionIndex}
              type="button"
              className={`option ${state}`}
              disabled={correct}
              onClick={() => choose(optionIndex)}
            >
              <span className="option-letter" aria-hidden="true">
                {OPTION_LETTERS[optionIndex]}
              </span>
              {option}
            </button>
          )
        })}
      </div>

      {correct && (
        <p className="feedback correct-text">
          {locked && !answered
            ? 'הפרק הזה כבר הושלם.'
            : chapter.attempts === 1
              ? 'נכון. מהניסיון הראשון.'
              : `נכון. אחרי ${chapter.attempts} ניסיונות.`}
        </p>
      )}
      {answered && !correct && <p className="feedback wrong-text">לא זה. קרא שוב את הקוד ונסה שוב.</p>}
    </div>
  )
}

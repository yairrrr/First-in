import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { nextChapterToPrefetch, useProjectActions } from '../state/useProjectActions'
import { BidiText } from '../components/BidiText'
import { useT } from '../i18n/useT'
import { chapterTitleText } from '../i18n/chapterTitle'
import type { AssembleExercise, Chapter, ChoiceExercise, Project } from '../state/types'

/** אותיות האפשרויות בשאלה אמריקאית, לפי שפת הממשק. */
const OPTION_LETTERS = { he: ['א', 'ב', 'ג', 'ד'], en: ['A', 'B', 'C', 'D'] } as const

/**
 * שלב למידה בודד, בשני מסכים בסגנון Mimo — ראה ADR-010:
 * קודם פסקת העיקרון, ואז התרגיל: הרכבת שורה או שאלה אמריקאית.
 */
export function ChapterPage() {
  const { id, step } = useParams()
  const { state } = useApp()
  const { t, language } = useT()
  const project = state.projects.find((candidate) => candidate.id === id)
  const index = Number(step) - 1
  const chapter = project?.chapters[index]

  if (!project || !chapter) {
    return (
      <section className="panel">
        <h2>{t('chapter.notFound')}</h2>
        <Link to="/">{t('nav.back')}</Link>
      </section>
    )
  }

  // ברמת הפתיחה מציגים כמה שפחות קוד — הנחיית המוצר. הקוד המלא זמין בלחיצה.
  const collapseCode = chapter.lesson?.difficulty === 'intro'

  return (
    <section className="panel">
      <h2>
        {t('chapter.heading', { n: index + 1, total: project.chapters.length })} —{' '}
        <BidiText text={chapterTitleText(language, chapter)} />
      </h2>

      {collapseCode ? (
        <details className="code-details">
          <summary>{t('chapter.showCode')}</summary>
          <pre className="code">
            <code>{chapter.code}</code>
          </pre>
        </details>
      ) : (
        <pre className="code">
          <code>{chapter.code}</code>
        </pre>
      )}

      <LessonBlock project={project} chapter={chapter} />

      <nav className="chapter-nav">
        {index > 0 && <Link to={`/project/${project.id}/study/${index}`}>{t('nav.prev')}</Link>}
        <Link to={`/project/${project.id}/study`}>{t('nav.map')}</Link>
        {index + 1 < project.chapters.length && (
          <Link
            to={`/project/${project.id}/study/${index + 2}`}
            className={chapter.completed ? 'next-link' : ''}
          >
            {t('nav.next')}
          </Link>
        )}
      </nav>
    </section>
  )
}

function LessonBlock({ project, chapter }: { project: Project; chapter: Chapter }) {
  const { loadLesson } = useProjectActions()
  const { t } = useT()
  const [error, setError] = useState<string | null>(null)
  // המסך הראשון הוא העיקרון. פרק שכבר הושלם מדלג ישר לתרגיל הנעול.
  const [phase, setPhase] = useState<'concept' | 'exercise'>('concept')

  // איפוס המסך רק כשעוברים לפרק אחר באמת. תלות באובייקט הפרק כולו הייתה
  // מחזירה את המשתמש למסך העיקרון אחרי כל תשובה, כי כל תשובה יוצרת אובייקט חדש.
  useEffect(() => {
    setError(null)
    setPhase(chapter.completed ? 'exercise' : 'concept')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter.id])

  useEffect(() => {
    if (chapter.lesson) return
    let cancelled = false
    void loadLesson(project, chapter).then((failure) => {
      if (!cancelled && failure) setError(failure)
    })
    return () => {
      cancelled = true
    }
  }, [project, chapter, loadLesson])

  // ברגע שהפרק הושלם, השיעור הבא מתחיל להיווצר ברקע. בנקודה הזו ההתקדמות
  // כבר מעודכנת, ולכן רמת הקושי שתיחתם על השיעור הבא מדויקת.
  useEffect(() => {
    if (!chapter.completed) return
    const target = nextChapterToPrefetch(project, chapter.id)
    if (target) void loadLesson(project, target)
  }, [chapter.completed, chapter.id, project, loadLesson])

  if (error) {
    return (
      <div className="error">
        <p>{t('chapter.lessonFailed')}</p>
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
          {t('chapter.retry')}
        </button>
      </div>
    )
  }

  if (!chapter.lesson) {
    return (
      <div className="waiting">
        <div className="pulse" aria-hidden="true" />
        <p>{t('chapter.preparing')}</p>
        <p className="empty">{t('chapter.preparingHint')}</p>
      </div>
    )
  }

  if (phase === 'concept') {
    return (
      <div className="concept-card">
        <span className="concept-label">{t('chapter.concept')}</span>
        <p className="concept-text">{chapter.lesson.concept}</p>
        <button type="button" className="primary" onClick={() => setPhase('exercise')}>
          {t('chapter.toExercise')}
        </button>
      </div>
    )
  }

  const exercise = chapter.lesson.exercise
  return (
    <>
      {chapter.completed && <p className="concept-text muted-concept">{chapter.lesson.concept}</p>}
      {exercise.kind === 'choice' ? (
        <ChoiceBlock project={project} chapter={chapter} exercise={exercise} />
      ) : (
        <AssembleBlock project={project} chapter={chapter} exercise={exercise} />
      )}
    </>
  )
}

/** שאלה אמריקאית. פרק שהושלם מוצג נעול עם התשובה הנכונה מסומנת. */
function ChoiceBlock({
  project,
  chapter,
  exercise,
}: {
  project: Project
  chapter: Chapter
  exercise: ChoiceExercise
}) {
  const { answerQuestion } = useProjectActions()
  const { language } = useT()
  const [choice, setChoice] = useState<number | null>(null)

  useEffect(() => setChoice(null), [chapter.id])

  const locked = chapter.completed
  const answered = choice !== null
  const correct = locked || (answered && choice === exercise.correctIndex)

  function choose(option: number) {
    if (correct) return
    setChoice(option)
    answerQuestion(project.id, chapter.id, option === exercise.correctIndex)
  }

  return (
    <div className="question">
      <h3>{exercise.question}</h3>

      <div className="options">
        {exercise.options.map((option, optionIndex) => {
          const isMarkedCorrect = correct && optionIndex === exercise.correctIndex
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
                {OPTION_LETTERS[language][optionIndex]}
              </span>
              {option}
            </button>
          )
        })}
      </div>

      <Feedback chapter={chapter} correct={correct} answered={answered} locked={locked} kind="choice" />
    </div>
  )
}

/**
 * תרגיל ההרכבה: משבצות מעורבבות, לחיצה מוסיפה לשורת התשובה לפי הסדר.
 * לחיצה על משבצת בשורה מחזירה אותה לבנק. כשכולן הונחו — בדיקה אוטומטית.
 */
function AssembleBlock({
  project,
  chapter,
  exercise,
}: {
  project: Project
  chapter: Chapter
  exercise: AssembleExercise
}) {
  const { answerQuestion } = useProjectActions()
  const { t } = useT()
  // המשבצות מזוהות לפי מיקומן המקורי, כדי ששתי משבצות זהות לא יתבלבלו.
  const [placed, setPlaced] = useState<number[]>([])
  const [wrongOnce, setWrongOnce] = useState(false)
  // מבחין בין "נפתר הרגע" לבין "הגעתי לפרק שכבר הושלם בעבר" — המשוב שונה.
  const [solvedNow, setSolvedNow] = useState(false)

  const locked = chapter.completed
  const shuffled = useMemo(() => shuffleIndexes(exercise.tokens), [chapter.id, exercise.tokens])

  useEffect(() => {
    setPlaced([])
    setWrongOnce(false)
    setSolvedNow(false)
  }, [chapter.id])

  function place(tokenIndex: number) {
    if (locked || placed.includes(tokenIndex)) return
    const next = [...placed, tokenIndex]
    setPlaced(next)
    if (next.length < exercise.tokens.length) return

    // ההשוואה לפי ערכי המשבצות, כך ששתי משבצות זהות מתקבלות בכל סדר ביניהן.
    const assembled = next.map((i) => exercise.tokens[i])
    const correct = assembled.every((token, i) => token === exercise.tokens[i])
    answerQuestion(project.id, chapter.id, correct)
    if (correct) {
      setSolvedNow(true)
    } else {
      setWrongOnce(true)
      setTimeout(() => setPlaced([]), 700)
    }
  }

  function unplace(tokenIndex: number) {
    if (locked) return
    setPlaced(placed.filter((i) => i !== tokenIndex))
  }

  const showOrder = locked ? exercise.tokens.map((_, i) => i) : placed

  return (
    <div className="question">
      <h3>{exercise.instruction}</h3>

      <div
        className={`answer-row ${chapter.completed ? 'assembled' : ''} ${
          !chapter.completed && wrongOnce && placed.length === exercise.tokens.length
            ? 'wrong-row'
            : ''
        }`}
      >
        {showOrder.length === 0 && <span className="answer-hint">{t('chapter.tapHint')}</span>}
        {showOrder.map((tokenIndex) => (
          <button
            key={tokenIndex}
            type="button"
            className="tile placed-tile"
            disabled={locked || chapter.completed}
            onClick={() => unplace(tokenIndex)}
          >
            {exercise.tokens[tokenIndex]}
          </button>
        ))}
      </div>

      {!chapter.completed && (
        <div className="tile-bank">
          {shuffled.map((tokenIndex) => (
            <button
              key={tokenIndex}
              type="button"
              className="tile"
              disabled={placed.includes(tokenIndex)}
              onClick={() => place(tokenIndex)}
            >
              {exercise.tokens[tokenIndex]}
            </button>
          ))}
        </div>
      )}

      <Feedback
        chapter={chapter}
        correct={chapter.completed}
        answered={wrongOnce || solvedNow}
        locked={chapter.completed && !solvedNow}
        kind="assemble"
      />
    </div>
  )
}

function Feedback({
  chapter,
  correct,
  answered,
  locked,
  kind,
}: {
  chapter: Chapter
  correct: boolean
  answered: boolean
  locked: boolean
  kind: 'choice' | 'assemble'
}) {
  const { t } = useT()
  if (correct) {
    return (
      <p className="feedback correct-text">
        {locked && !answered
          ? t('feedback.alreadyDone')
          : chapter.attempts === 1
            ? t('feedback.firstTry')
            : t('feedback.afterAttempts', { attempts: chapter.attempts })}
      </p>
    )
  }
  if (answered) {
    return (
      <p className="feedback wrong-text">
        {kind === 'choice' ? t('feedback.wrongChoice') : t('feedback.wrongOrder')}
      </p>
    )
  }
  return null
}

/** ערבוב יציב לפרק: מבטיח שהסדר המוצג שונה מהסדר הנכון. */
function shuffleIndexes(tokens: string[]): number[] {
  const indexes = tokens.map((_, i) => i)
  for (let attempt = 0; attempt < 10; attempt++) {
    for (let i = indexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indexes[i], indexes[j]] = [indexes[j], indexes[i]]
    }
    const values = indexes.map((i) => tokens[i])
    if (!values.every((token, i) => token === tokens[i])) return indexes
  }
  return indexes.reverse()
}

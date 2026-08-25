import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { nextChapterToPrefetch, useProjectActions } from '../state/useProjectActions'
import { BidiText } from '../components/BidiText'
import { CodeBlock, languageForChapter } from '../components/CodeBlock'
import { RichText } from '../components/RichText'
import { Icon } from '../components/Icon'
import { Stepper } from '../components/Stepper'
import { useToast } from '../components/Toast'
import { nextRank, rankForXp, xpForAnswer } from '../state/rank'
import { useT } from '../i18n/useT'
import type { StringKey } from '../i18n/strings'
import { chapterTitleText } from '../i18n/chapterTitle'
import type { AssembleExercise, Chapter, ChoiceExercise, Project } from '../state/types'

/** Option labels for multiple-choice exercises, per UI language. */
const OPTION_LETTERS = { he: ['א', 'ב', 'ג', 'ד'], en: ['A', 'B', 'C', 'D'] } as const

/**
 * A single learning step in two phases: the concept card first, then the
 * exercise (tap-to-assemble or multiple choice).
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

  // At the intro tier the full chapter code is collapsed by default to keep the screen light.
  const collapseCode = chapter.lesson?.difficulty === 'intro'

  return (
    <section className="panel page-enter chapter-page">
      <div className="chapter-head">
        <span className="chapter-count">
          {t('chapter.heading', { n: index + 1, total: project.chapters.length })}
        </span>
        <h2>
          <BidiText text={chapterTitleText(language, chapter)} />
        </h2>
      </div>

      {collapseCode ? (
        <details className="code-details">
          <summary>{t('chapter.showCode')}</summary>
          <CodeBlock code={chapter.code} language={languageForChapter(chapter.title)} />
        </details>
      ) : (
        <CodeBlock code={chapter.code} language={languageForChapter(chapter.title)} />
      )}

      <LessonBlock project={project} chapter={chapter} />

      <nav className="chapter-nav">
        {index > 0 ? (
          <Link to={`/project/${project.id}/study/${index}`} className="ghost link-button">
            <Icon name="back" size={14} />
            {t('nav.prev')}
          </Link>
        ) : (
          <span />
        )}
        <Link to={`/project/${project.id}/study`} className="ghost link-button">
          <Icon name="map" size={14} />
          {t('nav.map')}
        </Link>
        {index + 1 < project.chapters.length ? (
          <Link
            to={`/project/${project.id}/study/${index + 2}`}
            className={chapter.completed ? 'next-link' : 'ghost link-button'}
          >
            {t('nav.next')}
            <Icon name="forward" size={14} />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </section>
  )
}

function LessonBlock({ project, chapter }: { project: Project; chapter: Chapter }) {
  const { loadLesson } = useProjectActions()
  const { t } = useT()
  const [error, setError] = useState<string | null>(null)
  // Completed chapters open directly on the locked exercise.
  const [phase, setPhase] = useState<'concept' | 'exercise'>('concept')
  const chapterId = chapter.id
  const completedOnEntry = chapter.completed

  // Reset only when navigating to a different chapter. Depending on the chapter
  // object itself would reset the phase after every answer, since each answer
  // produces a new object.
  useEffect(() => {
    setError(null)
    setPhase(completedOnEntry ? 'exercise' : 'concept')
    // `completedOnEntry` is intentionally read once per chapter.
  }, [chapterId])

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

  // Once the chapter is completed, prefetch the next lesson. Progress is already
  // updated at this point, so the difficulty stamped on the next lesson is correct.
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

  const steps = [t('chapter.step.concept'), t('chapter.step.exercise'), t('chapter.step.done')]
  const currentStep = chapter.completed ? 2 : phase === 'concept' ? 0 : 1

  if (phase === 'concept') {
    return (
      <div className="lesson">
        <Stepper steps={steps} current={currentStep} />
        <div className="concept-card">
          <span className="concept-label">{t('chapter.concept')}</span>
          <p className="concept-text">
            <RichText text={chapter.lesson.concept} />
          </p>
          {chapter.lesson.example && (
            <div className="example">
              <span className="example-label">{t('chapter.example')}</span>
              <CodeBlock
                code={chapter.lesson.example}
                language={languageForChapter(chapter.title)}
                compact
              />
            </div>
          )}
          <button type="button" className="primary" onClick={() => setPhase('exercise')}>
            {t('chapter.toExercise')}
            <Icon name="forward" size={15} />
          </button>
        </div>
      </div>
    )
  }

  const exercise = chapter.lesson.exercise
  return (
    <div className="lesson">
      <Stepper steps={steps} current={currentStep} />
      {chapter.completed && (
        <p className="concept-text muted-concept">
          <RichText text={chapter.lesson.concept} />
        </p>
      )}
      {chapter.lesson.example && (
        <div className="example">
          <span className="example-label">{t('chapter.example')}</span>
          <CodeBlock code={chapter.lesson.example} language={languageForChapter(chapter.title)} compact />
        </div>
      )}
      {exercise.kind === 'choice' ? (
        <ChoiceBlock project={project} chapter={chapter} exercise={exercise} />
      ) : (
        <AssembleBlock project={project} chapter={chapter} exercise={exercise} />
      )}
    </div>
  )
}

/**
 * Success feedback: an XP toast and, when a threshold is crossed, a rank-up toast.
 * Computed before dispatch with the same rules the reducer applies.
 */
function useCelebrate() {
  const { state } = useApp()
  const { t } = useT()
  const { showToast } = useToast()

  return (chapter: Chapter, attemptsSoFar: number) => {
    const difficulty = chapter.lesson?.difficulty ?? 'intro'
    const gained = xpForAnswer(difficulty, attemptsSoFar + 1)
    const before = rankForXp(state.xp)
    const afterXp = state.xp + gained
    const after = rankForXp(afterXp)
    const next = nextRank(afterXp)

    showToast({
      title: t('toast.xp', { xp: gained }),
      detail: next ? t('toast.xpDetail', { left: next.minXp - afterXp }) : t('toast.topRank'),
      icon: 'bolt',
    })
    if (after.level > before.level) {
      showToast({
        title: t('toast.rankUp'),
        detail: t('toast.rankUpDetail', {
          level: after.level,
          name: t(`rank.${after.level}` as StringKey),
        }),
        icon: 'trophy',
        tone: 'celebrate',
      })
    }
  }
}

/** Multiple choice. A completed chapter renders locked with the correct option marked. */
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
  const celebrate = useCelebrate()
  const [choice, setChoice] = useState<number | null>(null)

  useEffect(() => setChoice(null), [chapter.id])

  const locked = chapter.completed
  const answered = choice !== null
  const correct = locked || (answered && choice === exercise.correctIndex)

  function choose(option: number) {
    if (correct) return
    setChoice(option)
    const isRight = option === exercise.correctIndex
    if (isRight) celebrate(chapter, chapter.attempts)
    answerQuestion(project.id, chapter.id, isRight)
  }

  return (
    <div className="question">
      <h3>
        <RichText text={exercise.question} />
      </h3>

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
              <span>
                <RichText text={option} />
              </span>
            </button>
          )
        })}
      </div>

      <Feedback chapter={chapter} correct={correct} answered={answered} locked={locked} kind="choice" />
    </div>
  )
}

/**
 * Tap-to-assemble. Tapping a bank tile appends it to the answer row; tapping a
 * placed tile returns it. The answer is checked as soon as every tile is placed.
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
  const celebrate = useCelebrate()
  // Tiles are tracked by original index so duplicate tokens stay distinguishable.
  const [placed, setPlaced] = useState<number[]>([])
  const [wrongOnce, setWrongOnce] = useState(false)
  // Distinguishes "solved just now" from "arrived at an already completed chapter".
  const [solvedNow, setSolvedNow] = useState(false)

  const locked = chapter.completed
  const shuffled = useMemo(() => shuffleIndexes(exercise.tokens), [exercise.tokens])
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setPlaced([])
    setWrongOnce(false)
    setSolvedNow(false)
  }, [chapter.id])

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current)
    },
    [],
  )

  function place(tokenIndex: number) {
    if (locked || placed.includes(tokenIndex)) return
    const next = [...placed, tokenIndex]
    setPlaced(next)
    if (next.length < exercise.tokens.length) return

    // Compare by token value, so identical tokens are accepted in either order.
    const assembled = next.map((i) => exercise.tokens[i])
    const correct = assembled.every((token, i) => token === exercise.tokens[i])
    if (correct) celebrate(chapter, chapter.attempts)
    answerQuestion(project.id, chapter.id, correct)
    if (correct) {
      setSolvedNow(true)
    } else {
      setWrongOnce(true)
      resetTimer.current = setTimeout(() => setPlaced([]), 700)
    }
  }

  function unplace(tokenIndex: number) {
    if (locked) return
    setPlaced(placed.filter((i) => i !== tokenIndex))
  }

  const showOrder = locked ? exercise.tokens.map((_, i) => i) : placed

  return (
    <div className="question">
      <h3>
        <RichText text={exercise.instruction} />
      </h3>

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
            disabled={locked}
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

/** Shuffles token indexes, guaranteeing the displayed order differs from the answer. */
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

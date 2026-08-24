import { useMatch } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { difficultyForProgress } from '../services/lessonGenerator'
import type { LessonDifficulty } from '../state/types'

/** שמות השלבים כפי שהמשתמש רואה אותם. שלוש המדרגות של ADR-009. */
const STAGE_LABELS: Record<LessonDifficulty, { number: number; name: string }> = {
  intro: { number: 1, name: 'היכרות' },
  core: { number: 2, name: 'העמקה' },
  deep: { number: 3, name: 'שליטה' },
}

/**
 * באנר השלב בכותרת העליונה: מציג באיזו מדרגת קושי המשתמש נמצא בפרויקט
 * הפתוח, עם שלוש נקודות התקדמות והנקודות שנצברו.
 */
export function StageBanner() {
  const match = useMatch('/project/:id/*')
  const rootMatch = useMatch('/project/:id')
  const { state } = useApp()

  const id = match?.params.id ?? rootMatch?.params.id
  const project = id ? state.projects.find((candidate) => candidate.id === id) : undefined
  if (!project || project.status !== 'ready' || project.chapters.length === 0) return null

  const completed = project.chapters.filter((chapter) => chapter.completed).length
  const stage = difficultyForProgress(completed, project.chapters.length)
  const { number, name } = STAGE_LABELS[stage]
  const order: LessonDifficulty[] = ['intro', 'core', 'deep']

  return (
    <div className="stage-banner" title={`הושלמו ${completed} מתוך ${project.chapters.length} פרקים`}>
      <span className="stage-dots" aria-hidden="true">
        {order.map((tier) => (
          <span key={tier} className={`stage-dot ${order.indexOf(tier) < number ? 'lit' : ''}`} />
        ))}
      </span>
      <span className="stage-text">
        שלב {number} · {name}
      </span>
      <span className="stage-points">{project.points} נק׳</span>
    </div>
  )
}

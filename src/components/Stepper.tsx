import { Icon } from './Icon'

/** Lesson progress indicator: concept → exercise → done. */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="stepper" aria-label={steps[current]}>
      {steps.map((step, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : ''
        return (
          <li key={step} className={`step ${state}`}>
            <span className="step-dot">
              {index < current ? <Icon name="check" size={12} /> : index + 1}
            </span>
            <span className="step-label">{step}</span>
            {index < steps.length - 1 && <span className="step-line" aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}

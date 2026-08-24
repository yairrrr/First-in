import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

/**
 * הודעות קצרות שצפות ונעלמות לבד: "+15 XP", "עלית דרגה".
 * רגעי ההצלחה הם הלב של מוצר משחקי — הם חייבים להיראות.
 */

export interface ToastInput {
  title: string
  detail?: string
  icon?: IconName
  /** הודעת חגיגה מקבלת עיצוב בולט יותר. */
  tone?: 'default' | 'celebrate'
}

interface Toast extends ToastInput {
  id: number
}

interface ToastApi {
  showToast: (toast: ToastInput) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const TOAST_MS = 3200

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const showToast = useCallback((input: ToastInput) => {
    const id = nextId.current++
    setToasts((current) => [...current, { ...input, id }])
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), TOAST_MS)
  }, [])

  const api = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext value={api}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.tone === 'celebrate' ? 'toast-celebrate' : ''}`}>
            {toast.icon && <Icon name={toast.icon} size={20} />}
            <span className="toast-body">
              <span className="toast-title">{toast.title}</span>
              {toast.detail && <span className="toast-detail">{toast.detail}</span>}
            </span>
          </div>
        ))}
      </div>
    </ToastContext>
  )
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast נקרא מחוץ ל-ToastProvider')
  return api
}

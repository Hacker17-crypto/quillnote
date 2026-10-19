import { useUi } from '../stores/ui'

export function Toasts(): JSX.Element {
  const toasts = useUi((s) => s.toasts)
  const dismiss = useUi((s) => s.dismissToast)
  return (
    <div className="q-toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="q-toast">
          <span>{t.message}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action?.run()
                dismiss(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

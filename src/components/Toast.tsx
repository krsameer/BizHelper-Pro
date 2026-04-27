import { AnimatePresence, motion } from 'framer-motion';

export interface ToastState {
  id: string;
  title: string;
  body?: string;
}

export function ToastStack({ toasts, onDismiss }: { toasts: ToastState[]; onDismiss: (id: string) => void }) {
  return (
    <div className="toast-stack">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className="toast"
            layout
            initial={{ opacity: 0, y: 22, x: 12 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 16, x: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            <div>
              <strong>{toast.title}</strong>
              {toast.body ? <p>{toast.body}</p> : null}
            </div>
            <button className="icon-button" onClick={() => onDismiss(toast.id)} aria-label="Dismiss toast">
              ×
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

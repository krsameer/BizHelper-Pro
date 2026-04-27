import type { PropsWithChildren, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const modal = {
  hidden: { opacity: 0, y: 40, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 28 } },
  exit: { opacity: 0, y: 20, scale: 0.97, transition: { duration: 0.18 } }
};

export function Modal({ open, onClose, title, children, width = 720 }: PropsWithChildren<{ open: boolean; onClose: () => void; title: ReactNode; width?: number }>) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          <motion.div className="modal-panel" style={{ maxWidth: width }} variants={modal} initial="hidden" animate="show" exit="exit">
            <div className="modal-panel__header">
              <h2>{title}</h2>
              <button className="icon-button" onClick={onClose} aria-label="Close dialog">
                ×
              </button>
            </div>
            {children}
          </motion.div>
          <button className="modal-scrim" aria-label="Close dialog" onClick={onClose} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

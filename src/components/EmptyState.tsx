import { motion } from 'framer-motion';
import type { PropsWithChildren, ReactNode } from 'react';

export function EmptyState({ icon, title, children }: PropsWithChildren<{ icon?: ReactNode; title: string }>) {
  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
    >
      <motion.div
        className="empty-state__icon"
        initial={{ scale: 0.4, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 18 }}
      >
        {icon ?? '◎'}
      </motion.div>
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
    </motion.div>
  );
}

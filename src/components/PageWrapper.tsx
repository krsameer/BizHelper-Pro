import type { PropsWithChildren } from 'react';
import { motion } from 'framer-motion';

export function PageWrapper({ children }: PropsWithChildren) {
  return (
    <motion.div
      className="page-wrapper"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22 }}
    >
      {children}
    </motion.div>
  );
}

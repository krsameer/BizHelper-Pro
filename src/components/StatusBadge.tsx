import { motion } from 'framer-motion';
import type { RequestStatus } from '../types';

const colors: Record<RequestStatus, { background: string; color: string }> = {
  open: { background: 'rgba(251, 191, 36, 0.16)', color: '#f59e0b' },
  pending: { background: 'rgba(96, 165, 250, 0.16)', color: '#3b82f6' },
  resolved: { background: 'rgba(74, 222, 128, 0.16)', color: '#22c55e' },
  closed: { background: 'rgba(148, 163, 184, 0.16)', color: '#94a3b8' }
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const palette = colors[status];
  return (
    <motion.span
      className="status-badge"
      animate={{ backgroundColor: palette.background, color: palette.color }}
      transition={{ duration: 0.25 }}
    >
      {status}
    </motion.span>
  );
}

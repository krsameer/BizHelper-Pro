import { motion } from 'framer-motion';

export function SkeletonLoader({ height = 20 }: { height?: number }) {
  return (
    <motion.div
      aria-hidden="true"
      className="skeleton-loader"
      style={{ height }}
      animate={{ backgroundPositionX: ['0%', '100%'] }}
      transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
    />
  );
}

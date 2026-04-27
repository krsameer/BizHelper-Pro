import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { motion } from 'framer-motion';

type Props = PropsWithChildren<Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd'>>;
const MotionButton = motion.button as any;

export function AnimatedButton({ children, ...props }: Props) {
  return (
    <MotionButton
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      {...(props as Record<string, unknown>)}
    >
      {children}
    </MotionButton>
  );
}

import { motion } from 'framer-motion';

export function ThemeToggle({ theme, onToggle }: { theme: 'light' | 'dark'; onToggle: () => void }) {
  return (
    <motion.button className="theme-toggle" onClick={onToggle} aria-label="Toggle theme" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
      <motion.span
        className="theme-toggle__thumb"
        layout
        animate={{ x: theme === 'dark' ? 18 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      />
      <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
    </motion.button>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { motionValue, useMotionValueEvent } from 'framer-motion';

export const useDebouncedValue = <T,>(value: T, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);

  return debouncedValue;
};

export const useCountUp = (target: number, duration = 900) => {
  const countMotion = useMemo(() => motionValue(0), []);
  const [value, setValue] = useState(0);

  useMotionValueEvent(countMotion, 'change', (latest) => {
    setValue(Math.round(latest));
  });

  useEffect(() => {
    const start = countMotion.get();
    const startTime = performance.now();
    let frame = 0;

    const animate = (time: number) => {
      const progress = Math.min(1, (time - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      countMotion.set(start + (target - start) * eased);
      if (progress < 1) {
        frame = window.requestAnimationFrame(animate);
      }
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [countMotion, duration, target]);

  return value;
};

export const usePrefersDark = () => {
  const [prefersDark, setPrefersDark] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return prefersDark;
};

export const useThemeMode = () => {
  const prefersDark = usePrefersDark();
  const [manualTheme, setManualTheme] = useState<'light' | 'dark' | null>(null);

  const theme = manualTheme ?? (prefersDark ? 'dark' : 'light');
  const toggleTheme = () => setManualTheme((current) => (current === 'dark' ? 'light' : 'dark'));

  return { theme, setTheme: setManualTheme, toggleTheme };
};

import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

const STORAGE_KEY = 'restaurante-theme';

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  if (theme === 'dark') {
    html.classList.add('dark');
    html.classList.remove('light');
  } else {
    html.classList.remove('dark');
    html.classList.add('light');
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return saved ?? 'dark';
  });

  // Apply on mount
  useEffect(() => {
    applyTheme(theme);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    applyTheme(t);
  };

  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return { theme, toggle, isDark: theme === 'dark' };
}

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { THEME, ThemeName } from '~/styles/theme';
import { DEFAULT_THEME, THEME_STORAGE_KEY, applyTheme } from '~/utils/theme';

interface ThemeContextValue {
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(DEFAULT_THEME);

  // the colours are already on the page (themeScript in _document); this
  // syncs React's state with the saved theme once, after hydration
  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeName | null;

    if (saved && saved in THEME) {
      setThemeName(saved);
      applyTheme(saved);
    } else {
      applyTheme(DEFAULT_THEME);
    }
  }, []);

  function handleSetTheme(name: ThemeName) {
    setThemeName(name);
    applyTheme(name);
    localStorage.setItem(THEME_STORAGE_KEY, name);
  }

  return (
    <ThemeContext.Provider value={{ themeName, setThemeName: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

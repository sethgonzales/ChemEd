import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { THEME, ThemeName } from '~/styles/theme';
import { applyColorScale } from '~/utils/theme';

interface ThemeContextValue {
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const DEFAULT_THEME: ThemeName = 'purple';

function applyTheme(name: ThemeName) {
  const { primary, secondary, primaryText, secondaryText } = THEME[name];
  applyColorScale('primary', primary);
  applyColorScale('secondary', secondary);

  const root = document.documentElement;
  root.style.setProperty('--text-primary-base', primaryText);
  root.style.setProperty('--text-secondary-base', secondaryText);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(DEFAULT_THEME);

  // restore the saved theme once, after hydration (localStorage is client-only)
  useEffect(() => {
    const saved = localStorage.getItem('chem.theme') as ThemeName | null;

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
    localStorage.setItem('chem.theme', name);
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

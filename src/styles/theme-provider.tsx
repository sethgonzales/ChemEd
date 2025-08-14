import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { colord } from 'colord';
import { THEME, ThemeName } from '~/styles/colors';

interface ThemeContextValue {
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
  themeIsReady: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Utility functions
function generateColorScale(base: string): Record<string, string> {
  const c = colord(base);
  return {
    '50': c.lighten(0.45).toHex(),
    '100': c.lighten(0.35).toHex(),
    '200': c.lighten(0.25).toHex(),
    '300': c.lighten(0.15).toHex(),
    '400': c.lighten(0.05).toHex(),
    '500': base,
    '600': c.darken(0.05).toHex(),
    '700': c.darken(0.15).toHex(),
    '800': c.darken(0.25).toHex(),
    '900': c.darken(0.35).toHex(),
  };
}

function applyColorScale(type: 'primary' | 'secondary', baseColor: string) {
  const scale = generateColorScale(baseColor);
  const root = document.documentElement;

  Object.entries(scale).forEach(([level, color]) => {
    root.style.setProperty(`--${type}-${level}`, color);
    root.style.setProperty(
      `--color-${type}-${level}`,
      `var(--${type}-${level})`,
    );
  });

  root.style.setProperty(`--${type}`, baseColor);
  root.style.setProperty(`--color-chem-${type}`, `var(--${type})`);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>('purple');
  const [themeIsReady, setThemeIsReady] = useState(false);

  function applyTheme(name: ThemeName) {
    const { primary, secondary, primaryText, secondaryText } = THEME[name];
    applyColorScale('primary', primary);
    applyColorScale('secondary', secondary);

    const root = document.documentElement;
    root.style.setProperty('--text-primary', primaryText);
    root.style.setProperty('--text-secondary', secondaryText);
  }

  useEffect(() => {
    const saved = localStorage.getItem('themeName') as ThemeName | null;

    if (saved && saved in THEME) {
      setThemeName(saved);
      applyTheme(saved);
    } else {
      applyTheme(themeName);
    }

    setThemeIsReady(true);
  }, []);

  function handleSetTheme(name: ThemeName) {
    setThemeName(name);
    applyTheme(name);
    localStorage.setItem('themeName', name);
  }

  return (
    <ThemeContext.Provider
      value={{ themeName, setThemeName: handleSetTheme, themeIsReady }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

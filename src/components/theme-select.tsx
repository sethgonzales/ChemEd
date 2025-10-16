import { useEffect, useState } from 'react';
import { THEME } from '~/styles/theme';
import { useTheme } from '~/styles/theme-provider';
import Dropdown from './dropdown';
import { cn } from '~/utils/cn';

export function ThemeSelect() {
  const { themeName, setThemeName } = useTheme();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  return (
    <Dropdown
      label={THEME[themeName]?.label ?? 'Select theme'}
      className="w-full sm:w-42"
    >
      {Object.entries(THEME).map(([key, value]) => (
        <li key={key}>
          <button
            onClick={(e) => {
              e.preventDefault();
              setThemeName(key as keyof typeof THEME);
            }}
            className={cn(
              'block w-full text-left px-4 py-2 hover:bg-primary-600 cursor-pointer',
              'focus:ring-2 focus:outline-none',
              key === themeName && 'bg-primary-600',
            )}
          >
            {value.label}
          </button>
        </li>
      ))}
    </Dropdown>
  );
}

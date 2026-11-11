import { useEffect, useState } from 'react';
import { THEME } from '~/styles/theme';
import { useTheme } from '~/styles/theme-provider';
import Dropdown, { DropdownItem } from './dropdown';

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
        <DropdownItem
          key={key}
          selected={key === themeName}
          onSelect={() => setThemeName(key as keyof typeof THEME)}
        >
          {value.label}
        </DropdownItem>
      ))}
    </Dropdown>
  );
}

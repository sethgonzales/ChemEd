import { THEME } from '~/styles/colors';
import { useTheme } from '~/styles/theme-provider';

export function ThemeSelect() {
  const { themeName, setThemeName } = useTheme();
  return (
    <select
      className="border rounded px-2 py-1"
      value={themeName}
      onChange={(e) => setThemeName(e.target.value as keyof typeof THEME)}
    >
      {Object.entries(THEME).map(([key, value]) => (
        <option key={key} value={key}>
          {value.label}
        </option>
      ))}
    </select>
  );
}

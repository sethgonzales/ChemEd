import { colord } from 'colord';

// Each step moves a share of the way to white or black, rather than a fixed
// amount, so light and dark bases don't clip into duplicate shades. At 50%
// lightness the shares match fixed steps of 5–45%.
const LIGHTER = { '50': 0.9, '100': 0.7, '200': 0.5, '300': 0.3, '400': 0.1 };
const DARKER = { '600': 0.1, '700': 0.3, '800': 0.5, '900': 0.7 };

export const generateColorScale = (base: string): Record<string, string> => {
  const hsl = colord(base).toHsl();
  const withLightness = (l: number) => colord({ ...hsl, l }).toHex();

  return {
    ...Object.fromEntries(
      Object.entries(LIGHTER).map(([level, share]) => [
        level,
        withLightness(hsl.l + (100 - hsl.l) * share),
      ]),
    ),
    '500': base,
    ...Object.fromEntries(
      Object.entries(DARKER).map(([level, share]) => [
        level,
        withLightness(hsl.l * (1 - share)),
      ]),
    ),
  };
};

export const applyColorScale = (
  type: 'primary' | 'secondary',
  baseColor: string,
) => {
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
  root.style.setProperty(`--color-${type}`, `var(--${type})`);
};

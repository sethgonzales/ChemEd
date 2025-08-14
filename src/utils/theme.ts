import { colord } from 'colord';

export const generateColorScale = (base: string): Record<string, string> => {
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
  root.style.setProperty(`--color-chem-${type}`, `var(--${type})`);
};

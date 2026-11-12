import { colord } from 'colord';
import { THEME, type ThemeName } from '~/styles/theme';

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

export const DEFAULT_THEME: ThemeName = 'dungeon';
export const THEME_STORAGE_KEY = 'chem.theme';

/** Every CSS variable a theme sets on <html>: both colour scales and the text colours */
export function themeVariables(name: ThemeName): Record<string, string> {
  const { primary, secondary, primaryText, secondaryText } = THEME[name];
  const vars: Record<string, string> = {};
  for (const [type, base] of [
    ['primary', primary],
    ['secondary', secondary],
  ]) {
    for (const [level, color] of Object.entries(generateColorScale(base))) {
      vars[`--${type}-${level}`] = color;
      vars[`--color-${type}-${level}`] = `var(--${type}-${level})`;
    }
    vars[`--${type}`] = base;
    vars[`--color-${type}`] = `var(--${type})`;
  }
  vars['--text-primary-base'] = primaryText;
  vars['--text-secondary-base'] = secondaryText;
  return vars;
}

/**
 * A script for <head> that sets the saved (or default) theme's colours before
 * the first paint, so a refresh doesn't flash white while React loads. The
 * colours are worked out here, at build time, so the script only copies them.
 */
export function themeScript() {
  const all = Object.fromEntries(
    (Object.keys(THEME) as ThemeName[]).map((n) => [n, themeVariables(n)]),
  );
  return `(function(){var t=${JSON.stringify(all)},n;try{n=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch(e){}var v=Object.prototype.hasOwnProperty.call(t,n)?t[n]:t[${JSON.stringify(DEFAULT_THEME)}],s=document.documentElement.style;for(var k in v)s.setProperty(k,v[k])})()`;
}

/** Switches the page to a theme by setting its variables on <html> */
export function applyTheme(name: ThemeName) {
  const style = document.documentElement.style;
  for (const [key, value] of Object.entries(themeVariables(name))) {
    style.setProperty(key, value);
  }
}

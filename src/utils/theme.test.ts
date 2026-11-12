import { colord } from 'colord';
import { THEME } from '~/styles/theme';
import {
  applyTheme,
  generateColorScale,
  themeScript,
  themeVariables,
} from './theme';

const LEVELS = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
];

describe('generateColorScale', () => {
  const scale = generateColorScale('#8186e4');

  it('returns levels 50–900 with the base colour at 500', () => {
    expect(Object.keys(scale)).toEqual(LEVELS);
    expect(scale['500']).toBe('#8186e4');
  });

  it('never gets lighter from 50 to 900', () => {
    const brightness = LEVELS.map((l) => colord(scale[l]).brightness());
    for (let i = 1; i < brightness.length; i++) {
      expect(brightness[i]).toBeLessThanOrEqual(brightness[i - 1]);
    }
  });

  // pure black and white can't get any darker or lighter, so they're exempt
  const themeColours = Object.values(THEME).flatMap((t) => [
    t.primary,
    t.secondary,
  ]);
  it.each(
    [...new Set(themeColours)].filter(
      (c) => !['#000000', '#ffffff'].includes(c),
    ),
  )('gives %s ten distinct shades', (base) => {
    const shades = Object.values(generateColorScale(base));
    expect(new Set(shades).size).toBe(10);
  });
});

describe('applyTheme', () => {
  it('sets the theme’s variables on the root', () => {
    applyTheme('purple');
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--primary')).toBe(THEME.purple.primary);
    expect(style.getPropertyValue('--color-primary')).toBe('var(--primary)');
    expect(style.getPropertyValue('--color-primary-700')).toBe(
      'var(--primary-700)',
    );
    expect(style.getPropertyValue('--text-secondary-base')).toBe(
      THEME.purple.secondaryText,
    );
  });
});

describe('themeVariables', () => {
  it('lists every CSS variable a theme sets, scales and text colours included', () => {
    const vars = themeVariables('dungeon');
    expect(vars['--primary-500']).toBe(THEME.dungeon.primary);
    expect(vars['--secondary-500']).toBe(THEME.dungeon.secondary);
    expect(vars['--primary-400']).toBe(
      generateColorScale(THEME.dungeon.primary)['400'],
    );
    expect(vars['--color-primary-400']).toBe('var(--primary-400)');
    expect(vars['--text-primary-base']).toBe(THEME.dungeon.primaryText);
  });
});

describe('themeScript (runs in <head>, before the first paint)', () => {
  const run = () => new Function(themeScript())();
  const primary = () =>
    document.documentElement.style.getPropertyValue('--primary-500');

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('style');
  });

  it('paints the default theme straight away', () => {
    run();
    expect(primary()).toBe(THEME.dungeon.primary);
  });

  it('uses the theme the student saved', () => {
    localStorage.setItem('chem.theme', 'purple');
    run();
    expect(primary()).toBe(THEME.purple.primary);
  });

  it('ignores a saved name that isn’t a theme', () => {
    localStorage.setItem('chem.theme', 'nope');
    run();
    expect(primary()).toBe(THEME.dungeon.primary);
  });
});

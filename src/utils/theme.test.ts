import { colord } from 'colord';
import { THEME } from '~/styles/theme';
import { applyColorScale, generateColorScale } from './theme';

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

describe('applyColorScale', () => {
  it('sets the scale and base colour as CSS variables on the root', () => {
    applyColorScale('primary', '#14b8a6');
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--primary')).toBe('#14b8a6');
    expect(style.getPropertyValue('--color-primary')).toBe('var(--primary)');
    expect(style.getPropertyValue('--primary-500')).toBe('#14b8a6');
    expect(style.getPropertyValue('--color-primary-700')).toBe(
      'var(--primary-700)',
    );
  });
});

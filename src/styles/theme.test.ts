import { colord, extend } from 'colord';
import a11yPlugin from 'colord/plugins/a11y';
import { THEME } from './theme';

extend([a11yPlugin]);

// WCAG AA for normal-size text
const READABLE = 4.5;

describe.each(Object.entries(THEME))('the %s theme', (_, theme) => {
  it('has readable text on its panels', () => {
    expect(
      colord(theme.primaryText).contrast(theme.primary),
    ).toBeGreaterThanOrEqual(READABLE);
  });

  it('has readable text on its accent (selected tabs, main buttons, chips)', () => {
    expect(
      colord(theme.secondaryText).contrast(theme.secondary),
    ).toBeGreaterThanOrEqual(READABLE);
  });
});

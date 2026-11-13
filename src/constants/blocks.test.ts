import { colord, extend } from 'colord';
import a11yPlugin from 'colord/plugins/a11y';
import { BLOCK_COLORS, CATEGORY_COLORS, NO_DATA_COLOR } from './blocks';

extend([a11yPlugin]);

describe('BLOCK_COLORS', () => {
  it.each(Object.entries(BLOCK_COLORS))(
    'the %s-block colour keeps white text readable',
    (_, color) => {
      expect(colord('#ffffff').contrast(color)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('gives each block its own colour', () => {
    expect(new Set(Object.values(BLOCK_COLORS)).size).toBe(4);
  });
});

describe('CATEGORY_COLORS and NO_DATA_COLOR', () => {
  it.each([...Object.entries(CATEGORY_COLORS), ['no data', NO_DATA_COLOR]])(
    'the %s colour keeps white text readable',
    (_, color) => {
      expect(colord('#ffffff').contrast(color)).toBeGreaterThanOrEqual(4.5);
    },
  );
});

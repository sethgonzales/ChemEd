import { ART_HEIGHT, ART_WIDTH, DOOR_ART } from './door-art';

describe('door art', () => {
  it.each(Object.entries(DOOR_ART))(
    '%s is full size and only uses its own colours',
    (_, { rows, palette }) => {
      expect(rows).toHaveLength(ART_HEIGHT);
      for (const row of rows) {
        expect(row).toHaveLength(ART_WIDTH);
        for (const pixel of row) {
          expect(pixel === '.' || pixel in palette).toBe(true);
        }
      }
    },
  );

  it('draws water with exactly two lone pairs on oxygen: four electron dots', () => {
    const dots = DOOR_ART.lewis.rows
      .join('')
      .split('')
      .filter((p) => p === 'e');
    expect(dots).toHaveLength(4);
  });
});

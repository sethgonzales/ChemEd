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
});

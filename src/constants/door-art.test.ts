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

describe('electrons door', () => {
  it('draws its shells as round rings, not squares', () => {
    const centre = { x: (ART_WIDTH - 1) / 2, y: (ART_HEIGHT - 1) / 2 };
    const radii = DOOR_ART.electrons.rows.flatMap((row, y) =>
      [...row].flatMap((p, x) =>
        p === 'R' ? [Math.hypot(x - centre.x, y - centre.y)] : [],
      ),
    );
    // two rings, each a steady distance from the nucleus (electrons sit on them)
    const inner = radii.filter((r) => r < 6);
    const outer = radii.filter((r) => r >= 6);
    for (const ring of [inner, outer]) {
      expect(ring.length).toBeGreaterThan(0);
      expect(Math.max(...ring) - Math.min(...ring)).toBeLessThanOrEqual(1.5);
    }
  });
});

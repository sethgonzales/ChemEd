import { PROWL_PERIOD, stance } from './prowl';

// one full prowl, sampled finely
const samples = Array.from({ length: 200 }, (_, i) =>
  stance((i / 200) * PROWL_PERIOD, 0),
);
const scales = samples.map((s) => s.scale);

describe('a boss prowling', () => {
  it('comes closer and backs away again', () => {
    expect(Math.max(...scales) / Math.min(...scales)).toBeGreaterThan(1.3);
  });

  it('is higher up, toward the far wall, when further away', () => {
    const far = samples.reduce((a, s) => (s.scale < a.scale ? s : a));
    const near = samples.reduce((a, s) => (s.scale > a.scale ? s : a));
    expect(far.y).toBeLessThan(near.y);
  });

  it('sways from side to side', () => {
    const xs = samples.map((s) => s.x);
    expect(Math.min(...xs)).toBeLessThan(0);
    expect(Math.max(...xs)).toBeGreaterThan(0);
  });

  it('keeps on prowling, the same each time round', () => {
    expect(stance(1.3 + PROWL_PERIOD, 0)).toEqual(stance(1.3, 0));
  });

  it('rushes right up close when it attacks', () => {
    for (const t of [0, PROWL_PERIOD / 3, PROWL_PERIOD / 2])
      expect(stance(t, 1).scale).toBeGreaterThan(Math.max(...scales));
  });
});

import { halfSize } from './mini-sprite';

describe('halfSize (a sprite seen from far off)', () => {
  it('halves the width and height', () => {
    const rows = halfSize(['abcd', 'efgh', 'ijkl', 'mnop']);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.length === 2)).toBe(true);
  });

  it('keeps the colour most of each 2 × 2 block shows', () => {
    expect(halfSize(['SSKK', 'SHKK'])).toEqual(['SK']);
  });

  it('keeps a block drawn if any of it is, so thin details survive', () => {
    expect(halfSize(['.G', '..'])).toEqual(['G']);
  });

  it('prefers a colour to the outline when they tie, so faces don’t turn dark', () => {
    expect(halfSize(['KS', 'SK'])).toEqual(['S']);
  });

  it('leaves an empty block see-through', () => {
    expect(halfSize(['..', '..'])).toEqual(['.']);
  });
});

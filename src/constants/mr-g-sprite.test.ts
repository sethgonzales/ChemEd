import { FRAMES, PALETTE, SPRITE_HEIGHT, SPRITE_WIDTH } from './mr-g-sprite';

const rowsWith = (frame: string[], key: string) =>
  frame.flatMap((row, i) => (row.includes(key) ? [i] : []));

// rows where two frames differ
const changedRows = (a: string[], b: string[]) =>
  a.flatMap((row, i) => (row === b[i] ? [] : [i]));

describe('Mr. G sprite', () => {
  it.each(Object.entries(FRAMES))(
    'the %s frame is the full size and only uses palette colours',
    (_, frame) => {
      expect(frame).toHaveLength(SPRITE_HEIGHT);
      for (const row of frame) {
        expect(row).toHaveLength(SPRITE_WIDTH);
        for (const pixel of row) {
          expect(pixel === '.' || pixel in PALETTE).toBe(true);
        }
      }
    },
  );

  it('wears his goggles pushed up on his head, above his eyes', () => {
    const goggles = rowsWith(FRAMES.idle, 'L');
    const eyes = rowsWith(FRAMES.idle, 'E');
    expect(goggles.length).toBeGreaterThan(0);
    expect(Math.max(...goggles)).toBeLessThan(Math.min(...eyes));
  });

  it('has a light blue lab coat', () => {
    expect(PALETTE.C).toMatch(/^#/);
    expect(rowsWith(FRAMES.idle, 'C').length).toBeGreaterThan(5);
  });

  it('has light facial hair along his jaw', () => {
    const stubble = rowsWith(FRAMES.idle, 'b');
    const eyes = rowsWith(FRAMES.idle, 'E');
    expect(stubble.length).toBeGreaterThan(0);
    expect(Math.min(...stubble)).toBeGreaterThan(Math.max(...eyes));
  });

  it('has a square face: the same width from forehead to jaw', () => {
    const face = FRAMES.idle.slice(5, 14).map((row) => row.indexOf('K'));
    // the outline only steps out for the ears
    expect(new Set(face.filter((col) => col === 3)).size).toBe(1);
    expect(face.filter((col) => col === 3).length).toBeGreaterThanOrEqual(7);
  });

  it('has blue-gray eyes', () => {
    const [r, g, b] = [1, 3, 5].map((i) =>
      parseInt(PALETTE.E.slice(i, i + 2), 16),
    );
    // blue leads, but only a little: a muted blue-gray, not a bright blue
    expect(b).toBeGreaterThan(Math.max(r, g));
    expect(b - Math.min(r, g)).toBeGreaterThan(30);
    expect(b - Math.min(r, g)).toBeLessThan(80);
  });

  it('has a mustache just above his mouth', () => {
    const mouth = Math.min(...rowsWith(FRAMES.idle, 'M'));
    const above = FRAMES.idle[mouth - 1];
    const mouthCols = [...FRAMES.idle[mouth]].flatMap((p, i) =>
      p === 'M' ? [i] : [],
    );
    for (const col of mouthCols) expect(above[col]).toBe('b');
  });

  it('wears his lab coat open over a flannel shirt', () => {
    const flannel = rowsWith(FRAMES.idle, 'R');
    expect(flannel.length).toBeGreaterThanOrEqual(6);
    for (const row of flannel) {
      const line = FRAMES.idle[row];
      // coat on both sides, flannel showing in the opening
      expect(line.indexOf('C')).toBeLessThan(line.indexOf('R'));
      expect(line.lastIndexOf('C')).toBeGreaterThan(line.lastIndexOf('R'));
    }
  });

  it('has a rounded top to his head', () => {
    const width = (row: string) => row.replace(/\./g, '').length;
    const [top, next, full] = FRAMES.idle;
    expect(width(top)).toBeLessThan(width(next));
    expect(width(next)).toBeLessThan(width(full));
  });

  it('has stubble out to both edges of his face', () => {
    const mouth = Math.min(...rowsWith(FRAMES.idle, 'M'));
    for (const row of [mouth - 1, mouth, mouth + 1]) {
      const line = FRAMES.idle[row];
      // the face's first and last pixels, just inside the outline
      expect(line[line.indexOf('K') + 1]).toBe('b');
      expect(line[line.lastIndexOf('K') - 1]).toBe('b');
    }
  });

  it('blinks with his eyes only', () => {
    const changed = changedRows(FRAMES.idle, FRAMES.blink);
    expect(changed.length).toBeGreaterThan(0);
    for (const row of changed) expect(FRAMES.idle[row]).toContain('E');
  });

  it('talks with his mouth only', () => {
    const mouth = rowsWith(FRAMES.idle, 'M');
    const changed = changedRows(FRAMES.idle, FRAMES.talk);
    expect(changed.length).toBeGreaterThan(0);
    for (const row of changed) {
      expect(Math.abs(row - Math.min(...mouth))).toBeLessThanOrEqual(1);
    }
  });

  it('walks with his legs only, alternating feet', () => {
    const legs = Math.min(...rowsWith(FRAMES.idle, 'P'));
    for (const frame of [FRAMES.walk1, FRAMES.walk2]) {
      for (const row of changedRows(FRAMES.idle, frame)) {
        expect(row).toBeGreaterThanOrEqual(legs - 1);
      }
    }
    expect(FRAMES.walk1).not.toEqual(FRAMES.walk2);
  });
});

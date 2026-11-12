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

  it('has an oval head: narrow at the top and chin, widest at the cheeks', () => {
    const width = (row: string) => row.replace(/\./g, '').length;
    const head = FRAMES.idle.slice(0, 16).map(width);
    const widest = Math.max(...head);
    const cheeks = head.indexOf(widest);
    for (let i = 1; i <= cheeks; i++)
      expect(head[i]).toBeGreaterThanOrEqual(head[i - 1]);
    for (let i = cheeks + 1; i < head.length; i++)
      expect(head[i]).toBeLessThanOrEqual(head[i - 1]);
    expect(head[0]).toBeLessThan(widest - 4);
    expect(head[15]).toBeLessThan(widest - 4);
  });

  it('has medium brown hair', () => {
    const [r, g, b] = [1, 3, 5].map((i) =>
      parseInt(PALETTE.H.slice(i, i + 2), 16),
    );
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
    // a shade lighter than the first dark brown, #4a3424
    expect(r + g + b).toBeGreaterThan(0x4a + 0x34 + 0x24 + 40);
  });

  it('brushes his hair to one side', () => {
    const filled = (row: string) =>
      [...row].flatMap((p, i) => (p === '.' ? [] : [i]));
    const middle = (row: string) =>
      (Math.min(...filled(row)) + Math.max(...filled(row))) / 2;
    const [crown, next] = FRAMES.idle;
    const face = FRAMES.idle[Math.min(...rowsWith(FRAMES.idle, 'E'))];
    // the top of his hair leans to one side of his face
    expect(middle(crown)).not.toBe(middle(face));
    expect(middle(next)).not.toBe(middle(face));
    // darker strands show which way it's combed
    expect(rowsWith(FRAMES.idle.slice(0, 3), 'h').length).toBeGreaterThan(0);
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

  it('has a mustache that runs down beside his mouth into the chin stubble', () => {
    const mouth = Math.min(...rowsWith(FRAMES.idle, 'M'));
    const line = FRAMES.idle[mouth];
    expect(line[line.indexOf('M') - 1]).toBe('b');
    expect(line[line.lastIndexOf('M') + 1]).toBe('b');
    // and the row under the mouth is stubble too
    const below = FRAMES.idle[Math.max(...rowsWith(FRAMES.idle, 'M')) + 1];
    for (let col = line.indexOf('M'); col <= line.lastIndexOf('M'); col++)
      expect(below[col]).toBe('b');
  });

  it('has a neutral mouth: one short straight line', () => {
    const rows = rowsWith(FRAMES.idle, 'M');
    expect(rows).toHaveLength(1);
    expect(FRAMES.idle[rows[0]]).toMatch(/[^M]MM[^M]/);
  });

  it('has soft, raised brows with skin between them and his eyes', () => {
    const brows = rowsWith(FRAMES.idle, 'B');
    const eyes = Math.min(...rowsWith(FRAMES.idle, 'E'));
    const eyeCols = [...FRAMES.idle[eyes]].flatMap((p, i) =>
      p === 'E' ? [i] : [],
    );
    // the row just above the eyes is bare skin, and the brows sit above it
    for (const col of eyeCols) {
      expect(FRAMES.idle[eyes - 1][col]).toBe('S');
      expect(FRAMES.idle[eyes - 2][col]).toBe('B');
    }
    expect(Math.max(...brows)).toBeLessThan(eyes);
    // lighter than his hair, so they don't read as a scowl
    const sum = (hex: string) =>
      [1, 3, 5].reduce((t, i) => t + parseInt(hex.slice(i, i + 2), 16), 0);
    expect(sum(PALETTE.B)).toBeGreaterThan(sum(PALETTE.H));
  });

  it('arches his brows: the outer ends dip lower than the middle', () => {
    const [high, low] = rowsWith(FRAMES.idle, 'B');
    expect(low).toBe(high + 1);
    const cols = (row: number) =>
      [...FRAMES.idle[row]].flatMap((p, i) => (p === 'B' ? [i] : []));
    expect(Math.min(...cols(low))).toBeLessThan(Math.min(...cols(high)));
    expect(Math.max(...cols(low))).toBeGreaterThan(Math.max(...cols(high)));
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

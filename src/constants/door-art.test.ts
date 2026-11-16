import { ART_HEIGHT, ART_WIDTH, DOOR_ART } from './door-art';

// groups of touching pixels of a letter, e.g. the dots of a lone pair, as
// each group's centre
function clusters(rows: string[], letter: string) {
  const seen = new Set<string>();
  const groups: { x: number; y: number }[] = [];
  rows.forEach((row, y) =>
    [...row].forEach((p, x) => {
      if (p !== letter || seen.has(`${x},${y}`)) return;
      const pixels: number[][] = [];
      const stack = [[x, y]];
      seen.add(`${x},${y}`);
      while (stack.length) {
        const [cx, cy] = stack.pop()!;
        pixels.push([cx, cy]);
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const [nx, ny] = [cx + dx, cy + dy];
          const key = `${nx},${ny}`;
          if (rows[ny]?.[nx] === letter && !seen.has(key)) {
            seen.add(key);
            stack.push([nx, ny]);
          }
        }
      }
      const mean = (i: number) =>
        pixels.reduce((sum, p) => sum + p[i], 0) / pixels.length;
      groups.push({ x: mean(0), y: mean(1) });
    }),
  );
  return groups;
}

describe('door art', () => {
  it.each(Object.entries(DOOR_ART))(
    '%s fits its door, is rectangular, and only uses its own colours',
    (_, { rows, palette }) => {
      expect(rows.length).toBeLessThanOrEqual(ART_HEIGHT);
      for (const row of rows) {
        expect(row.length).toBeLessThanOrEqual(ART_WIDTH);
        expect(row).toHaveLength(rows[0].length);
        for (const pixel of row) {
          expect(pixel === '.' || pixel in palette).toBe(true);
        }
      }
    },
  );

  it.each(Object.entries(DOOR_ART))(
    '%s is drawn in fine detail, at least 36 pixels across',
    (_, { rows }) => {
      expect(rows[0].length).toBeGreaterThanOrEqual(36);
    },
  );

  it('draws water with exactly two lone pairs on oxygen: four electron dots', () => {
    expect(clusters(DOOR_ART.lewis.rows, 'e')).toHaveLength(4);
  });

  it('angles the lone pairs up and out from oxygen, as in its bent, tetrahedral shape', () => {
    const rows = DOOR_ART.lewis.rows;
    const oxygen = clusters(rows, 'O')[0];
    const dots = clusters(rows, 'e').sort((a, b) => a.x - b.x);
    const [left, right] = [dots.slice(0, 2), dots.slice(2)];
    for (const pair of [left, right]) {
      // above oxygen, and tilted rather than level
      for (const dot of pair) expect(dot.y).toBeLessThan(oxygen.y);
      expect(Math.abs(pair[0].y - pair[1].y)).toBeGreaterThanOrEqual(2);
    }
    // each pair's outer dot is higher, so the pairs splay away from each other
    expect(left[0].y).toBeGreaterThan(left[1].y);
    expect(right[1].y).toBeGreaterThan(right[0].y);
    // and the hydrogens hang below oxygen, bent rather than in a line
    const hydrogens = clusters(rows, 'H');
    expect(hydrogens).toHaveLength(2);
    for (const h of hydrogens) expect(h.y).toBeGreaterThan(oxygen.y + 4);
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
    // two rings, each a steady distance from the nucleus (electrons sit on
    // them), two pixels thick
    const inner = radii.filter((r) => r < 11);
    const outer = radii.filter((r) => r >= 11);
    for (const ring of [inner, outer]) {
      expect(ring.length).toBeGreaterThan(0);
      expect(Math.max(...ring) - Math.min(...ring)).toBeLessThanOrEqual(2.5);
    }
  });
});

// the columns a row's pixels of the given letters span
const span = (row: string, letters: string) => {
  const xs = [...row].flatMap((p, x) => (letters.includes(p) ? [x] : []));
  return xs.length
    ? { left: xs[0], right: xs.at(-1)!, count: xs.length }
    : null;
};

describe('periodic table door', () => {
  const TILES = 'SsPpDdFfG'; // s, p, d and f-block tiles, and the glowing one
  const rows = DOOR_ART.periodic.rows;
  const tileRows = rows
    .map((row, y) => ({ y, s: span(row, TILES) }))
    .filter((r) => r.s);

  // each element is a 2 × 2 tile, so every period takes two rows of pixels
  it('has the periodic table’s shape: 2, 8, 8, then 18 across, and the f-block', () => {
    expect(tileRows.map((r) => r.s!.count)).toEqual(
      [2, 8, 8, 18, 18, 18, 18, 14, 14].flatMap((n) => [2 * n, 2 * n]),
    );
  });

  it('puts H and He at the far ends of the first row', () => {
    const [first, , , fourth] = tileRows;
    expect(first.s!.left).toBe(fourth.s!.left);
    expect(first.s!.right).toBe(fourth.s!.right);
  });

  it('sets the f-block apart below, indented under the d-block', () => {
    const period7 = tileRows[13];
    const f = tileRows[14];
    expect(f.y - period7.y).toBeGreaterThan(1); // a gap row
    expect(f.s!.left).toBe(period7.s!.left + 4); // two elements in
  });
});

describe('titrations door', () => {
  const rows = DOOR_ART.titrations.rows;
  const flask = rows.map((row) => span(row, 'F')).filter(Boolean);
  const widths = flask.map((s) => s!.right - s!.left + 1);

  it('draws an Erlenmeyer flask: a narrow neck widening to the base', () => {
    const base = Math.max(...widths);
    expect(widths.at(-1)).toBe(base); // widest at the bottom
    expect(Math.min(...widths)).toBeLessThanOrEqual(base / 2); // the neck
    const below = widths.slice(widths.indexOf(Math.min(...widths)));
    below
      .slice(1)
      .forEach((w, i) => expect(w).toBeGreaterThanOrEqual(below[i]));
    expect(flask.length).toBeGreaterThanOrEqual(base * 0.8); // not squat
  });

  it('hangs a burette with a stopcock above it, held by a stand', () => {
    const burette = rows.map((row) => span(row, 'B')).filter(Boolean);
    const stopcock = rows.map((row) => span(row, 'C')).find(Boolean)!;
    expect(burette.length).toBeGreaterThanOrEqual(5);
    expect(stopcock.right - stopcock.left + 1).toBeGreaterThan(4);
    expect(rows.some((row) => row.includes('R'))).toBe(true); // stand rod
  });
});

describe('balancing door', () => {
  const rows = DOOR_ART.balancing.rows;
  const beam = rows
    .map((row, y) => ({ y, s: span(row, 'B') }))
    .find((r) => r.s)!;
  const centre = (beam.s!.left + beam.s!.right) / 2;

  it('draws a level beam, balanced on a pivot under its middle', () => {
    expect(beam.s!.count).toBe(beam.s!.right - beam.s!.left + 1); // unbroken
    const pivot = span(rows[beam.y + 1], 'T');
    expect(pivot).not.toBeNull();
    expect((pivot!.left + pivot!.right) / 2).toBe(centre);
  });

  it('is a mirror image, with molecules in a pan at each end', () => {
    for (const row of rows) {
      const shape = row.replace(/[^.]/g, '#'); // molecules may differ in colour
      expect(shape).toBe([...shape].reverse().join(''));
    }
    expect(rows.join('')).toMatch(/[MN]/); // atoms in the pans
  });
});

describe('electrochemistry door', () => {
  const rows = DOOR_ART.electrochemistry.rows;
  const column = (letter: string) =>
    rows.flatMap((row) =>
      [...row].flatMap((p, x) => (p === letter ? [x] : [])),
    );

  it('draws two beakers of solution side by side, an electrode in each', () => {
    const base = rows.findLast((row) => row.includes('G'))!;
    const glass = [...base].flatMap((p, x) => (p === 'G' ? [x] : []));
    const gap = glass.findIndex((x, i) => i && x - glass[i - 1] > 1);
    expect(gap).toBeGreaterThan(0); // two separate beakers
    const [zinc, copper] = [column('Z'), column('C')];
    expect(Math.min(...zinc)).toBeGreaterThan(glass[0]);
    expect(Math.max(...zinc)).toBeLessThan(glass[gap]);
    expect(Math.min(...copper)).toBeGreaterThan(glass[gap]);
    expect(rows.join('')).toMatch(/L/); // zinc's solution
    expect(rows.join('')).toMatch(/U/); // blue Cu²⁺
  });

  it('wires the electrodes through a lit bulb, and bridges the beakers', () => {
    const wire = rows.find((row) => row.includes('W'))!;
    const span = [...wire].flatMap((p, x) => (/[Wb]/.test(p) ? [x] : []));
    expect(span[0]).toBe(column('Z')[0]);
    expect(span.at(-1)).toBe(column('C')[0]);
    const bulb = rows.findIndex((row) => row.includes('Y'));
    expect(bulb).toBeLessThan(rows.indexOf(wire)); // above the wire
    expect(column('S').length).toBeGreaterThan(5); // the salt bridge
  });
});

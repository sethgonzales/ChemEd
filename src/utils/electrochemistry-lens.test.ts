import type { Side } from './electrochemistry';
import {
  createLens,
  stepLens,
  type Lens,
  type LensSpot,
} from './electrochemistry-lens';

// a small seeded generator, so runs repeat exactly
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const DT = 1 / 30; // s, a frame

const lens = (
  spot: LensSpot,
  {
    metal = 'Zn',
    concentration = 1,
    cathodeSide = 'right' as Side,
    wear = 0,
  } = {},
) => createLens(spot, { metal, concentration, cathodeSide, wear }, seeded(1));

// runs the lens while the cell's wear climbs steadily from `from` to `to`
const run = (
  start: Lens,
  seconds: number,
  {
    current = 0.11,
    from = 0,
    to = from,
    seed = 2,
  }: { current?: number; from?: number; to?: number; seed?: number } = {},
) => {
  const random = seeded(seed);
  let l = start;
  const frames = Math.round(seconds / DT);
  for (let i = 1; i <= frames; i++) {
    const wear = from + ((to - from) * i) / frames;
    l = stepLens(l, { dt: DT, current, concentration: 1, wear }, random);
  }
  return l;
};

const of = (l: Lens, kind: string) =>
  l.particles.filter((p) => p.kind === kind);

// the atoms in both, as they were and as they are
const sameAtoms = (a: Lens, b: Lens) => {
  const now = new Map(of(b, 'atom').map((p) => [p.id, p]));
  return of(a, 'atom').flatMap((x) => {
    const y = now.get(x.id);
    return y ? [[x, y] as const] : [];
  });
};

// steps through a whole run, checking no atom ever moves once placed
const runChecking = (start: Lens, seed: number) => {
  let l = start;
  let moved = 0;
  const random = seeded(seed);
  for (let i = 1; i <= 1800; i++) {
    const next = stepLens(
      l,
      { dt: DT, current: 0.11, concentration: 1, wear: i / 1800 },
      random,
    );
    for (const [was, is] of sameAtoms(l, next))
      if (is.x !== was.x || is.y !== was.y) moved++;
    l = next;
  }
  expect(moved).toBe(0);
  return l;
};

const surface = (l: Lens) => Math.max(...of(l, 'atom').map((p) => p.x));

describe('the anode, close up', () => {
  it('dissolves atoms as the cell wears the electrode, each freeing its electrons', () => {
    const start = lens('anode');
    const after = run(start, 60, { to: 0.5 });
    expect(after.oxidised).toBeGreaterThan(5);
    expect(after.electronsReleased).toBe(2 * after.oxidised); // Zn → Zn²⁺ + 2e⁻
    expect(of(after, 'atom').length).toBe(
      of(start, 'atom').length - after.oxidised,
    );
    expect(after.reduced).toBe(0);
  });

  it('keeps every atom where it is until it leaves: the view never jumps', () => {
    runChecking(lens('anode'), 4);
  });

  it('wears the surface back into the metal over the whole run, keeping some', () => {
    const start = lens('anode');
    const half = run(start, 30, { to: 0.5 });
    const flat = run(half, 30, { from: 0.5, to: 1 });
    expect(surface(half)).toBeLessThan(surface(start));
    expect(surface(flat)).toBeLessThan(surface(half));
    expect(of(flat, 'atom').length).toBeGreaterThan(0);
  });

  it('sends the freed electrons away through the metal towards the wire', () => {
    const random = seeded(3);
    const input = { dt: DT, current: 0.11, concentration: 1, wear: 0.5 };
    let before = lens('anode');
    while (!before.oxidised) before = stepLens(before, input, random);
    const after = stepLens(before, input, random);
    const electrons = of(before, 'electron');
    expect(electrons).toHaveLength(2);
    for (const e of electrons)
      expect(after.particles.find((p) => p.id === e.id)!.x).toBeLessThan(e.x);
  });

  it('frees one electron per silver atom, three per aluminium atom', () => {
    const silver = run(lens('anode', { metal: 'Ag' }), 30, { to: 0.5 });
    expect(silver.electronsReleased).toBe(silver.oxidised);
    const al = run(lens('anode', { metal: 'Al' }), 30, { to: 0.5 });
    expect(al.electronsReleased).toBe(3 * al.oxidised);
  });

  it('shows the wear so far when opened partway through a run', () => {
    const fresh = of(lens('anode'), 'atom').length;
    const worn = of(lens('anode', { wear: 0.5 }), 'atom').length;
    expect(worn).toBeLessThan(fresh);
  });
});

describe('the cathode, close up', () => {
  it('turns ions into atoms on the surface with electrons from the wire', () => {
    const start = lens('cathode', { metal: 'Cu' });
    const after = run(start, 60, { to: 0.5 });
    expect(after.reduced).toBeGreaterThan(5);
    expect(after.electronsArrived).toBe(2 * after.reduced); // Cu²⁺ + 2e⁻ → Cu
    expect(after.oxidised).toBe(0);
  });

  it('builds the surface outwards without shifting the atoms already there', () => {
    const start = lens('cathode', { metal: 'Cu' });
    expect(surface(runChecking(start, 5))).toBeGreaterThan(surface(start));
  });

  it('shows the coat so far when opened partway through a run', () => {
    const fresh = of(lens('cathode', { metal: 'Cu' }), 'atom').length;
    const coated = of(
      lens('cathode', { metal: 'Cu', wear: 0.5 }),
      'atom',
    ).length;
    expect(coated).toBeGreaterThan(fresh);
  });
});

describe('electrons, one per unit of charge, each visible', () => {
  // the closest any two electrons come, from a reaction until they're gone
  const closest = (spot: LensSpot, metal: string) => {
    const random = seeded(7);
    const input = { dt: DT, current: 0.11, concentration: 1, wear: 0.1 };
    let l = lens(spot, { metal });
    const done = () => l.oxidised + l.reduced;
    while (!done()) l = stepLens(l, input, random);
    const count = of(l, 'electron').length;
    let min = Infinity;
    for (let i = 0; i < 300 && of(l, 'electron').length; i++) {
      const es = of(l, 'electron');
      for (const a of es)
        for (const b of es)
          if (a !== b) min = Math.min(min, Math.hypot(a.x - b.x, a.y - b.y));
      l = stepLens(l, { ...input, wear: 0 }, random); // no more reactions
    }
    return { count, min };
  };

  it.each([
    ['cathode', 'Cu', 2],
    ['cathode', 'Al', 3],
    ['anode', 'Zn', 2],
    ['anode', 'Al', 3],
  ] as const)(
    'keeps each of the %s’s electrons apart all the way (%s, %i e⁻)',
    (spot, metal, n) => {
      const { count, min } = closest(spot, metal);
      expect(count).toBe(n);
      expect(min).toBeGreaterThan(0.035); // two electron dots never merge
    },
  );
});

describe('pace', () => {
  it('reacts in step with the cell’s wear, and not at all while it stands still', () => {
    const some = run(lens('anode'), 60, { to: 0.25 }).oxidised;
    const more = run(lens('anode'), 60, { to: 0.5 }).oxidised;
    expect(more / some).toBeGreaterThan(1.7);
    expect(more / some).toBeLessThan(2.3);
    expect(run(lens('anode'), 30).oxidised).toBe(0);
    expect(run(lens('cathode'), 30).reduced).toBe(0);
  });

  it('moves at most two atoms a second, even when the cell races ahead', () => {
    const after = run(lens('anode'), 1, { from: 1, to: 1 });
    expect(after.oxidised).toBeLessThanOrEqual(2);
  });

  it('keeps the ions moving even when no current flows', () => {
    const start = lens('cathode', { metal: 'Cu' });
    const after = run(start, 1, { current: 0 });
    const ion = of(start, 'cation')[0];
    expect(after.particles.find((p) => p.id === ion.id)).not.toMatchObject({
      x: ion.x,
      y: ion.y,
    });
  });
});

describe('ions floating in solution', () => {
  // follows each free ion frame by frame: how fast, and how sharply it turns
  const motion = (spot: LensSpot) => {
    let l = lens(spot, { metal: 'Cu' });
    const random = seeded(6);
    const speeds: number[] = [];
    const turns: number[] = [];
    let last = new Map<number, [number, number]>();
    for (let i = 0; i < 300; i++) {
      const next = stepLens(
        l,
        { dt: DT, current: 0, concentration: 1, wear: 0 },
        random,
      );
      const steps = new Map<number, [number, number]>();
      for (const p of next.particles) {
        const was = l.particles.find((q) => q.id === p.id);
        if (!was || p.kind === 'atom' || p.to) continue;
        const step: [number, number] = [p.x - was.x, p.y - was.y];
        if (Math.abs(step[0]) > 0.5) continue; // wrapped round the bridge
        steps.set(p.id, step);
        speeds.push(Math.hypot(...step) / DT);
        const prev = last.get(p.id);
        if (prev && Math.hypot(...prev) && Math.hypot(...step)) {
          const cos =
            (prev[0] * step[0] + prev[1] * step[1]) /
            (Math.hypot(...prev) * Math.hypot(...step));
          turns.push(Math.acos(Math.min(1, Math.max(-1, cos))));
        }
      }
      last = steps;
      l = next;
    }
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    // the median, since bouncing off a wall is a fair sharp turn
    const median = (xs: number[]) =>
      [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    return { speed: mean(speeds), turn: median(turns) };
  };

  it.each(['cathode', 'bridge'] as const)(
    'drifts slowly and smoothly rather than vibrating (%s)',
    (spot) => {
      const { speed, turn } = motion(spot);
      expect(speed).toBeGreaterThan(0.005); // still moving
      expect(speed).toBeLessThan(0.05); // lens widths/s
      expect(turn).toBeLessThan(0.1); // rad per frame: a gentle curve
    },
  );
});

describe('the salt bridge, close up', () => {
  const drift = (l: Lens, kind: string) => {
    const ps = of(l, kind);
    return ps.reduce((sum, p) => sum + p.travel, 0) / ps.length;
  };

  it('carries K⁺ towards the cathode and NO₃⁻ towards the anode', () => {
    const right = run(lens('bridge', { cathodeSide: 'right' }), 10);
    expect(drift(right, 'cation')).toBeGreaterThan(0.2);
    expect(drift(right, 'anion')).toBeLessThan(-0.2);

    const left = run(lens('bridge', { cathodeSide: 'left' }), 10);
    expect(drift(left, 'cation')).toBeLessThan(-0.2);
    expect(drift(left, 'anion')).toBeGreaterThan(0.2);
  });

  it('only jiggles the ions when no current flows', () => {
    const still = run(lens('bridge'), 10, { current: 0 });
    expect(Math.abs(drift(still, 'cation'))).toBeLessThan(0.1);
    expect(Math.abs(drift(still, 'anion'))).toBeLessThan(0.1);
  });

  it('labels its ions K⁺ and NO₃⁻', () => {
    const b = lens('bridge');
    expect(new Set(b.particles.map((p) => p.label))).toEqual(
      new Set(['K⁺', 'NO₃⁻']),
    );
  });
});

describe('the solution, close up', () => {
  it('holds more of the metal’s ions the more concentrated it is', () => {
    const count = (c: number) =>
      of(lens('cathode', { metal: 'Cu', concentration: c }), 'cation').length;
    expect(count(1)).toBeGreaterThan(count(0.1));
    expect(count(0.1)).toBeGreaterThan(0);
    expect(count(0.001)).toBe(0);
  });

  it('labels the metal’s ions and the nitrate', () => {
    const l = lens('cathode', { metal: 'Cu' });
    expect(of(l, 'cation')[0].label).toBe('Cu²⁺');
    expect(of(l, 'anion')[0].label).toBe('NO₃⁻');
  });

  it('keeps every particle inside the lens, and loose ions out of the metal', () => {
    for (const spot of ['anode', 'cathode', 'bridge'] as const) {
      const after = run(lens(spot), 60, { to: 1 });
      for (const p of after.particles) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(1);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(1);
      }
      if (spot === 'bridge') continue;
      const metal = surface(after);
      for (const p of after.particles)
        if ((p.kind === 'cation' || p.kind === 'anion') && !p.to)
          expect(p.x).toBeGreaterThan(metal);
    }
  });
});

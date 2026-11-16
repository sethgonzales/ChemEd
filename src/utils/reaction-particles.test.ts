import { REACTIONS } from '~/constants/reactions';
import { parseEquation, solve } from './reactions';
import {
  balancedEquation,
  between,
  examplesOf,
  layout,
  molecules,
  regroup,
} from './reaction-particles';

const balanced = (equation: string) => {
  const reaction = parseEquation(equation);
  return { reaction, coefficients: solve(reaction)! };
};
const count = (list: string[]) =>
  list.reduce<Record<string, number>>(
    (n, e) => ({ ...n, [e]: (n[e] ?? 0) + 1 }),
    {},
  );

describe('molecules', () => {
  it('makes one molecule per coefficient', () => {
    const list = molecules(['H2', 'O2'], [2, 1], []);
    expect(list.map((m) => m.formula)).toEqual(['H2', 'H2', 'O2']);
  });

  it('draws polyatomic ions the reaction keeps as one particle each', () => {
    const [phosphate] = molecules(['Ca3(PO4)2'], [1], ['PO4']);
    expect(count(phosphate.atoms)).toEqual({ Ca: 3, PO4: 2 });
    const [chlorate] = molecules(['KClO3'], [1], []);
    expect(count(chlorate.atoms)).toEqual({ K: 1, Cl: 1, O: 3 });
  });
});

describe('regroup: every particle goes somewhere, none made or lost', () => {
  it.each(REACTIONS.filter((r) => r.level < 4).map((r) => r.equation))(
    '%s',
    (equation) => {
      const { reaction, coefficients } = balanced(equation);
      const { before, after, atoms } = regroup(reaction, coefficients);
      expect(atoms.length).toBeGreaterThan(0);
      const all = (ms: { atoms: string[] }[]) =>
        count(ms.flatMap((m) => m.atoms));
      expect(all(before)).toEqual(all(after));
      expect(atoms).toHaveLength(before.flatMap((m) => m.atoms).length);
      // each particle fills one slot of the same kind, before and after
      const used = new Set<string>();
      for (const a of atoms) {
        expect(before[a.from.molecule].atoms[a.from.slot]).toBe(a.element);
        expect(after[a.to.molecule].atoms[a.to.slot]).toBe(a.element);
        const key = `${a.to.molecule}:${a.to.slot}`;
        expect(used.has(key)).toBe(false);
        used.add(key);
      }
    },
  );

  it('moves nitrate across as one particle when it swaps partners', () => {
    const { reaction, coefficients } = balanced('AgNO3 + NaCl -> AgCl + NaNO3');
    const { before, after, atoms } = regroup(reaction, coefficients);
    const nitrate = atoms.filter((a) => a.element === 'NO3');
    expect(nitrate).toHaveLength(1);
    expect(before[nitrate[0].from.molecule].formula).toBe('AgNO3');
    expect(after[nitrate[0].to.molecule].formula).toBe('NaNO3');
  });
});

describe('layout', () => {
  const size = { width: 400, height: 240 };
  const placed = (equation: string, side: 'before' | 'after') => {
    const { reaction, coefficients } = balanced(equation);
    const ms = regroup(reaction, coefficients)[side];
    return layout(ms, size);
  };
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  it.each([
    'C6H12O6 + O2 -> CO2 + H2O',
    'Ca(OH)2 + H3PO4 -> Ca3(PO4)2 + H2O',
    'Al + CuSO4 -> Al2(SO4)3 + Cu',
    'H2 + O2 -> H2O',
  ])('fits %s on the stage with molecules apart', (equation) => {
    for (const side of ['before', 'after'] as const) {
      const { scale, positions } = placed(equation, side);
      expect(positions.length).toBeGreaterThan(0);
      expect(scale).toBeGreaterThan(3); // an atom is still readable
      const all = positions.flatMap((ps, m) => ps.map((p) => ({ ...p, m })));
      for (const p of all) {
        expect(p.x - p.r).toBeGreaterThanOrEqual(0);
        expect(p.y - p.r).toBeGreaterThanOrEqual(0);
        expect(p.x + p.r).toBeLessThanOrEqual(size.width);
        expect(p.y + p.r).toBeLessThanOrEqual(size.height);
      }
      // molecules leave a gap between them
      for (const a of all)
        for (const b of all)
          if (a.m !== b.m)
            expect(dist(a, b) - a.r - b.r).toBeGreaterThan(0.4 * scale);
      // particles in a molecule touch a neighbour, so it reads as one
      for (const ps of positions)
        if (ps.length > 1)
          for (const p of ps)
            expect(
              ps.some(
                (q) => q !== p && Math.abs(dist(p, q) - p.r - q.r) < 0.01,
              ),
            ).toBe(true);
    }
  });
});

describe('layout of a small reaction', () => {
  it('spreads a few small molecules across the stage, not down it', () => {
    const { positions } = layout(molecules(['H2', 'O2'], [2, 1], []), {
      width: 400,
      height: 240,
    });
    const ys = positions.map((atoms) => atoms[0].y);
    expect(new Set(ys).size).toBe(1); // one row
  });
});

describe('layout of molecules of different sizes', () => {
  it('lets one big molecule take more room instead of shrinking everything', () => {
    const { scale } = layout(molecules(['C6H12O6', 'O2'], [1, 6], []), {
      width: 400,
      height: 240,
    });
    expect(scale).toBeGreaterThan(9); // px per atom radius
  });
});

describe('between', () => {
  it('starts at the reactants and ends at the products', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 100, y: 50 };
    expect(between(a, b, 0)).toEqual(a);
    expect(between(a, b, 1)).toEqual(b);
    const mid = between(a, b, 0.5);
    expect(mid.x).toBeCloseTo(50);
    expect(mid.y).toBeCloseTo(25);
  });
});

describe('balancedEquation', () => {
  it('writes the coefficients, leaving out 1s, with subscripts', () => {
    const { reaction, coefficients } = balanced('CH4 + O2 -> CO2 + H2O');
    expect(balancedEquation(reaction, coefficients)).toBe(
      'CH₄ + 2O₂ → CO₂ + 2H₂O',
    );
  });
});

describe('examplesOf', () => {
  it('finds practice equations of each of the five types', () => {
    expect(examplesOf('synthesis').length).toBeGreaterThan(2);
    expect(examplesOf('decomposition').map((r) => r.id)).toEqual(
      expect.arrayContaining(['hydrogen-peroxide']),
    );
    expect(examplesOf('combustion').length).toBe(6);
    expect(examplesOf('single replacement').length).toBe(2);
    expect(examplesOf('double replacement').length).toBe(5);
  });
});

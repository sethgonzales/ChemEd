import { REACTIONS } from '~/constants/reactions';
import { parseCompound, parseEquation, solve } from './reactions';
import { SOURCES } from '~/constants/sources';
import {
  BOND_ANGLE_SOURCE,
  keptGroups,
  shapeOf,
  type Particle,
} from './particle-shapes';

const kept = (equation: string) => {
  const reaction = parseEquation(equation);
  return keptGroups(reaction, solve(reaction)!);
};
const labels = (shape: Particle[]) =>
  shape.reduce<Record<string, number>>(
    (n, p) => ({ ...n, [p.label]: (n[p.label] ?? 0) + 1 }),
    {},
  );
const dist = (a: Particle, b: Particle) => Math.hypot(a.x - b.x, a.y - b.y);
const touching = (a: Particle, b: Particle) =>
  Math.abs(dist(a, b) - (a.r + b.r)) < 0.01;
// angle at b between a and c, in degrees
const angle = (a: Particle, b: Particle, c: Particle) => {
  const u = { x: a.x - b.x, y: a.y - b.y };
  const v = { x: c.x - b.x, y: c.y - b.y };
  const cos =
    (u.x * v.x + u.y * v.y) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y));
  return (Math.acos(cos) * 180) / Math.PI;
};
const find = (shape: Particle[], label: string) =>
  shape.filter((p) => p.label === label);

describe('keptGroups: polyatomic ions that come through the reaction whole', () => {
  it.each([
    ['AgNO3 + CaCl2 -> AgCl + Ca(NO3)2', ['NO3']],
    ['Al + CuSO4 -> Al2(SO4)3 + Cu', ['SO4']],
    ['Ca(OH)2 + H3PO4 -> Ca3(PO4)2 + H2O', ['PO4']], // OH becomes water
    ['H2SO4 + NaOH -> Na2SO4 + H2O', ['SO4']],
    ['KClO3 -> KCl + O2', []], // chlorate breaks apart
    ['CH4 + O2 -> CO2 + H2O', []],
  ])('%s keeps %j', (equation, groups) => {
    expect(kept(equation)).toEqual(groups);
  });
});

describe('shapeOf', () => {
  it('draws a kept polyatomic ion as one particle', () => {
    expect(labels(shapeOf('Ca3(PO4)2', ['PO4']))).toEqual({ Ca: 3, PO4: 2 });
    expect(labels(shapeOf('AgNO3', ['NO3']))).toEqual({ Ag: 1, NO3: 1 });
  });

  it('draws a polyatomic ion as atoms when the reaction breaks it apart', () => {
    expect(labels(shapeOf('KClO3', []))).toEqual({ K: 1, Cl: 1, O: 3 });
    expect(labels(shapeOf('Ca(OH)2', []))).toEqual({ Ca: 1, O: 2, H: 2 });
  });

  it('bends water at its measured 104.48°', () => {
    const water = shapeOf('H2O', []);
    const [o] = find(water, 'O');
    const [h1, h2] = find(water, 'H');
    expect(angle(h1, o, h2)).toBeCloseTo(104.4776, 3);
  });

  it('opens ammonia’s H–N–H angle to its measured 106.67°', () => {
    const ammonia = shapeOf('NH3', []);
    const [n] = find(ammonia, 'N');
    const [down, ...sides] = find(ammonia, 'H');
    for (const h of sides) expect(angle(down, n, h)).toBeCloseTo(106.67, 2);
  });

  it('cites the measured bond angles', () => {
    expect(SOURCES[BOND_ANGLE_SOURCE]).toBeDefined();
  });

  it('keeps carbon dioxide straight', () => {
    const co2 = shapeOf('CO2', []);
    const [o1, o2] = find(co2, 'O');
    expect(angle(o1, find(co2, 'C')[0], o2)).toBeCloseTo(180, 1);
  });

  it('puts four hydrogens round methane’s carbon and three under ammonia’s nitrogen', () => {
    const methane = shapeOf('CH4', []);
    for (const h of find(methane, 'H'))
      expect(touching(h, find(methane, 'C')[0])).toBe(true);
    const ammonia = shapeOf('NH3', []);
    for (const h of find(ammonia, 'H'))
      expect(touching(h, find(ammonia, 'N')[0])).toBe(true);
  });

  it('draws fuels as carbon chains, each carbon bonded to the next', () => {
    const butane = shapeOf('C4H10', []);
    const carbons = find(butane, 'C');
    for (let i = 0; i < 3; i++)
      expect(touching(carbons[i], carbons[i + 1])).toBe(true);
  });

  it('draws glucose as a ring of five carbons and an oxygen', () => {
    const glucose = shapeOf('C6H12O6', []);
    const ring = glucose.slice(0, 6);
    expect(labels(ring)).toEqual({ O: 1, C: 5 });
    for (let i = 0; i < 6; i++)
      expect(touching(ring[i], ring[(i + 1) % 6])).toBe(true);
  });

  it('alternates ions in a formula unit: Cl–Zn–Cl', () => {
    const zinc = shapeOf('ZnCl2', []);
    const [zn] = find(zinc, 'Zn');
    const [cl1, cl2] = find(zinc, 'Cl');
    expect(touching(zn, cl1) && touching(zn, cl2)).toBe(true);
    expect(angle(cl1, zn, cl2)).toBeCloseTo(180, 1);
  });

  it('only lets calcium touch phosphate in calcium phosphate', () => {
    const shape = shapeOf('Ca3(PO4)2', ['PO4']);
    for (const ca of find(shape, 'Ca'))
      for (const other of find(shape, 'Ca'))
        if (ca !== other) expect(touching(ca, other)).toBe(false);
  });

  it('draws hydrogen smaller and a polyatomic ion larger than other atoms', () => {
    const [h] = find(shapeOf('H2O', []), 'H');
    const [o] = find(shapeOf('H2O', []), 'O');
    const [po4] = find(shapeOf('Na3PO4', ['PO4']), 'PO4');
    expect(h.r).toBeLessThan(o.r);
    expect(po4.r).toBeGreaterThan(o.r);
  });

  describe('charges', () => {
    const charges = (formula: string, kept: string[]) =>
      shapeOf(formula, kept).map((p) => `${p.label}${p.charge ?? 0}`);

    it('shows the ions of an ionic compound with their charges', () => {
      expect(charges('Ca3(PO4)2', ['PO4']).sort()).toEqual(
        ['Ca2', 'Ca2', 'Ca2', 'PO4-3', 'PO4-3'].sort(),
      );
      expect(charges('ZnCl2', []).sort()).toEqual(['Cl-1', 'Cl-1', 'Zn2']);
      expect(charges('Fe2O3', []).sort()).toEqual(
        ['Fe3', 'Fe3', 'O-2', 'O-2', 'O-2'].sort(),
      );
      expect(charges('CuSO4', ['SO4']).sort()).toEqual(['Cu2', 'SO4-2']);
    });

    it('puts an opened ion’s charge on the atom that formally carries it', () => {
      expect(charges('NaOH', []).sort()).toEqual(['H0', 'Na1', 'O-1']);
      expect(charges('KClO3', []).sort()).toEqual(
        ['Cl0', 'K1', 'O-1', 'O0', 'O0'].sort(),
      );
    });

    it('sits a cation against the charged atom of an opened ion', () => {
      const shape = shapeOf('KClO3', []);
      const [k] = find(shape, 'K');
      const oxide = shape.find((p) => p.label === 'O' && p.charge === -1)!;
      expect(touching(k, oxide)).toBe(true);
      expect(touching(k, find(shape, 'Cl')[0])).toBe(false);
    });

    it('leaves molecules, acids and metal elements uncharged', () => {
      for (const [formula, kept] of [
        ['H2O', []],
        ['CH4', []],
        ['HCl', []],
        ['H3PO4', ['PO4']],
        ['Cu', []],
      ] as [string, string[]][])
        for (const p of shapeOf(formula, kept)) expect(p.charge ?? 0).toBe(0);
    });
  });

  describe.each(REACTIONS.filter((r) => r.level < 4).map((r) => r.equation))(
    'every formula in %s',
    (equation) => {
      const reaction = parseEquation(equation);
      const groups = keptGroups(reaction, solve(reaction)!);
      it.each([...reaction.reactants, ...reaction.products])(
        '%s has the right atoms, all bonded, none overlapping',
        (formula) => {
          const shape = shapeOf(formula, groups);
          // atoms in the drawing match the formula, groups opened up
          const atoms: Record<string, number> = {};
          for (const p of shape)
            for (const [e, n] of Object.entries(parseCompound(p.label)))
              atoms[e] = (atoms[e] ?? 0) + n;
          expect(atoms).toEqual(parseCompound(formula));
          // a compound is neutral overall
          expect(shape.reduce((n, p) => n + (p.charge ?? 0), 0)).toBe(0);
          for (const p of shape) {
            if (shape.length > 1)
              expect(shape.some((q) => q !== p && touching(p, q))).toBe(true);
            for (const q of shape)
              if (q !== p)
                expect(dist(p, q)).toBeGreaterThan((p.r + q.r) * 0.95);
          }
        },
      );
    },
  );
});

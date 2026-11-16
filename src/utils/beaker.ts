import { ionsOf } from './ions';
import type { Prediction } from './predict';
import { solve } from './reactions';

// the drawing's box, in its own units: gas above the surface, solids below the floor
export const BEAKER_BOX = {
  width: 100,
  height: 60,
  radius: 4,
  surface: 12,
  floor: 47,
};
const COLUMNS = 9; // places for dissolved particles, across
const ROWS = [18, 28, 38]; // and their heights
const JITTER = 1.4; // how far a dissolved particle strays from its place
const GAS_Y = 5;
const SOLID_ROWS = [55, 48]; // a solid's bottom row, then the one on top
const PER_ROW = 7;

export type Spot = {
  label: string;
  charge: number;
  x: number;
  y: number;
  hidden?: boolean;
};
export type BeakerParticle = { spectator: boolean; before: Spot; after: Spot };

type Entity = { symbol: string; charge: number; solid?: string };

// a small seeded generator, so a puzzle always looks the same
function seeded(text: string) {
  let s = [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function solutionSlots(random: () => number) {
  const { width, radius } = BEAKER_BOX;
  const step = (width - 2 * radius - 2 * JITTER) / (COLUMNS - 1);
  const slots = ROWS.flatMap((y) =>
    Array.from({ length: COLUMNS }, (_, i) => ({
      x: radius + JITTER + i * step + (random() * 2 - 1) * JITTER,
      y: y + (random() - 0.5) * JITTER,
    })),
  );
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return slots;
}

/** Packed rows on the floor, one heap per solid, side by side */
function heaps(groups: string[], sizes: number[]) {
  const d = 2 * BEAKER_BOX.radius;
  const centres = groups.map(
    (_, i) => (BEAKER_BOX.width * (i + 1)) / (groups.length + 1),
  );
  return groups.map((_, g) =>
    Array.from({ length: sizes[g] }, (_, i) => {
      const row = Math.floor(i / PER_ROW);
      const inRow = Math.min(PER_ROW, sizes[g] - row * PER_ROW);
      const k = i % PER_ROW;
      return {
        x: centres[g] + (k - (inRow - 1) / 2) * d,
        y: SOLID_ROWS[row] ?? SOLID_ROWS[SOLID_ROWS.length - 1],
      };
    }),
  );
}

// cations and anions alternating, as in a crystal
function alternate<T extends { charge: number }>(items: T[]) {
  const pos = items.filter((i) => i.charge > 0);
  const neg = items.filter((i) => i.charge <= 0);
  const [more, fewer] = pos.length >= neg.length ? [pos, neg] : [neg, pos];
  return more.flatMap((m, i) => (fewer[i] ? [m, fewer[i]] : [m]));
}

/** Every particle in the beaker before and after, from the balanced equation */
export function beaker(prediction: Prediction): BeakerParticle[] {
  const reactants = prediction.reactants.map((r) => r.formula);
  const products = prediction.products;
  const coefficients = solve({
    reactants,
    products: products?.map((p) => p.formula) ?? [],
  }) ?? [1, 1];
  const random = seeded(reactants.join('+'));
  const slots = solutionSlots(random);

  // before: dissolved salts as ions, a metal as a lump of atoms
  const entities: Entity[] = [];
  prediction.reactants.forEach((r, i) => {
    const k = coefficients[i];
    const ions = ionsOf(r.formula);
    if (ions && r.state === 'aq') {
      for (let n = 0; n < k * ions.cations; n++)
        entities.push({ ...ions.cation });
      for (let n = 0; n < k * ions.anions; n++)
        entities.push({ ...ions.anion });
    } else
      for (let n = 0; n < k; n++)
        entities.push({ symbol: r.formula, charge: 0, solid: r.formula });
  });
  const place = (list: Entity[]) => {
    const groups = [
      ...new Set(list.filter((e) => e.solid).map((e) => e.solid!)),
    ];
    const members = groups.map((g) =>
      alternate(list.filter((e) => e.solid === g)),
    );
    const spots = heaps(
      groups,
      members.map((m) => m.length),
    );
    const at = new Map<Entity, { x: number; y: number }>();
    members.forEach((m, g) => m.forEach((e, i) => at.set(e, spots[g][i])));
    return at;
  };
  const lumps = place(entities);
  let next = 0;
  const before: Spot[] = entities.map((e) => ({
    label: e.symbol,
    charge: e.charge,
    ...(lumps.get(e) ?? slots[next++]),
  }));
  if (!products)
    return before.map((b) => ({ spectator: false, before: b, after: b }));

  // after: where each particle's symbol ends up
  const destination = (symbol: string) =>
    products.find((p) => {
      if (p.formula === 'H2O') return symbol === 'H' || symbol === 'OH';
      const ions = ionsOf(p.formula);
      return ions
        ? ions.cation.symbol === symbol || ions.anion.symbol === symbol
        : p.formula.replace(/\d+$/, '') === symbol;
    })!;
  const afterEntities: Entity[] = entities.map((e) => {
    const p = destination(e.symbol);
    const ions = ionsOf(p.formula);
    if (p.formula === 'H2O' || p.formula === 'H2')
      return { ...e, solid: undefined };
    if (!ions) return { symbol: e.symbol, charge: 0, solid: p.formula };
    const charge =
      ions.cation.symbol === e.symbol ? ions.cation.charge : ions.anion.charge;
    return {
      symbol: e.symbol,
      charge,
      solid: p.state === 's' ? p.formula : undefined,
    };
  });
  const heapsAfter = place(afterEntities);

  const after: Spot[] = afterEntities.map((e, i) => {
    const spot = heapsAfter.get(e);
    if (spot) return { label: e.symbol, charge: e.charge, ...spot };
    const was = before[i];
    // stayed dissolved: the same place; just dissolved: a free place
    const where = entities[i].solid ? slots[next++] : { x: was.x, y: was.y };
    return { label: e.symbol, charge: e.charge, ...where };
  });

  // H⁺ pairs become H₂ rising out; H⁺ and OH⁻ become water where the OH⁻ was
  const product = (i: number) => destination(entities[i].symbol).formula;
  const hydrogens = entities.flatMap((e, i) => (e.symbol === 'H' ? [i] : []));
  if (products.some((p) => p.formula === 'H2')) {
    const pairs = hydrogens.length / 2;
    for (let n = 0; n < pairs; n++) {
      const [a, b] = [hydrogens[2 * n], hydrogens[2 * n + 1]];
      const x = (BEAKER_BOX.width * (n + 1)) / (pairs + 1);
      after[a] = { label: 'H2', charge: 0, x, y: GAS_Y };
      after[b] = { ...after[a], hidden: true };
    }
  }
  if (products.some((p) => p.formula === 'H2O')) {
    const hydroxides = entities.flatMap((e, i) =>
      e.symbol === 'OH' ? [i] : [],
    );
    hydroxides.forEach((o, n) => {
      after[o] = { ...after[o], label: 'H2O', charge: 0 };
      after[hydrogens[n]] = { ...after[o], hidden: true };
    });
  }

  return before.map((b, i) => ({
    before: b,
    after: after[i],
    spectator:
      product(i) !== 'H2O' &&
      !entities[i].solid &&
      !afterEntities[i].solid &&
      after[i].label === b.label &&
      after[i].x === b.x,
  }));
}

import { REACTIONS, type BalancingReaction } from '~/constants/reactions';
import { formatFormula } from './lewis';
import { keptGroups, shapeOf, type Particle } from './particle-shapes';
import { parseEquation, type Reaction } from './reactions';
import { classify, type ReactionType } from './reaction-types';

// atoms: each particle's label, an element or a polyatomic ion kept whole
export type Molecule = { formula: string; atoms: string[]; shape: Particle[] };
export type Point = { x: number; y: number };
type Slot = { molecule: number; slot: number };
export type AtomMove = { element: string; from: Slot; to: Slot };

const MAX_SCALE = 16; // px per atom radius; small reactions stop growing here
const GAP = 0.6; // atom radii of clear space between neighbouring molecules

/** One molecule per coefficient, each drawn as its particles */
export function molecules(
  formulas: string[],
  coefficients: number[],
  kept: string[],
): Molecule[] {
  return formulas.flatMap((formula, i) => {
    const shape = shapeOf(formula, kept);
    const atoms = shape.map((p) => p.label);
    return Array.from({ length: coefficients[i] }, () => ({
      formula,
      atoms,
      shape,
    }));
  });
}

/**
 * Which reactant particle becomes which product particle. Each takes a free
 * one of its kind, preferring a reactant molecule it has already
 * drawn from, so groups like NO₃ or PO₄ travel together.
 */
export function regroup(reaction: Reaction, coefficients: number[]) {
  const n = reaction.reactants.length;
  const kept = keptGroups(reaction, coefficients);
  const before = molecules(reaction.reactants, coefficients.slice(0, n), kept);
  const after = molecules(reaction.products, coefficients.slice(n), kept);

  const free = before.flatMap((m, molecule) =>
    m.atoms.map((element, slot) => ({ element, molecule, slot })),
  );
  const share = (m: Molecule, element: string) =>
    m.atoms.filter((e) => e === element).length / m.atoms.length;

  const atoms: AtomMove[] = [];
  after.forEach((product, to) => {
    const drawn = new Map<number, number>(); // reactant molecule → atoms taken
    product.atoms.forEach((element, slot) => {
      const options = free.filter((a) => a.element === element);
      const score = (a: (typeof free)[number]) =>
        (drawn.get(a.molecule) ?? 0) * 10 + share(before[a.molecule], element);
      const pick = options.reduce((best, a) =>
        score(a) > score(best) ? a : best,
      );
      free.splice(free.indexOf(pick), 1);
      drawn.set(pick.molecule, (drawn.get(pick.molecule) ?? 0) + 1);
      atoms.push({
        element,
        from: { molecule: pick.molecule, slot: pick.slot },
        to: { molecule: to, slot },
      });
    });
  });
  return { before, after, atoms };
}

/** Rows of molecules at one scale, or null if they don't fit */
function pack(
  boxes: { w: number; h: number }[],
  scale: number,
  width: number,
  height: number,
) {
  const rows: { items: number[]; w: number; h: number }[] = [];
  boxes.forEach(({ w, h }, i) => {
    const [cw, ch] = [(w + GAP) * scale, (h + GAP) * scale];
    const row = rows.at(-1);
    if (row && row.w + cw <= width) {
      row.items.push(i);
      row.w += cw;
      row.h = Math.max(row.h, ch);
    } else rows.push({ items: [i], w: cw, h: ch });
  });
  const fits =
    rows.every((r) => r.w <= width) &&
    rows.reduce((n, r) => n + r.h, 0) <= height;
  return fits ? rows : null;
}

/**
 * Molecules in rows, each taking room for its own size, all drawn to the
 * largest scale (px per atom radius) that fits the stage.
 */
export function layout(
  list: Molecule[],
  { width, height }: { width: number; height: number },
) {
  const extent = (m: Molecule, axis: 'x' | 'y') =>
    Math.max(...m.shape.map((p) => Math.abs(p[axis]) + p.r)) * 2;
  const boxes = list.map((m) => ({ w: extent(m, 'x'), h: extent(m, 'y') }));

  // the largest scale that packs, found by halving the search range
  let [lo, hi] = [0, MAX_SCALE];
  if (pack(boxes, hi, width, height)) lo = hi;
  for (let i = 0; i < 30 && lo < hi; i++) {
    const mid = (lo + hi) / 2;
    if (pack(boxes, mid, width, height)) lo = mid;
    else hi = mid;
  }
  const scale = lo;
  const rows = pack(boxes, scale, width, height)!;

  // centre each row, and the rows on the stage, spreading spare height evenly
  const spare =
    (height - rows.reduce((n, r) => n + r.h, 0)) / (rows.length + 1);
  const positions: { x: number; y: number; r: number }[][] = [];
  let y = spare;
  for (const row of rows) {
    const gap = (width - row.w) / (row.items.length + 1);
    let x = gap;
    for (const i of row.items) {
      const cw = (boxes[i].w + GAP) * scale;
      const [cx, cy] = [x + cw / 2, y + row.h / 2];
      positions[i] = list[i].shape.map((p) => ({
        x: cx + p.x * scale,
        y: cy + p.y * scale,
        r: p.r * scale,
      }));
      x += cw + gap;
    }
    y += row.h + spare;
  }
  return { scale, positions };
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Where an atom is a fraction t of the way through the reaction, eased */
export function between(a: Point, b: Point, t: number): Point {
  const s = smooth(Math.min(1, Math.max(0, t)));
  return { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s };
}

/** 'CH₄ + 2O₂ → CO₂ + 2H₂O' */
export function balancedEquation(reaction: Reaction, coefficients: number[]) {
  const n = reaction.reactants.length;
  const side = (formulas: string[], offset: number) =>
    formulas
      .map((f, i) => {
        const c = coefficients[offset + i];
        return `${c === 1 ? '' : c}${formatFormula(f)}`;
      })
      .join(' + ');
  return `${side(reaction.reactants, 0)} → ${side(reaction.products, n)}`;
}

/** Reaction Balancing's practice equations of one type */
export const examplesOf = (type: ReactionType): BalancingReaction[] =>
  REACTIONS.filter((r) => classify(parseEquation(r.equation)) === type);

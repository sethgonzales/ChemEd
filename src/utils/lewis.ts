import { ELECTRONEGATIVITY } from '~/constants/electronegativity';
import { findElement } from '~/utils';

export type LewisAtom = {
  id: number;
  symbol: string;
  x: number;
  y: number;
  lonePairs: number;
  radicals: number; // unpaired electrons
};

export type BondOrder = 1 | 2 | 3;

export type LewisBond = { a: number; b: number; order: BondOrder };

export type LewisStructure = { atoms: LewisAtom[]; bonds: LewisBond[] };

export type Target = { formula: string; charge: number };

export type Feedback = {
  kind:
    | 'atoms'
    | 'disconnected'
    | 'electron-total'
    | 'octet'
    | 'skeleton'
    | 'formal-charge'
    | 'unneeded-expansion'
    | 'electronegativity'
    | 'correct'
    | 'resonance'
    | 'note';
  message: string;
  atom?: number;
};

/** Which atoms bond to which, before any electrons are placed */
export type Skeleton = {
  atoms: { symbol: string; x?: number; y?: number }[];
  bonds: [number, number][];
};

/** Electrons placed on a skeleton: one entry per skeleton atom and bond */
export type Answer = {
  lonePairs: number[];
  orders: BondOrder[];
  radicals?: number[];
};

export type Molecule = {
  id: string;
  name: string;
  formula: string;
  charge: number;
  level: 1 | 2 | 3 | 4 | 5;
  skeleton: Skeleton;
  answers: Answer[]; // the best structures, including every resonance form
  alsoAccepted?: Answer[]; // octet-rule structures AP accepts but aren't best
  note?: string; // shown when a student draws one of alsoAccepted
};

export type Verdict = 'best' | 'accepted' | 'valid' | 'invalid';

// Elements allowed fewer than eight electrons once all their own are bonded
const INCOMPLETE_OCTET_OK = new Set(['Be', 'B', 'Al']);

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉';
const subscript = (formula: string) =>
  formula.replace(/\d/g, (d) => SUBSCRIPTS[Number(d)]);

function element(symbol: string) {
  const el = findElement(symbol);
  if (!el) throw new Error(`Unknown element: ${symbol}`);
  return el;
}

/** Valence electrons of a main-group element; null for d- and f-block. */
export function valenceElectrons(symbol: string): number | null {
  const { group, block } = element(symbol);
  if (symbol === 'He') return 2;
  if (block === 'd' || block === 'f' || group === null) return null;
  return group <= 2 ? group : group - 10;
}

export function parseFormula(formula: string): Record<string, number> {
  if (!/^([A-Z][a-z]?\d*)+$/.test(formula)) {
    throw new Error(`Malformed formula: ${formula}`);
  }
  const counts: Record<string, number> = {};
  for (const [, symbol, n] of formula.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
    element(symbol);
    counts[symbol] = (counts[symbol] ?? 0) + (n ? Number(n) : 1);
  }
  return counts;
}

export function totalValenceElectrons(formula: string, charge: number) {
  const counts = parseFormula(formula);
  let total = 0;
  for (const [symbol, n] of Object.entries(counts)) {
    const v = valenceElectrons(symbol);
    if (v === null) throw new Error(`${symbol} is not a main-group element`);
    total += v * n;
  }
  return total - charge;
}

function atomById(s: LewisStructure, id: number) {
  const atom = s.atoms.find((a) => a.id === id);
  if (!atom) throw new Error(`No atom with id ${id}`);
  return atom;
}

function bondOrderSum(s: LewisStructure, id: number) {
  return s.bonds
    .filter((b) => b.a === id || b.b === id)
    .reduce((sum, b) => sum + b.order, 0);
}

export function electronsUsed(s: LewisStructure) {
  const bonded = s.bonds.reduce((sum, b) => sum + 2 * b.order, 0);
  const unshared = s.atoms.reduce(
    (sum, a) => sum + 2 * a.lonePairs + a.radicals,
    0,
  );
  return bonded + unshared;
}

/** Electrons around an atom: its unshared electrons plus every bonding pair. */
export function electronCount(s: LewisStructure, id: number) {
  const atom = atomById(s, id);
  return 2 * bondOrderSum(s, id) + 2 * atom.lonePairs + atom.radicals;
}

/** Valence electrons − unshared electrons − bonds */
export function formalCharge(s: LewisStructure, id: number) {
  const atom = atomById(s, id);
  const v = valenceElectrons(atom.symbol);
  if (v === null) throw new Error(`${atom.symbol} is not a main-group element`);
  return v - (2 * atom.lonePairs + atom.radicals) - bondOrderSum(s, id);
}

export function netCharge(s: LewisStructure) {
  return s.atoms.reduce((sum, a) => sum + formalCharge(s, a.id), 0);
}

export function octetStatus(s: LewisStructure, id: number) {
  const atom = atomById(s, id);
  return octetFor(atom.symbol, electronCount(s, id), atom.radicals);
}

function octetFor(symbol: string, electrons: number, radicals: number) {
  const target = symbol === 'H' || symbol === 'He' ? 2 : 8;

  if (electrons === target) {
    return { electrons, target, status: 'complete' as const, ok: true };
  }

  if (electrons < target) {
    const v = valenceElectrons(symbol) ?? 0;
    const ok =
      (INCOMPLETE_OCTET_OK.has(symbol) && electrons >= 2 * v) ||
      (radicals > 0 && electrons === target - 1);
    return { electrons, target, status: 'incomplete' as const, ok };
  }

  // only atoms from period 3 down have room (d orbitals) for more than eight
  const ok = target === 8 && element(symbol).period >= 3;
  return { electrons, target, status: 'expanded' as const, ok };
}

function connected(s: LewisStructure) {
  if (s.atoms.length <= 1) return true;
  const seen = new Set([s.atoms[0].id]);
  const queue = [s.atoms[0].id];
  while (queue.length) {
    const id = queue.pop()!;
    for (const b of s.bonds) {
      const next = b.a === id ? b.b : b.b === id ? b.a : null;
      if (next !== null && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen.size === s.atoms.length;
}

const describeCounts = (counts: Record<string, number>) =>
  Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([symbol, n]) => `${n} ${symbol}`)
    .join(', ');

function octetMessage(
  symbol: string,
  { electrons, target, status }: ReturnType<typeof octetStatus>,
) {
  if (status === 'expanded' && target === 2) {
    return `${symbol} has ${electrons} electrons. It can only hold 2.`;
  }
  if (status === 'expanded') {
    return `${symbol} has ${electrons} electrons. Period 2 atoms can't hold more than 8.`;
  }
  if (target === 2) {
    return `${symbol} has ${electrons} electrons. It needs 2.`;
  }
  return `${symbol} has ${electrons} electrons around it. It needs ${target}.`;
}

/** Everything wrong with a student's structure, as short messages. */
export function checkStructure(s: LewisStructure, target: Target): Feedback[] {
  const feedback: Feedback[] = [];
  const shown = subscript(target.formula);

  const expected = parseFormula(target.formula);
  const actual: Record<string, number> = {};
  for (const a of s.atoms) actual[a.symbol] = (actual[a.symbol] ?? 0) + 1;
  if (describeCounts(expected) !== describeCounts(actual)) {
    feedback.push({
      kind: 'atoms',
      message: `${shown} needs ${describeCounts(expected)}. You have ${describeCounts(actual) || 'no atoms'}.`,
    });
  }

  if (!connected(s)) {
    feedback.push({
      kind: 'disconnected',
      message: 'Every atom must be bonded into one structure.',
    });
  }

  const needed = totalValenceElectrons(target.formula, target.charge);
  const used = electronsUsed(s);
  if (used < needed) {
    feedback.push({
      kind: 'electron-total',
      message: `You've placed ${used} of ${needed} valence electrons.`,
    });
  } else if (used > needed) {
    feedback.push({
      kind: 'electron-total',
      message: `You've placed ${used} electrons, but ${shown} has only ${needed}.`,
    });
  }

  for (const atom of s.atoms) {
    const status = octetStatus(s, atom.id);
    if (!status.ok) {
      feedback.push({
        kind: 'octet',
        atom: atom.id,
        message: octetMessage(atom.symbol, status),
      });
    }
  }

  return feedback;
}

/** Adjacency: atom id → neighbour id → bond order */
function adjacency(s: LewisStructure) {
  const adj = new Map<number, Map<number, number>>();
  for (const a of s.atoms) adj.set(a.id, new Map());
  for (const b of s.bonds) {
    adj.get(b.a)!.set(b.b, b.order);
    adj.get(b.b)!.set(b.a, b.order);
  }
  return adj;
}

/**
 * Whether two structures are the same graph, matching atoms by atomKey and
 * bonds by bondKey. Backtracking is fine at Lewis-structure sizes.
 */
function isomorphic(
  a: LewisStructure,
  b: LewisStructure,
  atomKey: (atom: LewisAtom) => string,
  bondKey: (order: number) => number,
) {
  if (a.atoms.length !== b.atoms.length || a.bonds.length !== b.bonds.length) {
    return false;
  }
  const adjA = adjacency(a);
  const adjB = adjacency(b);
  const keyA = new Map(a.atoms.map((x) => [x.id, atomKey(x)]));
  const keyB = new Map(b.atoms.map((x) => [x.id, atomKey(x)]));

  // most-connected atoms first prunes fastest
  const order = [...a.atoms].sort(
    (x, y) => adjA.get(y.id)!.size - adjA.get(x.id)!.size,
  );
  const map = new Map<number, number>();
  const used = new Set<number>();

  const extend = (i: number): boolean => {
    if (i === order.length) return true;
    const u = order[i].id;
    for (const v of keyB.keys()) {
      if (used.has(v) || keyB.get(v) !== keyA.get(u)) continue;
      if (adjB.get(v)!.size !== adjA.get(u)!.size) continue;
      const consistent = [...adjA.get(u)!].every(([n, o]) => {
        const mapped = map.get(n);
        if (mapped === undefined) return true;
        const other = adjB.get(v)!.get(mapped);
        return other !== undefined && bondKey(other) === bondKey(o);
      });
      if (!consistent) continue;
      map.set(u, v);
      used.add(v);
      if (extend(i + 1)) return true;
      map.delete(u);
      used.delete(v);
    }
    return false;
  };
  return extend(0);
}

/** Same atoms, bonds and electrons, wherever atoms are drawn. */
export const sameStructure = (a: LewisStructure, b: LewisStructure) =>
  isomorphic(
    a,
    b,
    (x) => `${x.symbol}:${x.lonePairs}:${x.radicals}`,
    (o) => o,
  );

/** Same atoms bonded to the same neighbours, ignoring electrons. */
export const sameSkeleton = (a: LewisStructure, b: LewisStructure) =>
  isomorphic(
    a,
    b,
    (x) => x.symbol,
    () => 1,
  );

export function fromAnswer(skeleton: Skeleton, answer: Answer): LewisStructure {
  return {
    atoms: skeleton.atoms.map((atom, id) => ({
      id,
      symbol: atom.symbol,
      x: atom.x ?? 0,
      y: atom.y ?? 0,
      lonePairs: answer.lonePairs[id],
      radicals: answer.radicals?.[id] ?? 0,
    })),
    bonds: skeleton.bonds.map(([a, b], i) => ({
      a,
      b,
      order: answer.orders[i],
    })),
  };
}

const MAX_LONE_PAIRS = 4;

/** Every way to place the electrons on a skeleton that obeys the octet rules. */
export function validStructures(
  skeleton: Skeleton,
  target: Target,
): LewisStructure[] {
  const total = totalValenceElectrons(target.formula, target.charge);
  const atoms = skeleton.atoms;
  const found: LewisStructure[] = [];

  const orderSets: BondOrder[][] = [[]];
  for (let i = 0; i < skeleton.bonds.length; i++) {
    const next: BondOrder[][] = [];
    for (const set of orderSets) {
      for (const o of [1, 2, 3] as BondOrder[]) next.push([...set, o]);
    }
    orderSets.splice(0, orderSets.length, ...next);
  }

  for (const orders of orderSets) {
    const bonded = atoms.map(() => 0);
    skeleton.bonds.forEach(([a, b], i) => {
      bonded[a] += orders[i];
      bonded[b] += orders[i];
    });
    const remaining = total - 2 * orders.reduce((s, o) => s + o, 0);
    if (remaining < 0) continue;

    // an odd total leaves one unpaired electron on some atom
    const radicalSpots = remaining % 2 ? atoms.map((_, i) => i) : [-1];
    for (const spot of radicalSpots) {
      const radicals = atoms.map((_, i) => (i === spot ? 1 : 0));
      const lonePairs: number[] = [];

      const place = (i: number, pairsLeft: number) => {
        if (i === atoms.length) {
          if (pairsLeft === 0) {
            found.push(
              fromAnswer(skeleton, {
                lonePairs: [...lonePairs],
                orders,
                radicals,
              }),
            );
          }
          return;
        }
        for (let lp = 0; lp <= Math.min(MAX_LONE_PAIRS, pairsLeft); lp++) {
          const electrons = 2 * bonded[i] + 2 * lp + radicals[i];
          if (!octetFor(atoms[i].symbol, electrons, radicals[i]).ok) continue;
          lonePairs[i] = lp;
          place(i + 1, pairsLeft - lp);
        }
      };
      place(0, (remaining - (spot >= 0 ? 1 : 0)) / 2);
    }
  }
  return found;
}

const totalFormalCharge = (s: LewisStructure) =>
  s.atoms.reduce((sum, a) => sum + Math.abs(formalCharge(s, a.id)), 0);

// Electrons beyond each atom's octet (or duet)
const excessElectrons = (s: LewisStructure) =>
  s.atoms.reduce((sum, a) => {
    const { electrons, target } = octetStatus(s, a.id);
    return sum + Math.max(0, electrons - target);
  }, 0);

// Lower when negative charge sits on more electronegative atoms
function electronegativityScore(s: LewisStructure) {
  return s.atoms.reduce((sum, a) => {
    const en = ELECTRONEGATIVITY[a.symbol];
    if (en === undefined)
      throw new Error(`No electronegativity for ${a.symbol}`);
    return sum + formalCharge(s, a.id) * en;
  }, 0);
}

// Keeps the items with the lowest score
function lowest<T>(items: T[], score: (item: T) => number) {
  const scores = items.map(score);
  const min = Math.min(...scores);
  return items.filter((_, i) => scores[i] - min < 1e-9);
}

/**
 * The preferred structures: smallest total formal charge, then no octet
 * expanded without need, then negative charge on the most electronegative
 * atoms. Resonance forms tie, so all of them stay.
 */
export function bestStructures(structures: LewisStructure[]) {
  if (structures.length === 0) return [];
  return lowest(
    lowest(lowest(structures, totalFormalCharge), excessElectrons),
    electronegativityScore,
  );
}

/** How a student's structure compares with a molecule's accepted answers. */
export function assessStructure(
  s: LewisStructure,
  molecule: Molecule,
): { verdict: Verdict; feedback: Feedback[] } {
  const problems = checkStructure(s, molecule);
  const answers = molecule.answers.map((a) => fromAnswer(molecule.skeleton, a));

  const skeletonUsable = !problems.some(
    (p) => p.kind === 'atoms' || p.kind === 'disconnected',
  );
  if (skeletonUsable && !answers.some((a) => sameSkeleton(s, a))) {
    return {
      verdict: problems.length ? 'invalid' : 'valid',
      feedback: [
        {
          kind: 'skeleton',
          message:
            'Check your skeleton. The central atom is usually the least electronegative, and H is never central.',
        },
        ...problems,
      ],
    };
  }

  if (problems.length) return { verdict: 'invalid', feedback: problems };

  if (answers.some((a) => sameStructure(s, a))) {
    const n = answers.length;
    return {
      verdict: 'best',
      feedback: [
        n > 1
          ? {
              kind: 'resonance',
              message: `Correct! This is one of ${n} resonance structures.`,
            }
          : { kind: 'correct', message: 'Correct!' },
      ],
    };
  }

  const alsoAccepted = (molecule.alsoAccepted ?? []).map((a) =>
    fromAnswer(molecule.skeleton, a),
  );
  if (alsoAccepted.some((a) => sameStructure(s, a))) {
    return {
      verdict: 'accepted',
      feedback: [
        {
          kind: 'note',
          message:
            molecule.note ??
            'Correct by the octet rule, but the formal charges could be smaller.',
        },
      ],
    };
  }

  const best = answers[0];
  let feedback: Feedback;
  if (totalFormalCharge(s) > totalFormalCharge(best)) {
    feedback = {
      kind: 'formal-charge',
      message:
        'This works, but the formal charges could be smaller. Try moving electrons between lone pairs and bonds.',
    };
  } else if (excessElectrons(s) > excessElectrons(best)) {
    feedback = {
      kind: 'unneeded-expansion',
      message:
        'This works, but an atom has more electrons than it needs. Expand an octet only when it lowers formal charges.',
    };
  } else {
    feedback = {
      kind: 'electronegativity',
      message:
        'This works, but negative formal charge belongs on the more electronegative atom.',
    };
  }
  return { verdict: 'valid', feedback: [feedback] };
}

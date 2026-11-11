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
  kind: 'atoms' | 'disconnected' | 'electron-total' | 'octet';
  message: string;
  atom?: number;
};

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
  const electrons = electronCount(s, id);
  const target = atom.symbol === 'H' || atom.symbol === 'He' ? 2 : 8;

  if (electrons === target) {
    return { electrons, target, status: 'complete' as const, ok: true };
  }

  if (electrons < target) {
    const v = valenceElectrons(atom.symbol) ?? 0;
    const ok =
      (INCOMPLETE_OCTET_OK.has(atom.symbol) && electrons >= 2 * v) ||
      (atom.radicals > 0 && electrons === target - 1);
    return { electrons, target, status: 'incomplete' as const, ok };
  }

  // only atoms from period 3 down have room (d orbitals) for more than eight
  const ok = target === 8 && element(atom.symbol).period >= 3;
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

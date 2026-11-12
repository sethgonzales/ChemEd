import { ELEMENTS } from '~/constants/elements';

// Electron configurations: which subshells hold an atom's electrons, the order
// they fill in, and the box (orbital) diagram students draw.

type Letter = 's' | 'p' | 'd' | 'f';
export type Spin = 'up' | 'down';
export type Occupancy = { subshell: string; electrons: number }[];

const L: Record<Letter, number> = { s: 0, p: 1, d: 2, f: 3 };
const LETTERS: Letter[] = ['s', 'p', 'd', 'f'];
const MAX_N = 7; // the 7th period ends at 7p
const NOBLE_GASES = ['He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn'];
const SUPERSCRIPTS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

const letterOf = (subshell: string) => subshell[1] as Letter;
const nOf = (subshell: string) => Number(subshell[0]);
/** Orbitals in a subshell: 1 for s, 3 for p, 5 for d, 7 for f */
export const orbitalCount = (subshell: string) => 2 * L[letterOf(subshell)] + 1;
/** Two electrons per orbital (Pauli) */
export const capacity = (subshell: string) => 2 * orbitalCount(subshell);

/**
 * The Aufbau order: lowest n + l first, and lower n on a tie (the Madelung
 * rule). Only subshells real atoms reach, up to 7p.
 */
export const SUBSHELL_ORDER: string[] = Array.from(
  { length: MAX_N },
  (_, i) => i + 1,
)
  .flatMap((n) =>
    LETTERS.filter((l) => L[l] < n && n + L[l] <= MAX_N + 1).map(
      (l) => `${n}${l}`,
    ),
  )
  .sort((a, b) => {
    const energy = (s: string) => nOf(s) + L[letterOf(s)];
    return energy(a) - energy(b) || nOf(a) - nOf(b);
  });

const rank = (subshell: string) => SUBSHELL_ORDER.indexOf(subshell);
const inOrder = (occ: Occupancy) =>
  [...occ].sort((a, b) => rank(a.subshell) - rank(b.subshell));

export const electronCount = (occ: Occupancy) =>
  occ.reduce((n, o) => n + o.electrons, 0);

const configOf = (symbol: string) =>
  ELEMENTS.find((e) => e.symbol === symbol)?.electronConfiguration ?? null;

/**
 * Reads notation like "[Ar] 3d5 4s1", "1s22s22p6" or "1s² 2s²". Counts typed
 * without spaces are read as two digits only when that fits the subshell, so
 * "1s22s2" is 1s² 2s² but "3d104s2" is 3d¹⁰ 4s². Null if it isn't valid.
 */
export function parseConfiguration(text: string): Occupancy | null {
  let rest = text
    .replace(/[⁰-⁹¹²³]/g, (c) => String(SUPERSCRIPTS.indexOf(c)))
    .replace(/\s+/g, '');
  const occ: Occupancy = [];

  const core = rest.match(/^\[([A-Za-z]+)\]/);
  if (core) {
    const symbol = core[1][0].toUpperCase() + core[1].slice(1).toLowerCase();
    const config = NOBLE_GASES.includes(symbol) ? configOf(symbol) : null;
    const inner = config && parseConfiguration(config);
    if (!inner) return null;
    occ.push(...inner);
    rest = rest.slice(core[0].length);
  }

  while (rest) {
    const m = rest.match(/^(\d)([spdf])(\d)(\d)?/);
    if (!m) return null;
    const subshell = m[1] + m[2];
    if (rank(subshell) < 0) return null; // no such subshell, like 2d
    const two = m[4] !== undefined && Number(m[3] + m[4]) <= capacity(subshell);
    const electrons = Number(two ? m[3] + m[4] : m[3]);
    if (electrons > capacity(subshell)) return null;
    if (occ.some((o) => o.subshell === subshell)) return null;
    occ.push({ subshell, electrons });
    rest = rest.slice(m[1].length + m[2].length + (two ? 2 : 1));
  }
  return occ.length ? inOrder(occ) : null;
}

/** An element's ground state, from our element data */
export const groundState = (z: number) =>
  parseConfiguration(ELEMENTS[z - 1].electronConfiguration ?? '')!;

/** What filling subshells strictly in Aufbau order predicts */
export function aufbauConfiguration(electrons: number): Occupancy {
  const occ: Occupancy = [];
  for (const subshell of SUBSHELL_ORDER) {
    if (electrons <= 0) break;
    const fill = Math.min(electrons, capacity(subshell));
    occ.push({ subshell, electrons: fill });
    electrons -= fill;
  }
  return occ;
}

const sameOccupancy = (a: Occupancy, b: Occupancy) => {
  const key = (occ: Occupancy) =>
    inOrder(occ.filter((o) => o.electrons > 0))
      .map((o) => o.subshell + o.electrons)
      .join(' ');
  return key(a) === key(b);
};

/** True when the real ground state differs from the Aufbau prediction (Cr, Cu, …) */
export const isException = (z: number) =>
  !sameOccupancy(groundState(z), aufbauConfiguration(z));

const superscript = (n: number) =>
  String(n).replace(/\d/g, (d) => SUPERSCRIPTS[Number(d)]);

/**
 * Notation in filling order, e.g. "1s² 2s² 2p⁶ 3s¹". With `shorthand`, the
 * largest noble-gas core with fewer electrons becomes [He], [Ne], ….
 */
export function formatConfiguration(
  occ: Occupancy,
  { shorthand = false, superscripts = true } = {},
) {
  let shown = inOrder(occ.filter((o) => o.electrons > 0));
  let core = '';
  if (shorthand) {
    const total = electronCount(shown);
    for (const gas of [...NOBLE_GASES].reverse()) {
      const inner = groundState(
        ELEMENTS.find((e) => e.symbol === gas)!.atomicNumber,
      );
      const contained = inner.every((c) =>
        shown.some(
          (o) => o.subshell === c.subshell && o.electrons === c.electrons,
        ),
      );
      if (electronCount(inner) < total && contained) {
        core = `[${gas}]`;
        shown = shown.filter(
          (o) => !inner.some((c) => c.subshell === o.subshell),
        );
        break;
      }
    }
  }
  const terms = shown.map(
    (o) => o.subshell + (superscripts ? superscript(o.electrons) : o.electrons),
  );
  return [core, ...terms].filter(Boolean).join(' ');
}

/** Each subshell's boxes, filled by Hund's rule: one ↑ per box, then pair with ↓ */
export function orbitalDiagram(occ: Occupancy) {
  return inOrder(occ).map(({ subshell, electrons }) => {
    const count = orbitalCount(subshell);
    const boxes = Array.from({ length: count }, (_, i): Spin[] =>
      i < electrons - count ? ['up', 'down'] : i < electrons ? ['up'] : [],
    );
    return { subshell, boxes };
  });
}

/** Electrons in each shell n = 1, 2, 3, …, for the Bohr picture */
export function shellCounts(occ: Occupancy) {
  const shells: number[] = [];
  for (const { subshell, electrons } of occ) {
    const n = nOf(subshell);
    while (shells.length < n) shells.push(0);
    shells[n - 1] += electrons;
  }
  return shells;
}

/**
 * The ion's configuration. Cations lose electrons from the highest n first (p
 * before s), so transition metals lose 4s before 3d. Anions gain them in
 * Aufbau order. Null if the charge removes more electrons than there are.
 */
export function ionConfiguration(z: number, charge: number): Occupancy | null {
  if (charge >= z) return null;
  const occ = groundState(z).map((o) => ({ ...o }));
  if (charge > 0) {
    const leaving = [...occ].sort(
      (a, b) =>
        nOf(b.subshell) - nOf(a.subshell) ||
        L[letterOf(b.subshell)] - L[letterOf(a.subshell)],
    );
    let remove = charge;
    for (const o of leaving) {
      const take = Math.min(remove, o.electrons);
      o.electrons -= take;
      remove -= take;
    }
    return occ.filter((o) => o.electrons > 0);
  }
  let add = -charge;
  for (const subshell of SUBSHELL_ORDER) {
    if (add <= 0) break;
    let o = occ.find((x) => x.subshell === subshell);
    if (!o) occ.push((o = { subshell, electrons: 0 }));
    const fill = Math.min(add, capacity(subshell) - o.electrons);
    o.electrons += fill;
    add -= fill;
  }
  return inOrder(occ.filter((o) => o.electrons > 0));
}

/** "1 electron", "2 electrons" */
export const electronsLabel = (n: number) =>
  `${n} electron${n === 1 ? '' : 's'}`;

/** Names one arrow in the diagram: subshell, box and spin, like "2p-0-down" */
export const arrowKey = (subshell: string, box: number, spin: Spin) =>
  `${subshell}-${box}-${spin}`;

const arrowKeys = (occ: Occupancy) =>
  orbitalDiagram(occ).flatMap(({ subshell, boxes }) =>
    boxes.flatMap((spins, box) =>
      spins.map((spin) => arrowKey(subshell, box, spin)),
    ),
  );

/** Arrows in `after` that weren't in `before`: the electrons that arrive */
export function newArrows(before: Occupancy, after: Occupancy) {
  const had = new Set(arrowKeys(before));
  return arrowKeys(after).filter((key) => !had.has(key));
}

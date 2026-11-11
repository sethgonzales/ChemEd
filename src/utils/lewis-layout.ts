import type { LewisStructure, Skeleton } from './lewis';

// Angles are in degrees, anticlockwise from the right; positions are in bond
// lengths with y pointing down, as in SVG.

export const toPoint = (angle: number) => {
  const rad = (angle * Math.PI) / 180;
  return { x: Math.cos(rad), y: -Math.sin(rad) };
};

const angleBetween = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};

/** Gives each skeleton atom a position: a tree spreading out from the most-bonded atom. */
export function layoutSkeleton(skeleton: Skeleton): Skeleton {
  const { atoms, bonds } = skeleton;
  const neighbours = atoms.map((_, i) =>
    bonds.flatMap(([a, b]) => (a === i ? [b] : b === i ? [a] : [])),
  );

  const root = neighbours.reduce(
    (best, n, i) => (n.length > neighbours[best].length ? i : best),
    0,
  );
  const placed = atoms.map(() => ({ x: 0, y: 0 }));
  const visited = new Set([root]);

  // the root's neighbours go evenly round it, one pointing up when there are 3
  const first = neighbours[root];
  const start = first.length === 3 ? 90 : 0;
  const queue: { atom: number; angle: number }[] = [];
  first.forEach((n, i) => {
    const angle = start + (360 / first.length) * i;
    const p = toPoint(angle);
    placed[n] = { x: placed[root].x + p.x, y: placed[root].y + p.y };
    visited.add(n);
    queue.push({ atom: n, angle });
  });

  // further atoms fan out away from the atom they hang off
  while (queue.length) {
    const { atom, angle } = queue.shift()!;
    const next = neighbours[atom].filter((n) => !visited.has(n));
    const spread = next.length > 1 ? 240 / next.length : 0;
    next.forEach((n, i) => {
      const a = angle + (i - (next.length - 1) / 2) * spread;
      const p = toPoint(a);
      placed[n] = { x: placed[atom].x + p.x, y: placed[atom].y + p.y };
      visited.add(n);
      queue.push({ atom: n, angle: a });
    });
  }

  // Object.is(-0, 0) is false in tests; normalise
  const tidy = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v);
  return {
    atoms: atoms.map((atom, i) => ({
      ...atom,
      x: tidy(placed[i].x),
      y: tidy(placed[i].y),
    })),
    bonds,
  };
}

const CANDIDATES = Array.from({ length: 24 }, (_, i) => (90 + i * 15) % 360);

/**
 * Directions for an atom's lone pairs (and unpaired electrons): each as far
 * as possible from its bonds and the other pairs, starting at the top.
 */
export function lonePairSlots(bondAngles: number[], count: number): number[] {
  const slots: number[] = [];
  for (let k = 0; k < count; k++) {
    let best = CANDIDATES[0];
    let bestScore = [-1, -1];
    for (const c of CANDIDATES) {
      if (slots.includes(c)) continue;
      const toPairs = Math.min(360, ...slots.map((s) => angleBetween(c, s)));
      const toAll = Math.min(
        toPairs,
        ...bondAngles.map((b) => angleBetween(c, b)),
      );
      // furthest from everything, then furthest from the other pairs
      if (
        toAll > bestScore[0] ||
        (toAll === bestScore[0] && toPairs > bestScore[1])
      ) {
        best = c;
        bestScore = [toAll, toPairs];
      }
    }
    slots.push(best);
  }
  return slots;
}

/** Directions (degrees) from an atom to each atom bonded to it */
export function bondAngles(s: LewisStructure, id: number): number[] {
  const atom = s.atoms.find((a) => a.id === id);
  if (!atom) return [];
  return s.bonds.flatMap((b) => {
    const other = b.a === id ? b.b : b.b === id ? b.a : null;
    const o = s.atoms.find((a) => a.id === other);
    return o
      ? [(Math.atan2(-(o.y - atom.y), o.x - atom.x) * 180) / Math.PI]
      : [];
  });
}

/**
 * Where to put a new atom: bonded to `attachTo` in its widest gap, or, if
 * unattached, just to the right of everything drawn so far.
 */
export function nextAtomPosition(
  s: LewisStructure,
  attachTo?: number,
): { x: number; y: number } {
  if (!s.atoms.length) return { x: 0, y: 0 };

  const anchor = s.atoms.find((a) => a.id === attachTo);
  if (anchor) {
    const p = toPoint(lonePairSlots(bondAngles(s, anchor.id), 1)[0]);
    return { x: anchor.x + p.x, y: anchor.y + p.y };
  }

  const right = Math.max(...s.atoms.map((a) => a.x));
  const top = Math.min(...s.atoms.map((a) => a.y));
  return { x: right + 1.5, y: top };
}

const GRID = 0.25; // bond lengths
const SNAP_ANGLE = 30; // degrees
const FRAGMENT_GAP = 1.5; // bond lengths between separate pieces after Clean Up

const tidyZero = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v);

/**
 * Where a dragged or dropped atom settles: one bond length from its only
 * neighbour at the nearest multiple of 30°, otherwise on a quarter-bond grid.
 */
export function snapPosition(
  s: LewisStructure,
  id: number,
  point: { x: number; y: number },
): { x: number; y: number } {
  const neighbours = s.bonds.flatMap((b) =>
    b.a === id ? [b.b] : b.b === id ? [b.a] : [],
  );
  const anchor =
    neighbours.length === 1
      ? s.atoms.find((a) => a.id === neighbours[0])
      : undefined;
  if (anchor) {
    const angle =
      (Math.atan2(-(point.y - anchor.y), point.x - anchor.x) * 180) / Math.PI;
    const p = toPoint(Math.round(angle / SNAP_ANGLE) * SNAP_ANGLE);
    return { x: tidyZero(anchor.x + p.x), y: tidyZero(anchor.y + p.y) };
  }
  const grid = (v: number) => tidyZero(Math.round(v / GRID) * GRID);
  return { x: grid(point.x), y: grid(point.y) };
}

// Groups of atom ids joined by bonds, in drawing order
function fragments(s: LewisStructure): number[][] {
  const seen = new Set<number>();
  const groups: number[][] = [];
  for (const start of s.atoms) {
    if (seen.has(start.id)) continue;
    const group: number[] = [];
    const queue = [start.id];
    seen.add(start.id);
    while (queue.length) {
      const id = queue.shift()!;
      group.push(id);
      for (const b of s.bonds) {
        const next = b.a === id ? b.b : b.b === id ? b.a : null;
        if (next !== null && !seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    groups.push(group);
  }
  return groups;
}

/** Tidies the drawing: each connected piece laid out cleanly, pieces side by side. */
export function cleanUp(s: LewisStructure): LewisStructure {
  const placed = new Map<number, { x: number; y: number }>();
  let right = -Infinity;

  for (const group of fragments(s)) {
    const index = new Map(group.map((id, i) => [id, i]));
    const laid = layoutSkeleton({
      atoms: group.map((id) => ({
        symbol: s.atoms.find((a) => a.id === id)!.symbol,
      })),
      bonds: s.bonds
        .filter((b) => index.has(b.a) && index.has(b.b))
        .map((b) => [index.get(b.a)!, index.get(b.b)!]),
    }).atoms;

    const xs = laid.map((a) => a.x ?? 0);
    const shift =
      right === -Infinity ? 0 : right + FRAGMENT_GAP - Math.min(...xs);
    group.forEach((id, i) =>
      placed.set(id, { x: (laid[i].x ?? 0) + shift, y: laid[i].y ?? 0 }),
    );
    right = Math.max(...xs) + shift;
  }

  return {
    ...s,
    atoms: s.atoms.map((a) => ({ ...a, ...placed.get(a.id)! })),
  };
}

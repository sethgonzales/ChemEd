import { findElement } from '~/utils';
import { GROUP_ANION_CHARGES, POLYATOMIC_CHARGES } from '~/constants/ions';
import { elementCategory } from './periodic-table';
import { parseCompound, type Reaction } from './reactions';

/** One drawn particle: an atom, or a polyatomic ion kept whole. Units: an atom's radius. */
export type Particle = {
  label: string;
  x: number;
  y: number;
  r: number;
  charge?: number; // an ion's charge; molecules and elements have none
};

// sizes for drawing, not to scale: hydrogen small, a whole ion large
const H_RADIUS = 0.65;
const ATOM_RADIUS = 1;
const GROUP_RADIUS = 1.45;

const radiusOf = (label: string) =>
  label === 'H'
    ? H_RADIUS
    : Object.keys(parseCompound(label)).length > 1
      ? GROUP_RADIUS
      : ATOM_RADIUS;

/*
 * Shapes are trees: each bond gives the direction (degrees, 0 = right,
 * 90 = down) from an atom to its neighbour, which sits touching it. A bond
 * marked `spin` turns its whole branch to point that way, so a template drawn
 * pointing right (an OH, say) can be attached facing any direction.
 */
type Node = { label: string; bonds: Bond[]; charge?: number };
type Bond = { angle: number; node: Node; spin?: boolean };

const atom = (label: string, ...bonds: [number, Node][]): Node => ({
  label,
  bonds: bonds.map(([angle, node]) => ({ angle, node })),
});
const H = () => atom('H');

const rad = (deg: number) => (deg * Math.PI) / 180;

function place(node: Node, out: Particle[], x = 0, y = 0, rot = 0) {
  const r = radiusOf(node.label);
  out.push({ label: node.label, x, y, r, charge: node.charge });
  for (const { angle, node: child, spin } of node.bonds) {
    const a = rad(rot + angle);
    const d = r + radiusOf(child.label);
    place(
      child,
      out,
      x + d * Math.cos(a),
      y + d * Math.sin(a),
      spin ? rot + angle : rot,
    );
  }
  return out;
}

// Molecules, drawn flat but with their real bond angles where it matters
const WATER_ANGLE = 104.5; // degrees, H–O–H
const half = WATER_ANGLE / 2;
const MOLECULES: Record<string, () => Node> = {
  H2O: () => atom('O', [90 - half, H()], [90 + half, H()]), // bent
  CO2: () => atom('C', [0, atom('O')], [180, atom('O')]), // linear
  NH3: () => atom('N', [90, H()], [90 + 107, H()], [90 - 107, H()]), // pyramid, seen from the side
  CH4: () => atom('C', [0, H()], [90, H()], [180, H()], [270, H()]), // tetrahedron, flattened
  H2O2: () => atom('O', [210, H()], [0, atom('O', [60, H()])]), // skewed chain
  C2H6: () => chain(['C', 'C']),
  C3H8: () => chain(['C', 'C', 'C']),
  C4H10: () => chain(['C', 'C', 'C', 'C']),
  C2H5OH: () => chain(['C', 'C', 'O']),
};

// the atom that formally carries an opened-up ion's charge
const CARRIES = Symbol('carries the charge');
type Carrier = Node & { [CARRIES]?: true };
const carrier = (node: Node): Node => Object.assign(node, { [CARRIES]: true });
function findCarrier(node: Node): Node | undefined {
  if ((node as Carrier)[CARRIES]) return node;
  for (const b of node.bonds) {
    const found = findCarrier(b.node);
    if (found) return found;
  }
}

// polyatomic ions opened up into atoms, drawn pointing right from where they attach
const OPENED: Record<string, () => Node> = {
  OH: () => carrier(atom('O', [0, H()])),
  // attached by the singly bonded O, which carries the charge
  ClO3: () =>
    carrier(atom('O', [0, atom('Cl', [60, atom('O')], [-60, atom('O')])])),
  NO3: () => atom('N', [0, atom('O')], [120, atom('O')], [-120, atom('O')]),
  CO3: () => atom('C', [0, atom('O')], [120, atom('O')], [-120, atom('O')]),
  SO4: () =>
    atom(
      'S',
      [0, atom('O')],
      [90, atom('O')],
      [-90, atom('O')],
      [180, atom('O')],
    ),
  PO4: () =>
    atom(
      'P',
      [0, atom('O')],
      [90, atom('O')],
      [-90, atom('O')],
      [180, atom('O')],
    ),
};

const VALENCE: Record<string, number> = { C: 4, N: 3, O: 2 };
const unit = (deg: number) => ({
  x: Math.cos(rad(deg)),
  y: Math.sin(rad(deg)),
});
const direction = (v: { x: number; y: number }) =>
  (Math.atan2(v.y, v.x) * 180) / Math.PI;

/** A zigzag chain of heavy atoms, each filled up with hydrogens to its valence */
function chain(backbone: string[]): Node {
  const link = (i: number) => (i % 2 ? 30 : -30); // direction from atom i to i + 1
  const build = (i: number): Node => {
    const bonds: number[] = [];
    if (i > 0) bonds.push(link(i - 1) + 180);
    if (i < backbone.length - 1) bonds.push(link(i));
    const need = VALENCE[backbone[i]] - bonds.length;
    let hydrogens: number[];
    if (bonds.length === 1) {
      const b = bonds[0];
      hydrogens = { 3: [90, 180, 270], 2: [120, 240], 1: [180] }[need]!.map(
        (a) => b + a,
      );
    } else {
      // away from both neighbours
      const [a, b] = bonds.map(unit);
      const away = direction({ x: -(a.x + b.x), y: -(a.y + b.y) });
      hydrogens =
        need === 2 ? [away - 40, away + 40] : need === 1 ? [away] : [];
    }
    const node = atom(
      backbone[i],
      ...hydrogens.map((a): [number, Node] => [a, H()]),
    );
    if (i < backbone.length - 1)
      node.bonds.push({ angle: link(i), node: build(i + 1) });
    return node;
  };
  return build(0);
}

/** Glucose as its ring: five carbons and an oxygen, the rest pointing outward */
function glucose(): Particle[] {
  const out: Particle[] = [];
  const side = 2 * ATOM_RADIUS;
  const ring = ['O', 'C', 'C', 'C', 'C', 'C'];
  const at = (k: number) => -90 + 60 * k; // the ring O at the top
  ring.forEach((label, k) =>
    out.push({ label, ...scale(unit(at(k)), side), r: ATOM_RADIUS }),
  );
  const attach = (k: number, angle: number, node: Node) => {
    const from = out[k];
    const d = from.r + radiusOf(node.label);
    const p = unit(angle);
    place(node, out, from.x + d * p.x, from.y + d * p.y, angle);
  };
  const hydroxyl = () => atom('O', [0, H()]);
  const ch2oh = () =>
    atom('C', [90, H()], [-90, H()], [0, atom('O', [-60, H()])]);
  for (let k = 1; k <= 5; k++) {
    attach(k, at(k) + 32, k === 5 ? ch2oh() : hydroxyl());
    attach(k, at(k) - 32, H());
  }
  return out;
}
const scale = (v: { x: number; y: number }, s: number) => ({
  x: v.x * s,
  y: v.y * s,
});

/** The cation and anion of an ionic compound or oxoacid, or null for a molecule */
function ionParts(formula: string) {
  const m = formula.match(/^([A-Z][a-z]?)(\d*)([A-Z(].*)$/);
  if (!m) return null;
  const [, cation, n, rest] = m;
  const bracketed = rest.match(/^\((.+)\)(\d+)$/);
  const single = rest.match(/^([A-Z][a-z]?)(\d*)$/);
  const anion = bracketed?.[1] ?? single?.[1] ?? rest;
  const anions = Number(bracketed?.[2] ?? single?.[2] ?? 1) || 1;
  const isGroup = !single;
  const el = findElement(cation);
  const metal = el !== null && elementCategory(el) === 'metal';
  // an oxoacid like H₂SO₄ is drawn like a salt; HCl and H₂O are molecules
  if (!metal && !(cation === 'H' && isGroup)) return null;
  return { cation, cations: Number(n) || 1, anion, anions, isGroup };
}

/** Polyatomic ions found on the same scale on both sides, so they never break */
export function keptGroups(reaction: Reaction, coefficients: number[]) {
  const count = (formulas: string[], offset: number) => {
    const groups = new Map<string, number>();
    formulas.forEach((f, i) => {
      const parts = ionParts(f);
      if (parts?.isGroup)
        groups.set(
          parts.anion,
          (groups.get(parts.anion) ?? 0) +
            parts.anions * coefficients[offset + i],
        );
    });
    return groups;
  };
  const before = count(reaction.reactants, 0);
  const after = count(reaction.products, reaction.reactants.length);
  return [...before].filter(([g, n]) => after.get(g) === n).map(([g]) => g);
}

/** A formula unit: cations and anions alternating, or round a lone partner */
function ionic(
  parts: NonNullable<ReturnType<typeof ionParts>>,
  kept: string[],
) {
  const { cation, cations, anion, anions, isGroup } = parts;
  // anion charges are cited; the cation's follows, as the compound is neutral
  const anionCharge = isGroup
    ? POLYATOMIC_CHARGES[anion]
    : GROUP_ANION_CHARGES[findElement(anion)?.group ?? 0];
  const cationCharge = anionCharge && (-anionCharge * anions) / cations;
  const charged =
    cation !== 'H' && Number.isInteger(cationCharge) && cationCharge > 0;
  const cationNode = () => ({
    ...atom(cation),
    charge: charged ? cationCharge : undefined,
  });
  const anionNode = () => {
    if (!isGroup || kept.includes(anion))
      return { ...atom(anion), charge: charged ? anionCharge : undefined };
    const opened = OPENED[anion]?.() ?? atom(anion);
    const holder = findCarrier(opened);
    if (charged && holder) holder.charge = anionCharge;
    return opened;
  };
  const spread = (k: number) =>
    ({ 1: [0], 2: [180, 0], 3: [90, 210, 330], 4: [0, 90, 180, 270] })[k] ?? [];

  // one partner in the middle, the others round it, facing outward
  if (cations === 1 || anions === 1) {
    const [centre, outer, n] =
      cations === 1
        ? [cationNode(), anionNode, anions]
        : [anionNode(), cationNode, cations];
    centre.bonds.push(
      ...spread(n).map((angle) => ({ angle, node: outer(), spin: true })),
    );
    return centre;
  }
  // otherwise a zigzag, the more numerous ion at both ends
  const [many, few] =
    cations > anions ? [cationNode, anionNode] : [anionNode, cationNode];
  const length = cations + anions;
  const build = (i: number): Node => {
    const node = i % 2 ? few() : many();
    if (i < length - 1)
      node.bonds.push({ angle: i % 2 ? 30 : -30, node: build(i + 1) });
    return node;
  };
  return build(0);
}

/** How a formula is drawn: polyatomic ions in `kept` stay one particle */
export function shapeOf(formula: string, kept: string[]): Particle[] {
  let shape: Particle[];
  if (formula === 'C6H12O6') shape = glucose();
  else if (MOLECULES[formula]) shape = place(MOLECULES[formula](), []);
  else {
    const parts = ionParts(formula);
    if (parts) shape = place(ionic(parts, kept), []);
    else {
      // anything else: a star round its rarest atom
      const atoms = Object.entries(parseCompound(formula))
        .sort((a, b) => a[1] - b[1])
        .flatMap(([e, n]) => Array<string>(n).fill(e));
      const [centre, ...outer] = atoms;
      const step = 360 / Math.max(outer.length, 1);
      shape = place(
        atom(
          centre,
          ...outer.map((e, i): [number, Node] => [i * step, atom(e)]),
        ),
        [],
      );
    }
  }
  // centred on its bounding box
  const xs = shape.flatMap((p) => [p.x - p.r, p.x + p.r]);
  const ys = shape.flatMap((p) => [p.y - p.r, p.y + p.r]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return shape.map((p) => ({ ...p, x: p.x - cx, y: p.y - cy }));
}

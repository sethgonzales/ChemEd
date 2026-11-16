import type { Side } from '~/utils/electrochemistry';
import { coupleFor } from '~/utils/electrochemistry';

// A close-up of one spot in the cell, in a unit square: the metal fills the
// left of an electrode's lens and the solution the rest; the salt bridge's
// lens is all tube. Not to scale, and water molecules aren't drawn.
//
// The electrode follows the cell's own wear (see electrodeWear), so the lens
// shows the whole run: the anode's surface eats back into the metal and the
// cathode's builds outwards, and an atom never moves once it's in place.

const COLUMN = 0.07; // lattice spacing across
const ROWS = 7;
const ROW = 1 / ROWS;
export const LATTICE = { column: COLUMN, row: ROW }; // for drawing
const METAL_COLUMNS = 6; // the electrode before it runs
const ANODE_LOSS = 4 * ROWS; // atoms an anode loses by the time the cell is flat
const CATHODE_GAIN = 3 * ROWS; // atoms a cathode gains by then
const EDGE = 0.02; // keeps ions off the walls
const IONS_AT_1M = 8; // metal ions in view at 1 M
const MAX_IONS = 12;
const BRIDGE_IONS = 8; // of each kind
const FLOAT_SPEED = 0.03; // ions drifting in solution, lens widths/s
const FLOAT_TURN = 0.06; // how fast that drift wanders, lens widths/s²
const ELECTRON_SPEED = 0.25; // lens widths/s
const ELECTRON_LANE = 0.05; // apart, so each of an ion's electrons can be counted
const LEAVE_DISTANCE = 0.12; // how far a new ion moves off the anode
const MIN_GAP = 0.5; // s between atoms reacting, so a fast run stays calm
const BRIDGE_DRIFT = 1; // lens widths/s per A of current

export type LensSpot = 'anode' | 'cathode' | 'bridge';
export type LensParticleKind = 'atom' | 'cation' | 'anion' | 'electron';

export interface LensParticle {
  id: number;
  kind: LensParticleKind;
  label: string;
  x: number;
  y: number;
  travel: number; // net distance moved across, for drift
  vx?: number; // a free ion's slow drift, lens widths/s
  vy?: number;
  to?: { x: number; y: number }; // heading straight here
  speed?: number; // while heading somewhere, lens widths/s
  becomes?: 'atom'; // what an ion turns into when it gets there
}

export interface Lens {
  spot: LensSpot;
  metal: string;
  ion: string;
  charge: number;
  cathodeSide: Side;
  particles: LensParticle[];
  nextId: number;
  wait: number; // s until the next atom may react
  oxidised: number;
  reduced: number;
  electronsReleased: number;
  electronsArrived: number;
}

interface Options {
  metal: string;
  concentration: number; // M, of the metal's ions
  cathodeSide: Side; // which way the salt bridge carries cations
  wear: number; // 0 to 1, how far the cell has worn this electrode
}

interface StepInput {
  dt: number; // s
  current: number; // A, drives the salt bridge
  concentration: number; // M
  wear: number;
}

type Add = (p: Omit<LensParticle, 'id' | 'travel'>) => LensParticle;

const ionTarget = (concentration: number) =>
  Math.min(MAX_IONS, Math.round(IONS_AT_1M * concentration));
const columnX = (col: number) => (col + 0.5) * COLUMN;
const rowY = (row: number) => (row + 0.5) * ROW;
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
const pick = <T>(xs: T[], random: () => number) =>
  xs[Math.floor(random() * xs.length)];

const atoms = (lens: Lens) => lens.particles.filter((p) => p.kind === 'atom');
// where the solution starts: just past the outermost atom
export const metalEdge = (lens: Lens) =>
  Math.max(0, ...atoms(lens).map((a) => a.x + COLUMN / 2));
const owed = (lens: Lens, wear: number) =>
  lens.spot === 'anode'
    ? Math.round(wear * ANODE_LOSS) - lens.oxidised
    : Math.round(wear * CATHODE_GAIN) - lens.reduced;

function adder(lens: Lens): Add {
  return (p) => {
    const made = { ...p, id: lens.nextId++, travel: 0 };
    lens.particles.push(made);
    return made;
  };
}

export function createLens(
  spot: LensSpot,
  { metal, concentration, cathodeSide, wear }: Options,
  random: () => number = Math.random,
): Lens {
  const couple = coupleFor(metal);
  const lens: Lens = {
    spot,
    metal,
    ion: couple.ion,
    charge: couple.charge,
    cathodeSide,
    particles: [],
    nextId: 0,
    wait: 0,
    oxidised: 0,
    reduced: 0,
    electronsReleased: 0,
    electronsArrived: 0,
  };
  const add = adder(lens);

  if (spot === 'bridge') {
    for (let i = 0; i < BRIDGE_IONS; i++) {
      add({ kind: 'cation', label: 'K⁺', x: random(), y: random() });
      add({ kind: 'anion', label: 'NO₃⁻', x: random(), y: random() });
    }
    return lens;
  }

  for (let col = 0; col < METAL_COLUMNS; col++)
    for (let row = 0; row < ROWS; row++)
      add({ kind: 'atom', label: metal, x: columnX(col), y: rowY(row) });
  // opened partway through a run: show the wear so far, already settled
  for (let i = owed(lens, wear); i > 0; i--) {
    if (spot === 'anode') {
      lens.particles = lens.particles.filter(
        (p) => p !== surfaceAtom(lens, random),
      );
      lens.oxidised += 1;
      lens.electronsReleased += lens.charge;
    } else {
      add({ kind: 'atom', label: metal, ...freeSlot(lens, random)! });
      lens.reduced += 1;
      lens.electronsArrived += lens.charge;
    }
  }

  const start = metalEdge(lens) + EDGE;
  const solutionPoint = () => ({
    x: start + random() * (1 - EDGE - start),
    y: EDGE + random() * (1 - 2 * EDGE),
  });
  const ions = ionTarget(concentration);
  for (let i = 0; i < ions; i++)
    add({ kind: 'cation', label: couple.ion, ...solutionPoint() });
  for (let i = 0; i < ions * couple.charge; i++)
    add({ kind: 'anion', label: 'NO₃⁻', ...solutionPoint() });
  return lens;
}

/** Moves the lens on by `dt`, reacting atoms as the cell's wear calls for */
export function stepLens(
  lens: Lens,
  { dt, current, concentration, wear }: StepInput,
  random: () => number = Math.random,
): Lens {
  const next: Lens = {
    ...lens,
    particles: lens.particles.map((p) => ({ ...p })),
  };
  const add = adder(next);

  if (lens.spot === 'bridge') {
    const toCathode = lens.cathodeSide === 'right' ? 1 : -1;
    for (const p of next.particles) {
      const sign = p.kind === 'cation' ? toCathode : -toCathode;
      float(p, dt, random);
      const dx = (p.vx! + sign * BRIDGE_DRIFT * current) * dt;
      p.travel += dx;
      p.x = (((p.x + dx) % 1) + 1) % 1; // the tube carries on past the lens
      p.y = bounce(p, p.y + p.vy! * dt, EDGE, 1 - EDGE, 'vy');
    }
    return next;
  }

  // one atom at a time, spaced out, until the lens catches up with the cell
  next.wait = Math.max(0, next.wait - dt);
  if (next.wait === 0 && owed(next, wear) > 0) {
    const reacted =
      lens.spot === 'anode'
        ? oxidise(next, add, random)
        : reduce(next, add, random);
    if (reacted) next.wait = MIN_GAP;
  }

  move(next, dt, random);
  keepIons(next, concentration, add, random);
  return next;
}

// the anode dissolves from its outermost layer inwards
function surfaceAtom(lens: Lens, random: () => number) {
  const all = atoms(lens);
  const outer = Math.max(...all.map((a) => a.x));
  return pick(
    all.filter((a) => a.x === outer),
    random,
  );
}

// the next empty place on the cathode's growing layer, nearest the metal first
function freeSlot(lens: Lens, random: () => number) {
  const used = new Set(
    lens.particles
      .filter((p) => p.kind === 'atom' || p.becomes === 'atom')
      .map((p) => {
        const at = p.becomes ? p.to! : p;
        return `${at.x.toFixed(4)},${at.y.toFixed(4)}`;
      }),
  );
  for (
    let col = METAL_COLUMNS;
    col < METAL_COLUMNS + CATHODE_GAIN / ROWS;
    col++
  ) {
    const free = [...Array(ROWS).keys()]
      .map((row) => ({ x: columnX(col), y: rowY(row) }))
      .filter((s) => !used.has(`${s.x.toFixed(4)},${s.y.toFixed(4)}`));
    if (free.length) return pick(free, random);
  }
  return null;
}

// the i-th of n electrons travels its own lane, side by side with the others
const lane = (y: number, i: number, n: number) =>
  clamp(y + (i - (n - 1) / 2) * ELECTRON_LANE, EDGE, 1 - EDGE);

// M → Mⁿ⁺ + ne⁻: a surface atom leaves as an ion, its electrons stay in the metal
function oxidise(lens: Lens, add: Add, random: () => number) {
  const atom = surfaceAtom(lens, random);
  if (!atom) return false;
  lens.particles = lens.particles.filter((p) => p !== atom);
  add({
    kind: 'cation',
    label: lens.ion,
    x: atom.x,
    y: atom.y,
    to: { x: atom.x + LEAVE_DISTANCE, y: atom.y },
    speed: LEAVE_DISTANCE / 2, // eases off over 2 s
  });
  for (let i = 0; i < lens.charge; i++)
    add({
      kind: 'electron',
      label: 'e⁻',
      x: atom.x,
      y: lane(atom.y, i, lens.charge),
      to: { x: 0, y: lane(atom.y, i, lens.charge) },
      speed: ELECTRON_SPEED,
    });
  lens.oxidised += 1;
  lens.electronsReleased += lens.charge;
  return true;
}

// Mⁿ⁺ + ne⁻ → M: an ion and electrons from the wire meet at the surface
function reduce(lens: Lens, add: Add, random: () => number) {
  const slot = freeSlot(lens, random);
  if (!slot) return false;
  const ions = lens.particles.filter((p) => p.kind === 'cation' && !p.to);
  const ion =
    ions.sort((a, b) => a.x - b.x)[0] ??
    add({ kind: 'cation', label: lens.ion, x: 1 - EDGE, y: random() });

  // the ion is timed to arrive with its electrons
  const time = slot.x / ELECTRON_SPEED;
  ion.to = slot;
  ion.becomes = 'atom';
  ion.speed = Math.hypot(slot.x - ion.x, slot.y - ion.y) / time;
  for (let i = 0; i < lens.charge; i++)
    add({
      kind: 'electron',
      label: 'e⁻',
      x: 0,
      y: lane(slot.y, i, lens.charge),
      to: { x: slot.x, y: lane(slot.y, i, lens.charge) },
      speed: ELECTRON_SPEED,
    });
  lens.reduced += 1;
  lens.electronsArrived += lens.charge;
  return true;
}

// Ions float: each keeps a slow drift that wanders gently, rather than
// jittering, as if carried by the water around it.
function float(p: LensParticle, dt: number, random: () => number) {
  if (p.vx === undefined) {
    const angle = random() * 2 * Math.PI;
    p.vx = Math.cos(angle) * FLOAT_SPEED;
    p.vy = Math.sin(angle) * FLOAT_SPEED;
  }
  p.vx! += (random() - 0.5) * 2 * FLOAT_TURN * dt;
  p.vy! += (random() - 0.5) * 2 * FLOAT_TURN * dt;
  const speed = Math.hypot(p.vx!, p.vy!);
  if (speed > FLOAT_SPEED) {
    p.vx! *= FLOAT_SPEED / speed;
    p.vy! *= FLOAT_SPEED / speed;
  }
}

// keeps a coordinate between two walls, turning the drift back at them
function bounce(
  p: LensParticle,
  v: number,
  lo: number,
  hi: number,
  axis: 'vx' | 'vy',
) {
  if (v < lo || v > hi) p[axis] = -p[axis]!;
  return v < lo
    ? Math.min(hi, 2 * lo - v)
    : v > hi
      ? Math.max(lo, 2 * hi - v)
      : v;
}

function move(lens: Lens, dt: number, random: () => number) {
  const wall = metalEdge(lens) + EDGE;
  const arrived: LensParticle[] = [];
  for (const p of lens.particles) {
    if (p.to) {
      const [dx, dy] = [p.to.x - p.x, p.to.y - p.y];
      const d = Math.hypot(dx, dy);
      const step = Math.min(d, p.speed! * dt);
      if (step >= d) {
        p.travel += dx;
        p.x = p.to.x;
        p.y = p.to.y;
        arrived.push(p);
      } else {
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
        p.travel += (dx / d) * step;
      }
    } else if (p.kind === 'cation' || p.kind === 'anion') {
      float(p, dt, random);
      const dx = p.vx! * dt;
      p.travel += dx;
      // the metal (which may have grown under the ion) and the walls turn it back;
      // the right edge is handled by keepIons
      p.x = p.x + dx < wall ? bounce(p, p.x + dx, wall, 2, 'vx') : p.x + dx;
      p.y = bounce(p, p.y + p.vy! * dt, EDGE, 1 - EDGE, 'vy');
    }
  }
  for (const p of arrived) {
    if (p.kind === 'electron') {
      lens.particles = lens.particles.filter((q) => q !== p);
    } else if (p.becomes === 'atom') {
      // the ion has its electrons: it's part of the metal now
      p.kind = 'atom';
      p.label = lens.metal;
      delete p.becomes;
      delete p.to;
      delete p.speed;
    } else {
      delete p.to; // a new ion, clear of the anode: free in the solution
      delete p.speed;
    }
  }
}

// the right edge opens onto the rest of the beaker: ions wander in and out
// so the lens holds about as many as the concentration says
function keepIons(
  lens: Lens,
  concentration: number,
  add: Add,
  random: () => number,
) {
  const cations = ionTarget(concentration);
  const target = { cation: cations, anion: cations * lens.charge };
  for (const kind of ['cation', 'anion'] as const) {
    const label = kind === 'cation' ? lens.ion : 'NO₃⁻';
    const free = () => lens.particles.filter((p) => p.kind === kind && !p.to);
    for (const p of free()) {
      if (p.x <= 1 - EDGE) continue;
      if (free().length > target[kind])
        lens.particles = lens.particles.filter((q) => q !== p);
      else p.x = 2 * (1 - EDGE) - p.x;
    }
    if (free().length < target[kind])
      add({ kind, label, x: 1 - EDGE, y: EDGE + random() * (1 - 2 * EDGE) });
  }
}

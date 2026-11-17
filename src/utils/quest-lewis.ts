// Lewis Structure questions and rooms for the Dungeon Quest, from the drawing
// challenges' molecules and their best structures.

import { MOLECULES } from '~/constants/molecules';
import { layoutSkeleton } from '~/utils/lewis-layout';
import {
  formalCharge,
  formatFormula,
  fromAnswer,
  parseFormula,
  sameStructure,
  totalFormalCharge,
  totalValenceElectrons,
  validStructures,
  type LewisStructure,
  type Molecule,
} from '~/utils/lewis';
import {
  numberChoices,
  pick,
  textChoices,
  type Course,
  type QuickQuestion,
  type Rng,
} from '~/utils/quest';

// Quest levels, not the drawing challenges' own: both courses draw and count
// single bonds, multiple bonds and polyatomic ions (1–3); AP goes on to
// formal charge and σ and π bonds (4–5), mixed with easier molecules
export const LEWIS_LEVELS: Record<Course, [number, number]> = {
  general: [1, 3],
  ap: [1, 5],
};

const byLevel = (test: (level: number) => boolean) =>
  MOLECULES.filter((m) => test(m.level));
const POOLS: Record<number, Molecule[]> = {
  1: byLevel((l) => l === 1),
  2: byLevel((l) => l === 2),
  // ammonium to phosphate, and carbon monoxide
  3: MOLECULES.filter((m) => m.level === 3 || (m.level > 3 && m.charge !== 0)),
  4: byLevel((l) => l <= 4),
  5: MOLECULES, // octet exceptions too
};

/** The molecules a quest level asks about */
export const questMolecules = (level: number) => POOLS[level] ?? [];

const shown = (m: Molecule) => formatFormula(m.formula, m.charge);
const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
type Answer = Molecule['answers'][0];

/** How many valence electrons in total? */
function totalFor(m: Molecule, rng: Rng): QuickQuestion {
  const right = totalValenceElectrons(m.formula, m.charge);
  const atoms = sum(Object.values(parseFormula(m.formula)));
  return {
    prompt: `How many valence electrons are there in total in ${shown(m)}?`,
    about: m.name,
    ...numberChoices(rng, right, [
      right + m.charge, // forgetting the charge
      right - m.charge,
      right + 2,
      right - 2,
      atoms * 8, // an octet for every atom
    ]),
    explain: m.charge
      ? `Add each atom’s valence electrons, then ${m.charge < 0 ? 'add' : 'take away'} ${Math.abs(m.charge)} for the ${m.charge < 0 ? '−' : '+'} charge: ${right}.`
      : `Add each atom’s valence electrons: ${right} in all.`,
  };
}

// a central atom (index 0) bonded to every other atom
const hasCentre = (m: Molecule) =>
  m.skeleton.atoms.length >= 3 && m.skeleton.bonds.every(([a]) => a === 0);
// every best structure gives the same answer, so there's one right choice
const agree = (m: Molecule, f: (a: Answer) => number | string) =>
  new Set(m.answers.map(f)).size === 1;

const lonePairsOk = (m: Molecule) =>
  hasCentre(m) && agree(m, (a) => a.lonePairs[0]);

/** How many lone pairs on the central atom? */
function lonePairsFor(m: Molecule, rng: Rng): QuickQuestion {
  const right = m.answers[0].lonePairs[0];
  const centre = m.skeleton.atoms[0].symbol;
  return {
    prompt: `How many lone pairs are on the central ${centre} atom in ${shown(m)}?`,
    about: m.name,
    ...numberChoices(rng, right, [0, 1, 2, 3, 4], String, 0),
    explain: `In the best structure of ${shown(m)}, the central ${centre} has ${right} lone pair${right === 1 ? '' : 's'} after its bonds.`,
  };
}

const bondsOk = (m: Molecule) => agree(m, (a) => sum(a.orders));

/** How many shared (bonding) pairs in all? */
function bondingPairsFor(m: Molecule, rng: Rng): QuickQuestion {
  const right = sum(m.answers[0].orders);
  const bonds = m.skeleton.bonds.length;
  return {
    prompt: `How many shared pairs of electrons are there in ${shown(m)}?`,
    about: m.name,
    ...numberChoices(rng, right, [
      bonds, // counting each bond once, whatever its order
      right + 1,
      right - 1,
      right + 2,
      right * 2, // electrons, not pairs
    ]),
    explain: `${shown(m)} has ${bonds} bond${bonds === 1 ? '' : 's'}. A single bond is one shared pair, a double two and a triple three: ${right} in all.`,
  };
}

const allPairsOk = (m: Molecule) => agree(m, (a) => sum(a.lonePairs));

/** How many lone pairs in the whole molecule? */
function allLonePairsFor(m: Molecule, rng: Rng): QuickQuestion {
  const right = sum(m.answers[0].lonePairs);
  const centre = m.answers[0].lonePairs[0];
  return {
    prompt: `How many lone pairs are there in all in ${shown(m)}?`,
    about: m.name,
    ...numberChoices(
      rng,
      right,
      [right - centre, right + 1, right - 1, right + 2, right * 2],
      String,
      0,
    ),
    explain: `Count the unshared pairs on every atom of the best structure, not just the central one: ${right} in all.`,
  };
}

// σ and π: every bond has one σ bond; a double bond adds one π, a triple two
const piBonds = (a: Answer) => sum(a.orders.map((o) => o - 1));
const sigmaPiOk = (m: Molecule) => agree(m, piBonds);
const sigmaPi = (sigma: number, pi: number) => `${sigma} σ, ${pi} π`;

/** How many σ and π bonds? */
function sigmaPiFor(m: Molecule, rng: Rng): QuickQuestion {
  const sigma = m.answers[0].orders.length;
  const pi = piBonds(m.answers[0]);
  return {
    prompt: `How many σ and π bonds are there in ${shown(m)}?`,
    about: m.name,
    ...textChoices(rng, sigmaPi(sigma, pi), [
      sigmaPi(sigma + pi, 0), // every shared pair counted as σ
      sigmaPi(sigma, pi + 1),
      sigmaPi(sigma, pi + 2),
      sigmaPi(sigma + 1, pi),
      sigmaPi(Math.max(0, sigma - pi), pi), // a multiple bond counted as π alone
    ]),
    explain: `${sigma === 1 ? 'Its one bond has' : `Each of its ${sigma} bonds has`} one σ bond. A double bond adds one π and a triple two: ${sigmaPi(sigma, pi)}.`,
  };
}

// formal charge = valence electrons − lone-pair electrons − bonds, worked out
// on the challenge's own best structure
const formalOf = (m: Molecule, a: Answer) => {
  const s = fromAnswer(m.skeleton, a);
  return formalCharge(s, s.atoms[0].id);
};
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
// the atom asked about is the only one of its element, so it's unambiguous
const formalOk = (m: Molecule) =>
  parseFormula(m.formula)[m.skeleton.atoms[0].symbol] === 1 &&
  agree(m, (a) => formalOf(m, a));

/** What's the formal charge on the central (or first) atom? */
function formalChargeFor(m: Molecule, rng: Rng): QuickQuestion {
  const right = formalOf(m, m.answers[0]);
  const symbol = m.skeleton.atoms[0].symbol;
  const atom = hasCentre(m) ? `central ${symbol}` : symbol;
  return {
    prompt: `What is the formal charge on the ${atom} atom in the best Lewis structure of ${shown(m)}?`,
    about: m.name,
    ...numberChoices(rng, right, [-2, -1, 0, 1, 2], signed, -Infinity),
    explain: `Formal charge = valence electrons − lone-pair electrons − bonds. For ${symbol} in the best structure of ${shown(m)} that comes to ${signed(right)}.`,
  };
}

interface Kind {
  ok: (m: Molecule) => boolean;
  ask: (m: Molecule, rng: Rng) => QuickQuestion;
}
const TOTAL: Kind = { ok: () => true, ask: totalFor };
const LONE_PAIRS: Kind = { ok: lonePairsOk, ask: lonePairsFor };
const BONDING: Kind = { ok: bondsOk, ask: bondingPairsFor };
const ALL_PAIRS: Kind = { ok: allPairsOk, ask: allLonePairsFor };
const SIGMA_PI: Kind = { ok: sigmaPiOk, ask: sigmaPiFor };
const FORMAL: Kind = { ok: formalOk, ask: formalChargeFor };

const COUNTING = [TOTAL, LONE_PAIRS, BONDING, ALL_PAIRS];
const AP_ONLY = [SIGMA_PI, FORMAL];
const kindsAt = (level: number) => (level >= 4 ? AP_ONLY : COUNTING);

const NONZERO_SHARE = 0.6; // of formal-charge questions with a charged atom

function ask(kind: Kind, rng: Rng, level: number) {
  let pool = questMolecules(level).filter(kind.ok);
  // most atoms have no formal charge, so lean towards those that do, or 0
  // would nearly always be right
  if (kind === FORMAL) {
    const charged = pool.filter((m) => formalOf(m, m.answers[0]) !== 0);
    if (charged.length && rng() < NONZERO_SHARE) pool = charged;
  }
  return kind.ask(pick(rng, pool), rng);
}

export const totalElectronsQuestion = (rng: Rng, level: number) =>
  ask(TOTAL, rng, level);
export const centralLonePairsQuestion = (rng: Rng, level: number) =>
  ask(LONE_PAIRS, rng, level);
export const bondingPairsQuestion = (rng: Rng, level: number) =>
  ask(BONDING, rng, level);
export const totalLonePairsQuestion = (rng: Rng, level: number) =>
  ask(ALL_PAIRS, rng, level);
export const sigmaPiQuestion = (rng: Rng, level: number) =>
  ask(SIGMA_PI, rng, level);
export const formalChargeQuestion = (rng: Rng, level: number) =>
  ask(FORMAL, rng, level);

/** A Lewis question at this quest level */
export function lewisQuestion(rng: Rng, level: number): QuickQuestion {
  const kinds = kindsAt(level).filter((k) => questMolecules(level).some(k.ok));
  return ask(pick(rng, kinds), rng, level);
}

// The Weaver's rooms: draw a whole molecule from a blank page. Only molecules
// with one best structure, since a room is no place to draw every resonance
// form. Both courses meet multiple bonds and ions. AP's last room instead
// sets a molecule's valid structures side by side, to choose the best by
// formal charge.
const drawable = (test: (level: number) => boolean) =>
  MOLECULES.filter((m) => m.answers.length === 1 && test(m.level));
const DRAW_POOLS: Record<Course, [Molecule[], Molecule[]]> = {
  general: [drawable((l) => l <= 2), drawable((l) => l === 2 || l === 3)],
  ap: [drawable((l) => l <= 3), []],
};

export interface StructureChoice {
  molecule: Molecule;
  options: LewisStructure[]; // the best and worse ones, in no set order
  best: number; // which option is the best
}
export type LewisRoom =
  | { kind: 'draw'; molecule: Molecule }
  | ({ kind: 'choose' } & StructureChoice);

const CHOICES = 3; // structures to choose between
// bond orders a rival may differ from the best by: O≡C–O against O=C=O, or
// sulfate's all-single form, but not two P≡O bonds
const MAX_STRAY = 2;

const bondOrders = (s: LewisStructure) =>
  s.bonds.reduce((sum, b) => sum + b.order, 0);
// how far a structure strays from another on the same skeleton, in bond orders
const distance = (a: LewisStructure, b: LewisStructure) =>
  a.bonds.reduce(
    (sum, bond, i) => sum + Math.abs(bond.order - b.bonds[i].order),
    0,
  );

// a molecule's best structure, and its near rivals with larger formal charges
const worseByCharge = (m: Molecule) => {
  // laid out, since they're drawn side by side
  const skeleton = layoutSkeleton(m.skeleton);
  const valid = validStructures(skeleton, m);
  // the molecule's own best structure, as its data gives it
  const best = fromAnswer(skeleton, m.answers[0]);
  return {
    best,
    worse: valid.filter(
      (s) =>
        totalFormalCharge(s) > totalFormalCharge(best) &&
        distance(s, best) <= MAX_STRAY,
    ),
  };
};
const CHOOSABLE = MOLECULES.filter(
  (m) => m.level >= 2 && worseByCharge(m).worse.length > 0,
);

/**
 * The best structure beside worse ones, each with a different total formal
 * charge where there are enough, and at each the one closest to the best:
 * the rivals a textbook draws (sulfate's octet-only forms), not S≡O
 */
export function structureChoice(rng: Rng, m: Molecule): StructureChoice {
  const { best, worse } = worseByCharge(m);
  const levels = [...new Set(worse.map(totalFormalCharge))].sort(
    (x, y) => x - y,
  );
  const picked: LewisStructure[] = [];
  for (const level of levels) {
    if (picked.length === CHOICES - 1) break;
    const here = worse.filter((s) => totalFormalCharge(s) === level);
    // nearest the best, then with the fewest bonding electrons (S=O over S≡O)
    const score = (s: LewisStructure) =>
      distance(s, best) * 100 + bondOrders(s);
    const lowest = Math.min(...here.map(score));
    picked.push(
      pick(
        rng,
        here.filter((s) => score(s) === lowest),
      ),
    );
  }
  // too few levels: more from the closest, unpicked
  const rest = worse.filter(
    (s) =>
      totalFormalCharge(s) === levels[0] &&
      !picked.some((p) => sameStructure(p, s)),
  );
  while (picked.length < CHOICES - 1 && rest.length) {
    picked.push(rest.splice(Math.floor(rng() * rest.length), 1)[0]);
  }
  const at = Math.floor(rng() * (picked.length + 1));
  const options = [...picked.slice(0, at), best, ...picked.slice(at)];
  return { molecule: m, options, best: at };
}

export function lewisRooms(rng: Rng, course: Course): LewisRoom[] {
  const [first, second] = DRAW_POOLS[course];
  const a = pick(rng, first);
  return [
    { kind: 'draw', molecule: a },
    course === 'ap'
      ? { kind: 'choose', ...structureChoice(rng, pick(rng, CHOOSABLE)) }
      : {
          kind: 'draw',
          molecule: pick(
            rng,
            second.filter((m) => m !== a),
          ),
        },
  ];
}

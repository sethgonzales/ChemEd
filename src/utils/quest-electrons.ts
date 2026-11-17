// Electron Configuration questions for the Dungeon Quest, from the elements'
// configurations (NIST ASD) and the simulation's own filling rules.

import { COUPLES } from '~/constants/electrochemistry';
import { ELEMENTS } from '~/constants/elements';
import { GROUP_ANION_CHARGES } from '~/constants/ions';
import {
  aufbauConfiguration,
  formatConfiguration,
  groundState,
  ionConfiguration,
  ionSymbol,
  isException,
  orbitalCount,
  shellCounts,
  type Occupancy,
} from '~/utils/electron-configurations';
import {
  numberChoices,
  pick,
  textChoices,
  type Course,
  type QuickQuestion,
  type Rng,
} from '~/utils/quest';

export const ELECTRON_LEVELS: Record<Course, [number, number]> = {
  general: [1, 3],
  ap: [2, 4],
};

const LAST_Z = [10, 20, 36, 36]; // the heaviest element asked about at each level

export const electronPool = (level: number) =>
  ELEMENTS.filter((e) => e.atomicNumber <= LAST_Z[level - 1]);

/** Unpaired electrons, by Hund's rule: one per orbital before any pair */
export const unpaired = (occ: Occupancy) =>
  occ.reduce((sum, { subshell, electrons }) => {
    const orbitals = orbitalCount(subshell);
    return sum + (electrons <= orbitals ? electrons : 2 * orbitals - electrons);
  }, 0);

const shown = (occ: Occupancy) => formatConfiguration(occ);
const valid = (z: number) => z >= 1 && z <= ELEMENTS.length;

/** Which is the ground-state configuration of X? */
export function configurationQuestion(rng: Rng, level: number): QuickQuestion {
  const e = pick(rng, electronPool(level));
  const z = e.atomicNumber;
  const right = shown(groundState(z));
  const wrong = [
    // a Cr or Cu exception: the plain Aufbau guess is the trap
    ...(isException(z) ? [shown(aufbauConfiguration(z))] : []),
    ...[z - 1, z + 1, z + 2].filter(valid).map((n) => shown(groundState(n))),
  ];
  return {
    prompt: `Which is the ground-state electron configuration of ${e.name}?`,
    about: `${e.name} (${e.symbol}), ${z} electrons`,
    ...textChoices(rng, right, wrong),
    explain: isException(z)
      ? `${right}. ${e.name} is an exception: a half-full or full d subshell is more stable, so an electron moves from 4s to 3d.`
      : `${right}: ${z} electrons, filling each subshell in order before the next.`,
  };
}

/** How many valence electrons does X have? (main-group elements) */
export function valenceQuestion(rng: Rng, level: number): QuickQuestion {
  const pool = electronPool(level).filter(
    (e) => e.block === 's' || e.block === 'p',
  );
  const e = pick(rng, pool);
  const shells = shellCounts(groundState(e.atomicNumber));
  const right = shells.at(-1)!;
  return {
    prompt: `How many valence electrons does ${e.name} have?`,
    about: `${e.name} (${e.symbol}), group ${e.group}`,
    ...numberChoices(rng, right, [
      e.group!, // the group number itself, past group 2
      e.atomicNumber,
      right + 1,
      right - 1,
      right + 2,
    ]),
    explain: `${e.name}’s shells hold ${shells.join(', ')} electrons from the inside out. Valence electrons are the ones in the outer shell: ${right}.`,
  };
}

/** How many unpaired electrons does X have? */
export function unpairedQuestion(rng: Rng, level: number): QuickQuestion {
  const e = pick(rng, electronPool(level));
  const occ = groundState(e.atomicNumber);
  const right = unpaired(occ);
  const last = occ.at(-1)!;
  return {
    prompt: `How many unpaired electrons does ${e.name} have in its ground state?`,
    about: `${e.name}: ${shown(occ)}`,
    // none unpaired is a real answer here, so 0 can be a choice
    ...numberChoices(
      rng,
      right,
      [right + 1, right + 2, right - 1, right - 2, last.electrons],
      String,
      0,
    ),
    explain: `By Hund’s rule each orbital takes one electron before any pairs up, which leaves ${e.name} with ${right} unpaired.`,
  };
}

// Ions with charges the app cites: the metals' ions from their half-cells
// and the anions of groups 16 and 17, up to krypton
const IONS = [
  ...COUPLES.map((c) => ({ symbol: c.id, charge: c.charge })),
  ...ELEMENTS.filter((e) => e.group! in GROUP_ANION_CHARGES).map((e) => ({
    symbol: e.symbol,
    charge: GROUP_ANION_CHARGES[e.group!],
  })),
]
  .map((ion) => ({
    ...ion,
    z: ELEMENTS.find((e) => e.symbol === ion.symbol)!.atomicNumber,
  }))
  .filter((ion) => ion.z <= 36);

/** Which is the configuration of this ion? */
export function ionQuestion(rng: Rng): QuickQuestion {
  const { symbol, charge, z } = pick(rng, IONS);
  const ion = ionSymbol(symbol, charge);
  const right = shown(ionConfiguration(z, charge)!);
  const wrong = [
    shown(groundState(z)), // the neutral atom
    // the trap for transition metals: taking electrons from 3d, not 4s
    shown(aufbauConfiguration(z - charge)),
    ...[charge + 1, charge - 1, -charge]
      .filter((c) => c !== 0 && c < z)
      .map((c) => shown(ionConfiguration(z, c)!)),
  ];
  return {
    prompt: `Which is the electron configuration of ${ion}?`,
    about: `${ion}, ${z - charge} electrons`,
    ...textChoices(rng, right, wrong),
    explain:
      charge > 0
        ? `${right}. A cation loses electrons from the highest shell first, so 4s empties before 3d.`
        : `${right}. An anion gains electrons into the next empty places, in filling order.`,
  };
}

/** An Electron Configuration question: ions at level 4 */
export function electronQuestion(rng: Rng, level: number): QuickQuestion {
  const kinds =
    level >= 4
      ? [ionQuestion, configurationQuestion, unpairedQuestion]
      : [configurationQuestion, valenceQuestion, unpairedQuestion];
  return pick(rng, kinds)(rng, level);
}

// The Lich's rooms: draw an atom's orbital diagram and write its notation.
// [lightest, heaviest] atomic numbers for each course's first two rooms.
const ROOM_ATOMS = {
  general: [
    [3, 10],
    [11, 20],
  ],
  ap: [[11, 30]],
};

const between = (rng: Rng, [low, high]: number[]) => ({
  element: pick(
    rng,
    ELEMENTS.filter((e) => e.atomicNumber >= low && e.atomicNumber <= high),
  ),
  charge: 0,
});

/** What each room asks the student to draw: atoms, and for AP an ion */
export function configurationRooms(rng: Rng, course: Course) {
  if (course === 'general')
    return ROOM_ATOMS.general.map((r) => between(rng, r));
  const ion = pick(rng, IONS);
  return [
    between(rng, ROOM_ATOMS.ap[0]),
    { element: ELEMENTS[ion.z - 1], charge: ion.charge },
  ];
}

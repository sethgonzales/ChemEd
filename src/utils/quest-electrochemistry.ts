// Electrochemistry questions for the Dungeon Quest, from the galvanic cell's
// metals and their cited standard reduction potentials.

import { COUPLES, type Couple } from '~/constants/electrochemistry';
import { formatPotential } from '~/utils/electrochemistry';
import {
  numberChoices,
  pick,
  shuffle,
  textChoices,
  type Course,
  type QuickQuestion,
  type Rng,
} from '~/utils/quest';

// which metal gives up electrons and which way they flow; E°cell is AP only
export const ELECTROCHEMISTRY_LEVELS: Record<Course, [number, number]> = {
  general: [1, 2],
  ap: [2, 3],
};

type Paired = QuickQuestion & { pair: [string, string] };

// highest E° first, as in a table of reduction potentials
const potentials = (cs: Couple[]) =>
  [...cs]
    .sort((a, b) => b.eStandard - a.eStandard)
    .map((c) => `${c.metal} ${formatPotential(c.eStandard)}`)
    .join(', ');

// two metals for a cell, the lower E° first (the anode)
function twoMetals(rng: Rng) {
  const [a, b] = shuffle(rng, COUPLES);
  const [anode, cathode] = a.eStandard < b.eStandard ? [a, b] : [b, a];
  // shown in a random order, so the anode isn't always named first
  const pair: [string, string] = rng() < 0.5 ? [a.id, b.id] : [b.id, a.id];
  return { anode, cathode, pair };
}

const cellName = (pair: [string, string]) =>
  pair
    .map((id) => COUPLES.find((c) => c.id === id)!.metal.toLowerCase())
    .join('–');

/** Which metal gives up electrons most easily? */
export function reducingQuestion(rng: Rng): QuickQuestion {
  const metals = shuffle(rng, COUPLES).slice(0, 4);
  const best = metals.reduce((a, b) => (b.eStandard < a.eStandard ? b : a));
  return {
    prompt: 'Which of these metals gives up its electrons most easily?',
    about: 'Standard reduction potentials',
    ...textChoices(
      rng,
      best.metal,
      metals.map((m) => m.metal),
    ),
    explain: `${potentials(metals)}. The lowest E° is the hardest to reduce, so ${best.metal.toLowerCase()} is the easiest to oxidize.`,
  };
}

/** Which way do electrons flow through the wire? */
export function electronFlowQuestion(rng: Rng): Paired {
  const { anode, cathode, pair } = twoMetals(rng);
  const from = (x: Couple, y: Couple) => `From ${x.metal} to ${y.metal}`;
  return {
    prompt: `In a ${cellName(pair)} galvanic cell, which way do electrons flow through the wire?`,
    about: 'Galvanic cells',
    ...textChoices(rng, from(anode, cathode), [
      from(cathode, anode),
      'Both ways at once',
      'They don’t: the salt bridge carries them',
    ]),
    explain: `${potentials([anode, cathode])}. ${anode.metal}, with the lower E°, is oxidized at the anode, and its electrons flow through the wire to ${cathode.metal.toLowerCase()}, the cathode.`,
    pair,
  };
}

/** What is E°cell? */
export function cellPotentialQuestion(rng: Rng): Paired {
  const { anode, cathode, pair } = twoMetals(rng);
  const right = cathode.eStandard - anode.eStandard;
  const volts = (v: number) => `${formatPotential(v)} V`;
  return {
    prompt: `What is E°cell for a ${cellName(pair)} galvanic cell?`,
    about: potentials([anode, cathode]),
    ...numberChoices(
      rng,
      right,
      [
        -right, // anode minus cathode
        cathode.eStandard + anode.eStandard, // adding the two
        Math.abs(cathode.eStandard) + Math.abs(anode.eStandard),
        right * cathode.charge, // multiplying by the electrons, which E° never is
      ],
      volts,
      -Infinity,
    ),
    explain: `E°cell = E°cathode − E°anode = ${formatPotential(cathode.eStandard)} − (${formatPotential(anode.eStandard)}) = ${volts(right)}. E° doesn’t change with the number of electrons.`,
    pair,
  };
}

/** An Electrochemistry question: E°cell joins in at level 3 */
export function electrochemistryQuestion(
  rng: Rng,
  level: number,
): QuickQuestion {
  const kinds =
    level === 1
      ? [reducingQuestion]
      : level === 2
        ? [reducingQuestion, electronFlowQuestion]
        : [electronFlowQuestion, cellPotentialQuestion];
  return pick(rng, kinds)(rng);
}

// Periodic Table questions for the Dungeon Quest, from the table's own data.

import { ELEMENTS } from '~/constants/elements';
import { ELECTRONEGATIVITY } from '~/constants/electronegativity';
import {
  numberChoices,
  pick,
  shuffle,
  textChoices,
  type Course,
  type QuickQuestion,
  type Rng,
} from '~/utils/quest';
import type { IElementData } from '~/types';
import {
  formatConfiguration,
  groundState,
} from '~/utils/electron-configurations';

export const PERIODIC_LEVELS: Record<Course, [number, number]> = {
  general: [1, 2],
  ap: [2, 4],
};

const LAST_Z = [20, 36, 86, 86]; // the heaviest element asked about at each level
const EN_GAP = 0.1; // no two choices this close in electronegativity

/** Elements a level asks about: the first 20, then 36, then down to radon */
export const periodicPool = (level: number) =>
  ELEMENTS.filter(
    (e) => e.atomicNumber <= LAST_Z[level - 1] && e.group !== null,
  );

const about = (e: IElementData) => `${e.name} (${e.symbol})`;

/** Which element is in group G, period P? */
export function locateQuestion(rng: Rng, level: number): QuickQuestion {
  const pool = periodicPool(level);
  const e = pick(rng, pool);
  // neighbours in its group or period make the closest wrong answers
  const near = pool.filter(
    (o) => o !== e && (o.group === e.group || o.period === e.period),
  );
  return {
    prompt: `Which element is in group ${e.group}, period ${e.period}?`,
    about: 'The periodic table',
    ...textChoices(
      rng,
      e.name,
      near.map((o) => o.name),
    ),
    explain: `${about(e)}: period ${e.period} is its row and group ${e.group} its column.`,
  };
}

/** What's the atomic number of X? */
export function numberQuestion(rng: Rng, level: number): QuickQuestion {
  const e = pick(rng, periodicPool(level));
  const z = e.atomicNumber;
  return {
    prompt: `What is the atomic number of ${e.name}?`,
    about: about(e),
    ...numberChoices(rng, z, [
      Math.round(e.atomicMass ?? 0), // mixing it up with the mass
      z - 1,
      z + 1,
      z + 2,
      z - 2,
    ]),
    explain: `${e.name} has ${z} protons, so its atomic number is ${z}. It’s the element’s number on the table, not its mass.`,
  };
}

/** Which block is X in? */
export function blockQuestion(rng: Rng, level: number): QuickQuestion {
  const e = pick(rng, periodicPool(level));
  const block = `${e.block}-block`;
  return {
    prompt: `Which block is ${e.name} in?`,
    about: about(e),
    ...textChoices(rng, block, ['s-block', 'p-block', 'd-block', 'f-block']),
    explain: `${about(e)} is in the ${block}: its last electrons go into ${e.block} orbitals.`,
  };
}

/** Which of these is the most electronegative? */
export function electronegativityQuestion(
  rng: Rng,
  level: number,
): QuickQuestion {
  const pool = shuffle(
    rng,
    periodicPool(level).filter((e) => e.symbol in ELECTRONEGATIVITY),
  );
  const en = (e: IElementData) => ELECTRONEGATIVITY[e.symbol];
  const chosen: IElementData[] = [];
  for (const e of pool) {
    if (chosen.every((c) => Math.abs(en(c) - en(e)) >= EN_GAP)) chosen.push(e);
    if (chosen.length === 4) break;
  }
  const best = chosen.reduce((a, b) => (en(b) > en(a) ? b : a));
  return {
    prompt: 'Which of these elements is the most electronegative?',
    about: 'Electronegativity (Pauling scale)',
    ...textChoices(
      rng,
      best.name,
      chosen.filter((c) => c !== best).map((c) => c.name),
    ),
    explain: `${[...chosen]
      .sort((a, b) => en(b) - en(a))
      .map((c) => `${c.name} ${en(c)}`)
      .join(', ')}: ${best.name} pulls hardest on shared electrons.`,
  };
}

/** A Periodic Table question: electronegativity joins in from level 3 */
export function periodicQuestion(rng: Rng, level: number): QuickQuestion {
  const kinds = [locateQuestion, numberQuestion, blockQuestion];
  if (level >= 3) kinds.push(electronegativityQuestion);
  return pick(rng, kinds)(rng, level);
}

// The Sphinx's rooms: pick the element a riddle describes on the table

export interface Riddle {
  prompt: string;
  answer: IElementData;
  fits: (e: IElementData) => boolean; // only the answer fits
  hint: (e: IElementData) => string; // what a wrong pick is instead
}

const RIDDLE_LAST_Z = { general: 36, ap: 54 }; // the heaviest element a riddle names
const EN_PERIODS = { general: [2, 3], ap: [2, 3, 4, 5] }; // rows for the trend puzzle

// the last subshell, in filling order, e.g. '4p³'
const ending = (e: IElementData) =>
  e.electronConfiguration
    ? formatConfiguration(groundState(e.atomicNumber)).split(' ').at(-1)!
    : null;

function placeRiddle(rng: Rng): Riddle {
  const answer = pick(
    rng,
    ELEMENTS.filter(
      (e) => e.atomicNumber <= RIDDLE_LAST_Z.general && e.group !== null,
    ),
  );
  return {
    prompt: `I sit in group ${answer.group}, period ${answer.period}. Which element am I?`,
    answer,
    fits: (e) => e.group === answer.group && e.period === answer.period,
    hint: (e) =>
      `${e.name} is in group ${e.group ?? 'none'}, period ${e.period}. Groups are columns and periods are rows.`,
  };
}

function configurationRiddle(rng: Rng): Riddle {
  const answer = pick(
    rng,
    ELEMENTS.filter(
      (e) =>
        e.atomicNumber <= RIDDLE_LAST_Z.ap &&
        (e.block === 's' || e.block === 'p'),
    ),
  );
  const end = ending(answer)!;
  return {
    prompt: `My electron configuration ends in ${end}. Which element am I?`,
    answer,
    fits: (e) => ending(e) === end,
    hint: (e) =>
      `${e.name}’s configuration ends in ${ending(e) ?? 'something else'}. The subshell names the block and row; the count, how far along.`,
  };
}

function electronegativityRiddle(rng: Rng, course: Course): Riddle {
  const period = pick(rng, EN_PERIODS[course]);
  const row = ELEMENTS.filter(
    (e) =>
      e.period === period && e.group !== 18 && e.symbol in ELECTRONEGATIVITY,
  );
  const en = (e: IElementData) => ELECTRONEGATIVITY[e.symbol];
  const answer = row.reduce((a, b) => (en(b) > en(a) ? b : a));
  return {
    prompt: `Of the elements in period ${period}, leaving out the noble gases, I pull hardest on shared electrons. Which element am I?`,
    answer,
    fits: (e) => e === answer,
    hint: (e) =>
      e.period !== period
        ? `${e.name} is in period ${e.period}. Look along row ${period}.`
        : e.group === 18
          ? `${e.name} is a noble gas, and they’re left out. Electronegativity rises across a row.`
          : `${e.name}’s electronegativity is ${en(e)}. Electronegativity rises across a row, so look further right.`,
  };
}

/** Room 1 finds an element by its place (or, AP, its configuration); room 2 by a trend */
export function elementRiddle(rng: Rng, course: Course, room: number): Riddle {
  if (room > 0) return electronegativityRiddle(rng, course);
  return course === 'ap' ? configurationRiddle(rng) : placeRiddle(rng);
}

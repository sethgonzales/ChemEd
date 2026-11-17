// States of Matter questions for the Dungeon Quest, from the substances the
// simulation heats and cools, each with its cited phase data.

import { SUBSTANCES, type Substance } from '~/constants/substances';
import {
  numberChoices,
  pick,
  shuffle,
  textChoices,
  type Course,
  type QuickQuestion,
  type Rng,
} from '~/utils/quest';
import { phaseOf, temperatureRange } from '~/utils/states-of-matter';
import type { Phase } from '~/utils/guide';

// water's phases first; then every substance, its melting and boiling points,
// and (AP) the heat a phase change takes
export const STATES_LEVELS: Record<Course, [number, number]> = {
  general: [1, 2],
  ap: [2, 3],
};

const CLEAR_OF_CHANGE = 5; // °C at least between a question's temperature and a phase change
const SPREAD = 30; // °C, how far past a change a temperature can be
const MOLES = [0.5, 1, 2, 3];

const pool = (level: number) =>
  level === 1 ? SUBSTANCES.filter((s) => s.id === 'water') : SUBSTANCES;

const celsius = (t: number) => `${String(t).replace('-', '−')} °C`;
const points = (s: Substance) =>
  `${s.name} melts at ${celsius(s.meltC)} and boils at ${celsius(s.boilC)} at 1 atm`;

/** What phase is X at T °C? */
export function phaseQuestion(rng: Rng, level: number): QuickQuestion {
  const s = pick(rng, pool(level));
  const gap = CLEAR_OF_CHANGE;
  const phase = pick(rng, ['Solid', 'Liquid', 'Gas'] as const);
  const t = Math.round(
    phase === 'Solid'
      ? s.meltC - gap - rng() * SPREAD
      : phase === 'Liquid'
        ? s.meltC + gap + rng() * (s.boilC - s.meltC - 2 * gap)
        : s.boilC + gap + rng() * SPREAD,
  );
  const right = phaseOf(s, t);
  return {
    prompt: `What phase is ${s.name.toLowerCase()} in at ${celsius(t)} and 1 atm?`,
    about: s.name,
    ...textChoices(rng, right, ['Solid', 'Liquid', 'Gas']),
    explain: `${points(s)}, so at ${celsius(t)} it’s a ${right.toLowerCase()}.`,
  };
}

/** At what temperature does X melt (or boil)? */
export function pointQuestion(rng: Rng, level: number): QuickQuestion {
  const s = pick(rng, pool(level));
  const boil = rng() < 0.5;
  const right = boil ? s.boilC : s.meltC;
  return {
    prompt: `At what temperature does ${s.name.toLowerCase()} ${boil ? 'boil' : 'melt'} at 1 atm?`,
    about: s.name,
    ...textChoices(
      rng,
      celsius(right),
      SUBSTANCES.flatMap((o) => [o.meltC, o.boilC]).map(celsius),
    ),
    explain: `${points(s)}.`,
  };
}

/** How much heat melts (or boils) n mol of X at its melting (boiling) point? */
export function heatQuestion(rng: Rng, level: number): QuickQuestion {
  const s = pick(rng, pool(level));
  const n = pick(rng, MOLES);
  const melt = rng() < 0.5;
  const perMole = melt ? s.fusionKJ : s.vaporizationKJ;
  const other = melt ? s.vaporizationKJ : s.fusionKJ;
  const kJ = (q: number) => `${q.toFixed(2)} kJ`;
  const change = melt ? 'fusion' : 'vaporization';
  return {
    prompt: `How much heat does it take to ${melt ? 'melt' : 'boil'} ${n} mol of ${s.name.toLowerCase()} at its ${melt ? 'melting' : 'boiling'} point?`,
    about: s.name,
    ...numberChoices(
      rng,
      n * perMole,
      [
        n * other, // the other phase change's enthalpy
        perMole, // forgetting the moles
        perMole / n,
        2 * n * perMole,
      ],
      kJ,
    ),
    explain: `Heat = moles × ΔH of ${change}: ${n} mol × ${perMole} kJ/mol = ${kJ(n * perMole)}.`,
  };
}

/** A States of Matter question: heat calculations join in at level 3 */
export function statesQuestion(rng: Rng, level: number): QuickQuestion {
  const kinds =
    level === 1
      ? [phaseQuestion]
      : level === 2
        ? [phaseQuestion, pointQuestion]
        : [phaseQuestion, pointQuestion, heatQuestion, heatQuestion];
  return pick(rng, kinds)(rng, level);
}

export type StatesGoal =
  | { kind: 'phase'; phase: Phase }
  | { kind: 'point'; point: 'melting' | 'boiling' };
export interface StatesRoom {
  substance: Substance;
  start: number;
  goal: StatesGoal;
}

const PHASES: Phase[] = ['Solid', 'Liquid', 'Gas'];
const AT_POINT = 0.5; // °C, as the simulation counts being at a point

const pointOf = (s: Substance, point: 'melting' | 'boiling') =>
  point === 'melting' ? s.meltC : s.boilC;

/** Whether the thermometer's reading reaches the room's goal */
export function goalMet(room: StatesRoom, tempC: number) {
  const { goal, substance } = room;
  return goal.kind === 'phase'
    ? phaseOf(substance, tempC) === goal.phase
    : Math.abs(tempC - pointOf(substance, goal.point)) <= AT_POINT;
}

/**
 * The Wyrm's rooms: two substances, each set to a temperature where the goal
 * isn't met yet. AP's second room asks for a melting or boiling point.
 */
export function statesRooms(rng: Rng, course: Course): StatesRoom[] {
  const [first, second] = shuffle(rng, SUBSTANCES);
  const kinds = course === 'ap' ? ['phase', 'point'] : ['phase', 'phase'];
  return [first, second].map((substance, i) => {
    const goal: StatesGoal =
      kinds[i] === 'phase'
        ? { kind: 'phase', phase: pick(rng, PHASES) }
        : { kind: 'point', point: pick(rng, ['melting', 'boiling'] as const) };
    const { min, max } = temperatureRange(substance);
    const starts = Array.from({ length: max - min + 1 }, (_, k) => min + k);
    const room = { substance, goal, start: min };
    room.start = pick(
      rng,
      starts.filter((t) => !goalMet({ ...room, start: t }, t)),
    );
    return room;
  });
}

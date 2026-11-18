import { planFlight, type FlightPlan } from '~/utils/balloon-flight';
import {
  LEGS_PER_LEVEL,
  avogadroLeg,
  boyleLeg,
  charlesLeg,
  gayLussacLeg,
  type GasLeg,
} from '~/utils/balloon-legs';
import type { Course } from '~/utils/quest';

// A level of Balloon Riser as pure state: brief, fly, land or miss, retry,
// next leg. The page only renders it and runs the flight's clock.

export interface Level {
  id: string;
  title: string;
  ap?: boolean; // AP Chemistry only
  ready?: boolean;
}

export const LEVELS: Level[] = [
  { id: 'boyle', title: 'Boyle’s law', ready: true },
  { id: 'charles', title: 'Charles’s law', ready: true },
  { id: 'gay-lussac', title: 'Gay-Lussac’s law', ready: true },
  { id: 'avogadro', title: 'Avogadro’s law', ready: true },
  { id: 'combined', title: 'Combined gas law' },
  { id: 'ideal', title: 'Ideal gas law' },
  { id: 'free', title: 'Free flight' },
  { id: 'dalton', title: 'Dalton’s law', ap: true },
  { id: 'graham', title: 'Graham’s law', ap: true },
  { id: 'real', title: 'Real gases', ap: true },
];

export const levelsFor = (course: Course) =>
  LEVELS.filter((l) => course === 'ap' || !l.ap);

export interface GameState {
  course: Course;
  level: string;
  leg: number; // from 0
  legs: number;
  seed: number; // the leg's numbers; a retry gets a new one
  misses: number;
  phase: 'brief' | 'flying' | 'landed' | 'missed' | 'done';
  plan?: FlightPlan;
}

export const startLevel = (
  course: Course,
  level: string,
  seed: number,
): GameState => ({
  course,
  level,
  leg: 0,
  legs: LEGS_PER_LEVEL,
  seed,
  misses: 0,
  phase: 'brief',
});

const LEGS: Record<string, (index: number, seed: number) => GasLeg> = {
  boyle: boyleLeg,
  charles: charlesLeg,
  'gay-lussac': gayLussacLeg,
  avogadro: avogadroLeg,
};

/** The leg being flown, with its numbers */
export const gasLeg = (s: GameState) => LEGS[s.level](s.leg, s.seed);

/** Takes off on the student's answer, in SI */
export const fly = (s: GameState, answer: number): GameState => ({
  ...s,
  phase: 'flying',
  plan: planFlight(gasLeg(s), answer),
});

/** The flight's over: down on the platform, or a miss */
export function arrive(s: GameState): GameState {
  const landed = s.plan?.outcome === 'landed';
  return {
    ...s,
    phase: landed ? 'landed' : 'missed',
    misses: s.misses + (landed ? 0 : 1),
  };
}

/** Back to the start of the leg, with fresh numbers */
export const retry = (s: GameState, seed: number): GameState => ({
  ...s,
  seed,
  phase: 'brief',
  plan: undefined,
});

/** On to the next leg, or the level's done */
export const next = (s: GameState): GameState =>
  s.leg + 1 >= s.legs
    ? { ...s, phase: 'done', plan: undefined }
    : { ...s, leg: s.leg + 1, phase: 'brief', plan: undefined };

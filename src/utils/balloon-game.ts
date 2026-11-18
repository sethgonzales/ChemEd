import { planFlight, type FlightPlan } from '~/utils/balloon-flight';
import {
  FREE_LEGS,
  coinsOn,
  freeLeg,
  freeRoute,
  takenBy,
  type Coin,
} from '~/utils/balloon-free';
import {
  LEGS_PER_LEVEL,
  avogadroLeg,
  boyleLeg,
  charlesLeg,
  combinedLeg,
  daltonLeg,
  idealLeg,
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
  { id: 'combined', title: 'Combined gas law', ready: true },
  { id: 'ideal', title: 'Ideal gas law', ready: true },
  { id: 'free', title: 'Free flight', ready: true },
  { id: 'dalton', title: 'Dalton’s law', ap: true, ready: true },
  { id: 'graham', title: 'Graham’s law', ap: true },
  { id: 'real', title: 'Real gases', ap: true },
];

export const levelsFor = (course: Course) =>
  LEVELS.filter((l) => course === 'ap' || !l.ap);

const FIRST_TRY_POINTS = 5; // free flight: for each leg landed first time

export interface GameState {
  course: Course;
  level: string;
  leg: number; // from 0
  legs: number;
  seed: number; // the leg's numbers; a retry gets a new one
  route: number; // free flight's laws and platforms, kept through retries
  misses: number;
  legMissed: boolean; // this leg's had a miss: its coins are gone
  coins: number; // free flight: collected so far
  firstTry: number; // free flight: legs landed first time
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
  legs: level === 'free' ? FREE_LEGS : LEGS_PER_LEVEL,
  seed,
  route: seed,
  misses: 0,
  legMissed: false,
  coins: 0,
  firstTry: 0,
  phase: 'brief',
});

const LEGS: Record<string, (index: number, seed: number) => GasLeg> = {
  boyle: boyleLeg,
  charles: charlesLeg,
  'gay-lussac': gayLussacLeg,
  avogadro: avogadroLeg,
  combined: combinedLeg,
  ideal: idealLeg,
  dalton: daltonLeg,
};

/** The leg being flown, with its numbers */
export const gasLeg = (s: GameState) =>
  s.level === 'free'
    ? freeLeg(freeRoute(s.route), s.leg, s.seed)
    : LEGS[s.level](s.leg, s.seed);

/** Free flight's coins still hanging on this leg: none after a miss */
export const coinsLeft = (s: GameState): Coin[] =>
  s.level === 'free' && !s.legMissed ? coinsOn(gasLeg(s)) : [];

/** Free flight's score: every coin, and points for each leg landed first time */
export const score = (s: GameState) => s.coins + FIRST_TRY_POINTS * s.firstTry;

/** Takes off on the student's answer, in SI */
export const fly = (s: GameState, answer: number): GameState => ({
  ...s,
  phase: 'flying',
  plan: planFlight(gasLeg(s), answer),
});

/** The flight's over: down on the platform, or a miss, with any coins it passed */
export function arrive(s: GameState): GameState {
  const landed = s.plan?.outcome === 'landed';
  const taken = s.plan
    ? takenBy(gasLeg(s), s.plan, coinsLeft(s), 1).filter(Boolean).length
    : 0;
  return {
    ...s,
    phase: landed ? 'landed' : 'missed',
    misses: s.misses + (landed ? 0 : 1),
    coins: s.coins + taken,
    firstTry: s.firstTry + (landed && !s.legMissed ? 1 : 0),
    legMissed: s.legMissed || !landed,
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
    : {
        ...s,
        leg: s.leg + 1,
        phase: 'brief',
        plan: undefined,
        legMissed: false,
      };

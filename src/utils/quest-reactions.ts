// Chemical Reactions questions for the Dungeon Quest, from the Sort and
// Predict activities: reaction types, precipitates and net ionic equations.

import { formatFormula } from '~/utils/lewis';
import { PREDICT_POOL, predict } from '~/utils/predict';
import {
  pick,
  textChoices,
  type Course,
  type QuickQuestion,
  type Rng,
} from '~/utils/quest';
import { writeEquation } from '~/utils/quest-balancing';
import { SORT_POOL, TYPES, classify, explain } from '~/utils/reaction-types';
import { parseEquation } from '~/utils/reactions';

// sorting first, then precipitates; net ionic equations are AP only
export const REACTION_LEVELS: Record<Course, [number, number]> = {
  general: [1, 2],
  ap: [1, 3],
};

type Paired = QuickQuestion & { pair: [string, string] };

const capital = (s: string) => s[0].toUpperCase() + s.slice(1);
const show = (formula: string) => formatFormula(formula);
const mixing = ([a, b]: [string, string]) => `${show(a)} + ${show(b)}`;

/** What type of reaction is this? */
export function typeQuestion(rng: Rng): QuickQuestion {
  const r = pick(rng, SORT_POOL);
  const eq = parseEquation(r.equation);
  const type = classify(eq);
  return {
    prompt: 'What type of reaction is this?',
    shown: writeEquation(eq, r.answer),
    about: r.name,
    ...textChoices(rng, capital(type), Object.keys(TYPES).map(capital)),
    explain: `${capital(type)}: ${explain(eq)}`,
  };
}

// solutions mixed that react; the pairs with a metal are single replacements
const mixtures = PREDICT_POOL.map((pair) => ({
  pair,
  p: predict(pair),
})).filter(({ p }) => p.kind === 'double' && p.products);
const precipitating = mixtures.filter(({ p }) =>
  p.products!.some((x) => x.state === 's'),
);

/** Two solutions mix: which product is the precipitate? */
export function precipitateQuestion(rng: Rng): Paired {
  const { pair, p } = pick(rng, precipitating);
  const solid = p.products!.find((x) => x.state === 's')!;
  return {
    prompt: `Solutions of ${mixing(pair)} are mixed. Which product is the precipitate?`,
    about: 'Solubility rules',
    ...textChoices(
      rng,
      show(solid.formula),
      [...p.products!.map((x) => x.formula), ...pair].map(show),
    ),
    explain: `${p.equation}. ${p.reason}`,
    pair,
  };
}

/** Which is the net ionic equation? */
export function netIonicQuestion(rng: Rng): Paired {
  const { pair, p } = pick(rng, mixtures);
  const others = mixtures.filter((m) => m.p.netIonic !== p.netIonic);
  return {
    prompt: `Solutions of ${mixing(pair)} are mixed. Which is the net ionic equation?`,
    about: 'Net ionic equations',
    ...textChoices(rng, p.netIonic, [
      p.equation, // the whole molecular equation
      ...[pick(rng, others), pick(rng, others)].map((m) => m.p.netIonic),
    ]),
    explain: `${p.netIonic}. ${
      p.spectators.length
        ? `${p.spectators.join(' and ')} ${p.spectators.length === 1 ? 'is a spectator' : 'are spectators'}, the same on both sides, so they cancel.`
        : 'Nothing is left to cancel.'
    }`,
    pair,
  };
}

/** A Chemical Reactions question: net ionic equations at level 3 */
export function reactionQuestion(rng: Rng, level: number): QuickQuestion {
  const kinds =
    level === 1
      ? [typeQuestion]
      : level === 2
        ? [typeQuestion, precipitateQuestion]
        : [precipitateQuestion, netIonicQuestion];
  return pick(rng, kinds)(rng);
}

const REACTING = PREDICT_POOL.flatMap((r, i) =>
  predict(r).products ? [i] : [],
);

/**
 * The Slime's rooms, as places in the Predict pool: one pair that reacts, then
 * any other, which may not (calling No reaction is part of the skill)
 */
export function reactionRooms(rng: Rng): number[] {
  const first = pick(rng, REACTING);
  const rest = PREDICT_POOL.map((_, i) => i).filter((i) => i !== first);
  return [first, pick(rng, rest)];
}

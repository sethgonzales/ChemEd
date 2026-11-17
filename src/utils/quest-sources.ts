// The Dungeon Quest's question bank: one source for each simulation, keyed by
// its page, built from the data that simulation already uses and cites.
// A new simulation adds its source here (a test checks).

import { CONFIGURATION_SOURCE } from '~/constants/elements';
import { ELECTRONEGATIVITY_SOURCE } from '~/constants/electronegativity';
import { ION_CHARGE_SOURCE } from '~/constants/ions';
import { SOLUBILITY_SOURCE, STRONG_SOURCE } from '~/constants/solubility';
import type { SourceId } from '~/constants/sources';
import { SUBSTANCES } from '~/constants/substances';
import { ANALYTES, INDICATOR_SOURCE, KW_SOURCE } from '~/constants/titrations';
import type { Course, QuickQuestion, Rng } from '~/utils/quest';
import { BALANCING_LEVELS, balancingQuestion } from '~/utils/quest-balancing';
import {
  ELECTROCHEMISTRY_LEVELS,
  electrochemistryQuestion,
} from '~/utils/quest-electrochemistry';
import { ELECTRON_LEVELS, electronQuestion } from '~/utils/quest-electrons';
import { LEWIS_LEVELS, lewisQuestion } from '~/utils/quest-lewis';
import { PERIODIC_LEVELS, periodicQuestion } from '~/utils/quest-periodic';
import { REACTION_LEVELS, reactionQuestion } from '~/utils/quest-reactions';
import { STATES_LEVELS, statesQuestion } from '~/utils/quest-states';
import { TITRATION_LEVELS, titrationQuestion } from '~/utils/quest-titrations';

export interface QuestionSource {
  levels: Record<Course, [number, number]>; // easiest and hardest level asked
  question: (rng: Rng, level: number) => QuickQuestion;
  sources: SourceId[]; // where its facts come from
}

export const QUESTION_SOURCES: Record<string, QuestionSource> = {
  '/periodic-table': {
    levels: PERIODIC_LEVELS,
    question: periodicQuestion,
    // the AP riddle names an element by its configuration
    sources: [ELECTRONEGATIVITY_SOURCE, CONFIGURATION_SOURCE],
  },
  '/states-of-matter': {
    levels: STATES_LEVELS,
    question: statesQuestion,
    sources: SUBSTANCES.flatMap((s) => s.sources),
  },
  '/lewis-structures': {
    levels: LEWIS_LEVELS,
    question: lewisQuestion,
    sources: [],
  },
  '/electron-configurations': {
    levels: ELECTRON_LEVELS,
    question: electronQuestion,
    // ions: the metals' charges from their half-cells, the anions' from OpenStax
    sources: [CONFIGURATION_SOURCE, 'electrodePotentials', ION_CHARGE_SOURCE],
  },
  '/reaction-balancing': {
    levels: BALANCING_LEVELS,
    question: balancingQuestion,
    sources: [],
  },
  '/titrations': {
    levels: TITRATION_LEVELS,
    question: titrationQuestion,
    sources: [
      INDICATOR_SOURCE,
      KW_SOURCE,
      ...ANALYTES.flatMap((a) => (a.source ? [a.source] : [])),
    ],
  },
  '/electrochemistry': {
    levels: ELECTROCHEMISTRY_LEVELS,
    question: electrochemistryQuestion,
    sources: ['electrodePotentials'],
  },
  '/chemical-reactions': {
    levels: REACTION_LEVELS,
    question: reactionQuestion,
    // solubility for precipitates; strong acids and bases split into ions
    sources: [SOLUBILITY_SOURCE, STRONG_SOURCE, ION_CHARGE_SOURCE],
  },
};

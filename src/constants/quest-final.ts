// The final chamber: the Alchemist, built from the student's setup. It sets
// two trials borrowed from the chosen chambers, then fights with questions
// from every chosen topic, each ramping from its easiest level for the course
// to its hardest as the Alchemist weakens.

import { findChamber, type QuestChamber } from '~/constants/quest-chambers';
import { ALCHEMIST } from '~/constants/villains/alchemist';
import {
  createRng,
  pick,
  shuffle,
  type Course,
  type Progress,
  type Rng,
} from '~/utils/quest';
import { QUESTION_SOURCES } from '~/utils/quest-sources';

export const ALCHEMIST_ID = 'alchemist';
export const FINAL_STEPS = 5; // how many steps the fight ramps through
const FINAL_HP = 8; // right answers to beat it; every other boss takes 5

/** A topic's question level at this step of the fight */
export const mixLevel = (step: number, [easiest, hardest]: [number, number]) =>
  easiest + Math.round(((step - 1) * (hardest - easiest)) / (FINAL_STEPS - 1));

const chosen = (topics: string[]) =>
  topics.map(findChamber).filter((c): c is QuestChamber => !!c);

/** Whether every chosen chamber has been cleared in this course */
export const alchemistOpen = (
  topics: string[],
  progress: Progress,
  course: Course,
) => topics.every((id) => (progress[course]?.[id] ?? 0) > 0);

/** The two trials: a room each from two chosen chambers, or both rooms of one */
function trialsFor(chambers: QuestChamber[], rng: Rng) {
  if (chambers.length === 1)
    return [0, 1].map((room) => ({ id: chambers[0].id, room }));
  // the harder second room of each
  return shuffle(rng, chambers)
    .slice(0, 2)
    .map((c) => ({ id: c.id, room: 1 }));
}

export function alchemistChamber(
  topics: string[],
  course: Course,
  seed: number,
): QuestChamber {
  const chambers = chosen(topics);
  const trials = trialsFor(chambers, createRng(seed));
  return {
    id: ALCHEMIST_ID,
    topic: 'The Final Chamber',
    page: '', // no one simulation: it asks from all the chosen ones
    villain: ALCHEMIST,
    story: [
      'At the bottom of the dungeon a sealed gate grinds open. Inside, the Alchemist waits, wearing a piece of every villain you’ve beaten.',
      'It made them all. To reach it you must pass two trials taken from the chambers behind you.',
      'Then it will test you on everything at once. Win, and the dungeon is yours. Ready?',
    ],
    rooms: 2,
    trials,
    doors: trials.map(({ id }, i) => {
      const c = findChamber(id)!;
      return {
        name: `Trial ${i + 1}: ${c.villain.name}’s puzzle`,
        story: `The Alchemist has borrowed a puzzle from ${c.topic}. Solve it to go on.`,
      };
    }),
    bossHp: FINAL_HP,
    courses: { general: [1, FINAL_STEPS], ap: [1, FINAL_STEPS] },
    bossQuestion: (rng, step) => {
      const c = pick(rng, chambers);
      const source = QUESTION_SOURCES[c.page];
      const level = mixLevel(step, source.levels[course]);
      return { ...source.question(rng, level), topic: c.topic };
    },
  };
}

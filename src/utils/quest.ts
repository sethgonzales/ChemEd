// Dungeon Quest: one chamber is a story wall, a few rooms, then a boss fight.
// Pure state transitions, so the game can be stepped and tested without a page.

export const MAX_HEARTS = 3;

export type Rng = () => number;

export const COURSES = {
  general: 'General Chemistry',
  ap: 'AP Chemistry',
} as const;
export type Course = keyof typeof COURSES;

export interface Chamber<Q> {
  id: string;
  rooms: number; // challenges before the boss
  bossHp: number; // right answers needed to beat it
  courses: Record<Course, [number, number]>; // easiest and hardest question level
  bossQuestion: (rng: Rng, level: number) => Q;
}

export interface QuestState<Q> {
  stage: 'story' | 'room' | 'boss' | 'loot';
  room: number; // the room being played, from 0
  hearts: number;
  bossHp: number;
  retries: number; // boss fights lost, each one a rematch with new questions
  course: Course;
  seed: number;
  turn: number; // boss questions asked in this fight
  question?: Q;
}

/** A boss question: pick one of a few choices */
export interface QuickQuestion {
  prompt: string;
  shown?: string; // an equation or formula the question is about
  about: string; // what it's drawn from, e.g. a reaction's name
  choices: string[];
  answer: number; // index of the right choice
  explain: string; // why that's the answer, for Mr. G after a miss
}

/** One item from a list, by the seeded generator */
export const pick = <T>(rng: Rng, items: readonly T[]): T =>
  items[Math.floor(rng() * items.length)];

/** A shuffled copy (Fisher–Yates) */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const DISTRACTORS = 3; // wrong choices beside the right one

/**
 * Wrong numbers near the right one, sorted with it. Values below `min`, or
 * that would read the same as another once formatted, are left out.
 */
export function numberChoices(
  rng: Rng,
  right: number,
  near: number[],
  format: (n: number) => string = String,
  min = Number.MIN_VALUE, // the smallest allowed; positive by default
) {
  const shown = new Set([format(right)]);
  const wrong: number[] = [];
  for (const n of shuffle(rng, near)) {
    if (n < min || shown.has(format(n)) || wrong.length === DISTRACTORS)
      continue;
    shown.add(format(n));
    wrong.push(n);
  }
  const all = [right, ...wrong].sort((a, b) => a - b);
  return { choices: all.map(format), answer: all.indexOf(right) };
}

/** The right answer among a few wrong ones, shuffled */
export function textChoices(rng: Rng, right: string, wrong: string[]) {
  const others = shuffle(
    rng,
    [...new Set(wrong)].filter((w) => w !== right),
  ).slice(0, DISTRACTORS);
  const choices = shuffle(rng, [right, ...others]);
  return { choices, answer: choices.indexOf(right) };
}

// best stars for each chamber, kept apart for each course
export type Progress = Partial<Record<Course, Record<string, number>>>;

export interface QuestSetup {
  topics: string[]; // chamber ids, in the dungeon's order
  course: Course;
}

/** mulberry32: a small, fast seeded generator, so questions can be replayed */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One seed per question, from the chamber's seed, the fight and the turn
const questionSeed = (seed: number, fight: number, turn: number) =>
  (Math.imul(seed, 0x9e3779b1) ^ Math.imul(fight + 1, 0x85ebca6b) ^ turn) >>> 0;

// Questions get harder as the boss weakens, from the course's easiest level
// to its hardest
function level<Q>(c: Chamber<Q>, course: Course, bossHp: number): number {
  const [easiest, hardest] = c.courses[course];
  if (c.bossHp <= 1) return easiest;
  const hits = c.bossHp - bossHp;
  return easiest + Math.round((hits * (hardest - easiest)) / (c.bossHp - 1));
}

function ask<Q>(s: QuestState<Q>, c: Chamber<Q>): QuestState<Q> {
  const rng = createRng(questionSeed(s.seed, s.retries, s.turn));
  return { ...s, question: c.bossQuestion(rng, level(c, s.course, s.bossHp)) };
}

function fight<Q>(s: QuestState<Q>, c: Chamber<Q>): QuestState<Q> {
  return ask(
    { ...s, stage: 'boss', hearts: MAX_HEARTS, bossHp: c.bossHp, turn: 0 },
    c,
  );
}

export function startChamber<Q>(
  c: Chamber<Q>,
  course: Course,
  seed: number,
): QuestState<Q> {
  return {
    course,
    stage: 'story',
    room: 0,
    hearts: MAX_HEARTS,
    bossHp: c.bossHp,
    retries: 0,
    seed,
    turn: 0,
  };
}

/** Leave the story wall for the first room */
export function begin<Q>(s: QuestState<Q>): QuestState<Q> {
  return s.stage === 'story' ? { ...s, stage: 'room', room: 0 } : s;
}

/** Open the next room's door, or the boss's after the last room */
export function solveRoom<Q>(s: QuestState<Q>, c: Chamber<Q>): QuestState<Q> {
  if (s.stage !== 'room') return s;
  return s.room + 1 < c.rooms ? { ...s, room: s.room + 1 } : fight(s, c);
}

/**
 * A right answer hits the boss and a wrong one costs a heart; either way a new
 * question follows, so a missed one can't be retried by elimination. Out of hearts,
 * the fight starts over with new questions; cleared rooms stay cleared.
 */
export function answer<Q>(
  s: QuestState<Q>,
  c: Chamber<Q>,
  right: boolean,
): QuestState<Q> {
  if (s.stage !== 'boss') return s;
  if (right) {
    const bossHp = s.bossHp - 1;
    if (bossHp === 0)
      return { ...s, bossHp, stage: 'loot', question: undefined };
    return ask({ ...s, bossHp, turn: s.turn + 1 }, c);
  }
  const hearts = s.hearts - 1;
  if (hearts === 0) return fight({ ...s, retries: s.retries + 1 }, c);
  return ask({ ...s, hearts, turn: s.turn + 1 }, c);
}

export const stars = (hearts: number) => hearts;

/** Keep each chamber's best star score, for the course it was played in */
export function recordClear(
  p: Progress,
  course: Course,
  id: string,
  n: number,
): Progress {
  const stars = p[course] ?? {};
  return { ...p, [course]: { ...stars, [id]: Math.max(stars[id] ?? 0, n) } };
}

/** The final chamber opens once every chosen chamber is cleared in this course */
export const finalOpen = (p: Progress, course: Course, chosen: string[]) =>
  chosen.every((id) => (p[course]?.[id] ?? 0) > 0);

/**
 * The topics and course from a link such as ?topics=lewis,balancing&course=ap.
 * Unknown values are dropped; with no known topics, every topic is in.
 */
export function parseSetup(query: string, all: string[]): QuestSetup {
  const params = new URLSearchParams(query);
  const asked = params.get('topics')?.split(',') ?? [];
  const topics = all.filter((id) => asked.includes(id));
  const course = params.get('course');
  return {
    topics: topics.length ? topics : all,
    course: course && course in COURSES ? (course as Course) : 'general',
  };
}

/** A setup as a link's query string, for a teacher to share */
export const setupQuery = ({ topics, course }: QuestSetup) =>
  '?' + new URLSearchParams({ topics: topics.join(','), course }).toString();

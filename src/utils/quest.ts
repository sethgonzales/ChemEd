// Dungeon Quest: one chamber is a story wall, a few rooms, then a boss fight.
// Pure state transitions, so the game can be stepped and tested without a page.

export const MAX_HEARTS = 3;

export type Rng = () => number;

export interface Chamber<Q> {
  id: string;
  rooms: number; // challenges before the boss
  bossHp: number; // right answers needed to beat it
  levels: number; // question difficulty levels, 1 (easiest) to levels
  bossQuestion: (rng: Rng, level: number) => Q;
}

export interface QuestState<Q> {
  stage: 'story' | 'room' | 'boss' | 'loot';
  room: number; // the room being played, from 0
  hearts: number;
  bossHp: number;
  retries: number; // boss fights lost, each one a rematch with new questions
  seed: number;
  turn: number; // boss questions asked in this fight
  question?: Q;
}

export type Progress = Record<string, number>; // chamber id → best stars

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

// Questions get harder as the boss weakens: level 1 first, the top level last
function level<Q>(c: Chamber<Q>, bossHp: number): number {
  if (c.bossHp <= 1) return 1;
  const hits = c.bossHp - bossHp;
  return 1 + Math.round((hits * (c.levels - 1)) / (c.bossHp - 1));
}

function ask<Q>(s: QuestState<Q>, c: Chamber<Q>): QuestState<Q> {
  const rng = createRng(questionSeed(s.seed, s.retries, s.turn));
  return { ...s, question: c.bossQuestion(rng, level(c, s.bossHp)) };
}

function fight<Q>(s: QuestState<Q>, c: Chamber<Q>): QuestState<Q> {
  return ask(
    { ...s, stage: 'boss', hearts: MAX_HEARTS, bossHp: c.bossHp, turn: 0 },
    c,
  );
}

export function startChamber<Q>(c: Chamber<Q>, seed: number): QuestState<Q> {
  return {
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
 * A right answer hits the boss and a wrong one costs a heart. Out of hearts,
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
  return { ...s, hearts };
}

export const stars = (hearts: number) => hearts;

/** Keep each chamber's best star score */
export function recordClear(p: Progress, id: string, n: number): Progress {
  return { ...p, [id]: Math.max(p[id] ?? 0, n) };
}

/** The final chamber opens once every other chamber has been cleared */
export const finalOpen = (p: Progress, ids: string[]) =>
  ids.every((id) => (p[id] ?? 0) > 0);

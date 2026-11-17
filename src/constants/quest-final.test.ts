import { CHAMBERS, findChamber } from './quest-chambers';
import {
  ALCHEMIST_ID,
  FINAL_STEPS,
  alchemistChamber,
  alchemistOpen,
  mixLevel,
} from './quest-final';
import { createRng } from '~/utils/quest';

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const topicOf = (id: string) => findChamber(id)!.topic;

describe('the Alchemist’s chamber', () => {
  it('is the final boss, tougher than any other', () => {
    const c = alchemistChamber(['balancing', 'lewis'], 'general', 1);
    expect(c.id).toBe(ALCHEMIST_ID);
    expect(c.villain.name).toBe('The Alchemist');
    for (const other of CHAMBERS)
      expect(c.bossHp).toBeGreaterThan(other.bossHp);
  });

  it('sets two trials, each a room from a different chosen chamber', () => {
    for (const seed of SEEDS) {
      const c = alchemistChamber(['balancing', 'lewis', 'states'], 'ap', seed);
      expect(c.rooms).toBe(2);
      expect(c.trials).toHaveLength(2);
      const [a, b] = c.trials!;
      expect(a.id).not.toBe(b.id);
      for (const t of c.trials!)
        expect(['balancing', 'lewis', 'states']).toContain(t.id);
      // each trial has a door naming where it comes from
      c.doors.forEach((d, i) =>
        expect(d.story).toContain(topicOf(c.trials![i].id)),
      );
    }
  });

  it('takes both trials from the one chamber when only one is chosen', () => {
    const c = alchemistChamber(['periodic'], 'general', 3);
    expect(c.trials).toEqual([
      { id: 'periodic', room: 0 },
      { id: 'periodic', room: 1 },
    ]);
  });

  it('asks questions from the chosen topics only, saying which each is from', () => {
    const c = alchemistChamber(['balancing', 'titrations'], 'general', 1);
    const topics = new Set<string>();
    for (const seed of SEEDS)
      for (let step = 1; step <= FINAL_STEPS; step++) {
        const q = c.bossQuestion(createRng(seed), step);
        topics.add(q.topic!);
      }
    expect(topics).toEqual(
      new Set([topicOf('balancing'), topicOf('titrations')]),
    );
  });

  it('ramps each topic from its easiest level for the course to its hardest', () => {
    expect(mixLevel(1, [2, 4])).toBe(2);
    expect(mixLevel(FINAL_STEPS, [2, 4])).toBe(4);
    expect(mixLevel(3, [1, 5])).toBe(3);
    expect(alchemistChamber(['lewis'], 'ap', 1).courses.ap).toEqual([
      1,
      FINAL_STEPS,
    ]);
  });
});

describe('the Alchemist’s gate', () => {
  it('opens only once every chosen chamber is cleared, in this course', () => {
    const topics = ['balancing', 'lewis'];
    expect(alchemistOpen(topics, {}, 'general')).toBe(false);
    expect(
      alchemistOpen(topics, { general: { balancing: 1 } }, 'general'),
    ).toBe(false);
    expect(
      alchemistOpen(topics, { general: { balancing: 1, lewis: 3 } }, 'general'),
    ).toBe(true);
    expect(
      alchemistOpen(topics, { ap: { balancing: 1, lewis: 3 } }, 'general'),
    ).toBe(false);
  });
});

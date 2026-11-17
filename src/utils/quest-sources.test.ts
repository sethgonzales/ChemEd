import { SIMULATIONS } from '~/constants';
import { QUEST_PAGE } from '~/constants/guide-tips';
import { COURSES, createRng, type Course } from './quest';
import { QUESTION_SOURCES } from './quest-sources';

const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);
const COURSE_IDS = Object.keys(COURSES) as Course[];

describe('the question bank', () => {
  it.each(SIMULATIONS.filter((s) => s.ready && s.path !== QUEST_PAGE))(
    '$title has a question source',
    ({ path }) => {
      expect(QUESTION_SOURCES[path]).toBeDefined();
    },
  );

  const cases = Object.entries(QUESTION_SOURCES).flatMap(([path, source]) =>
    COURSE_IDS.map((course) => [path, course, source] as const),
  );

  it.each(cases)(
    '%s asks fair questions at every level of the %s course',
    (_, course, source) => {
      const [easiest, hardest] = source.levels[course];
      expect(easiest).toBeLessThanOrEqual(hardest);
      for (let level = easiest; level <= hardest; level++)
        for (const seed of SEEDS) {
          const q = source.question(createRng(seed), level);
          expect(q.prompt).not.toBe('');
          expect(q.about).not.toBe('');
          expect(q.explain).not.toBe('');
          expect(q.choices.length).toBeGreaterThanOrEqual(3);
          expect(new Set(q.choices).size).toBe(q.choices.length);
          expect(q.choices[q.answer]).toBeDefined();
          expect(source.question(createRng(seed), level)).toEqual(q);
        }
    },
  );

  it.each(Object.entries(QUESTION_SOURCES))(
    '%s mixes up its questions',
    (_, source) => {
      const [easiest, hardest] = source.levels.ap;
      for (let level = easiest; level <= hardest; level++) {
        const asked = new Set(
          SEEDS.map((s) =>
            JSON.stringify(source.question(createRng(s), level)),
          ),
        );
        expect(asked.size).toBeGreaterThan(5);
      }
    },
  );

  // a student coming back should rarely meet a question they've seen: a
  // question is new if its prompt, equation or set of choices is
  const VARIETY = 40;
  it.each(cases)(
    '%s has at least 40 different questions at every level of the %s course',
    (_, course, source) => {
      const [easiest, hardest] = source.levels[course];
      for (let level = easiest; level <= hardest; level++) {
        const seen = new Set<string>();
        for (let seed = 1; seed <= 2000; seed++) {
          const q = source.question(createRng(seed), level);
          seen.add(
            `${q.prompt}|${q.shown ?? ''}|${[...q.choices].sort().join('/')}`,
          );
        }
        expect(seen.size).toBeGreaterThanOrEqual(VARIETY);
      }
    },
  );
});

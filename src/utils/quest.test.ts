import {
  MAX_HEARTS,
  type Chamber,
  type Course,
  type QuestState,
  answer,
  begin,
  createRng,
  finalOpen,
  numberChoices,
  parseSetup,
  recordClear,
  rematch,
  setupQuery,
  solveRoom,
  stars,
  startChamber,
  textChoices,
} from './quest';

// A stand-in question: which level it was asked at, and a random number
type TestQuestion = { level: number; value: number };

const chamber: Chamber<TestQuestion> = {
  id: 'test',
  rooms: 2,
  bossHp: 4,
  courses: { general: [1, 2], ap: [2, 4] }, // question levels for each course
  bossQuestion: (rng, level) => ({ level, value: rng() }),
};

// Story read, both rooms solved: standing in front of the boss
function atBoss(
  seed = 1,
  course: Course = 'general',
): QuestState<TestQuestion> {
  let s = begin(startChamber(chamber, course, seed));
  s = solveRoom(s, chamber);
  return solveRoom(s, chamber);
}

describe('createRng', () => {
  it('repeats the same numbers for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('gives different numbers for different seeds', () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });

  it('stays between 0 and 1', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const n = rng();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });
});

describe('a chamber', () => {
  it('opens on the story wall with full hearts', () => {
    const s = startChamber(chamber, 'general', 1);
    expect(s.stage).toBe('story');
    expect(s.hearts).toBe(MAX_HEARTS);
  });

  it('goes from the story to the first room', () => {
    const s = begin(startChamber(chamber, 'general', 1));
    expect(s.stage).toBe('room');
    expect(s.room).toBe(0);
  });

  it('opens the next room as each one is solved, then the boss', () => {
    let s = begin(startChamber(chamber, 'general', 1));
    s = solveRoom(s, chamber);
    expect(s).toMatchObject({ stage: 'room', room: 1 });
    s = solveRoom(s, chamber);
    expect(s.stage).toBe('boss');
    expect(s.bossHp).toBe(chamber.bossHp);
    expect(s.question).toBeDefined();
  });

  it('ignores moves that do not fit the stage', () => {
    const story = startChamber(chamber, 'general', 1);
    expect(solveRoom(story, chamber)).toBe(story);
    expect(answer(story, chamber, true)).toBe(story);
    const boss = atBoss();
    expect(begin(boss)).toBe(boss);
  });
});

describe('the boss fight', () => {
  it('loses HP and asks a new question on a right answer', () => {
    const s = atBoss();
    const next = answer(s, chamber, true);
    expect(next.bossHp).toBe(s.bossHp - 1);
    expect(next.hearts).toBe(MAX_HEARTS);
    expect(next.question).not.toEqual(s.question);
  });

  it('costs a heart on a wrong answer, and the boss keeps its HP', () => {
    const s = atBoss();
    const next = answer(s, chamber, false);
    expect(next.hearts).toBe(MAX_HEARTS - 1);
    expect(next.bossHp).toBe(s.bossHp);
  });

  it('asks a new question at the same level after a wrong answer, so choices can’t be ruled out', () => {
    const s = atBoss();
    const next = answer(s, chamber, false);
    expect(next.question).not.toEqual(s.question);
    expect(next.question!.level).toBe(s.question!.level);
  });

  it('is won when the boss runs out of HP', () => {
    let s = atBoss();
    for (let i = 0; i < chamber.bossHp; i++) s = answer(s, chamber, true);
    expect(s.stage).toBe('loot');
  });

  it.each([
    ['general', 1, 2],
    ['ap', 2, 4],
  ] as const)(
    'asks harder questions as the boss weakens, within the %s course’s levels',
    (course, easiest, hardest) => {
      let s = atBoss(1, course);
      const levels = [s.question!.level];
      while (s.stage === 'boss') {
        s = answer(s, chamber, true);
        if (s.question) levels.push(s.question.level);
      }
      expect(levels[0]).toBe(easiest);
      expect(levels.at(-1)).toBe(hardest);
      levels
        .slice(1)
        .forEach((l, i) => expect(l).toBeGreaterThanOrEqual(levels[i]));
    },
  );

  describe('running out of hearts', () => {
    function knockedOut(seed = 1) {
      let s = answer(atBoss(seed), chamber, true); // one hit landed first
      for (let i = 0; i < MAX_HEARTS; i++) s = answer(s, chamber, false);
      return s;
    }

    it('is game over: no hearts, no more questions, until the student chooses', () => {
      const s = knockedOut();
      expect(s.stage).toBe('defeat');
      expect(s.hearts).toBe(0);
      expect(s.question).toBeUndefined();
      expect(answer(s, chamber, true)).toBe(s); // no answering from the floor
    });

    it('can be fought again: hearts refilled and the boss healed, without going back to the rooms', () => {
      const s = rematch(knockedOut(), chamber);
      expect(s.stage).toBe('boss');
      expect(s.hearts).toBe(MAX_HEARTS);
      expect(s.bossHp).toBe(chamber.bossHp);
      expect(s.retries).toBe(1);
    });

    it('starts the rematch with fresh questions', () => {
      const first = atBoss();
      const again = rematch(knockedOut(), chamber);
      expect(again.question!.level).toBe(1);
      expect(again.question!.value).not.toBe(first.question!.value);
    });

    it('only rematches after a defeat', () => {
      const s = atBoss();
      expect(rematch(s, chamber)).toBe(s);
    });
  });
});

describe('the same seed', () => {
  it('plays out the same questions, so a fight can be replayed in tests', () => {
    const a = answer(atBoss(5), chamber, true);
    const b = answer(atBoss(5), chamber, true);
    expect(a.question).toEqual(b.question);
  });
});

describe('stars', () => {
  it('gives one star per heart left', () => {
    expect(stars(3)).toBe(3);
    expect(stars(1)).toBe(1);
  });
});

describe('progress', () => {
  it('keeps the best star score for each chamber', () => {
    let p = recordClear({}, 'general', 'balancing', 2);
    p = recordClear(p, 'general', 'balancing', 1);
    expect(p.general?.balancing).toBe(2);
    p = recordClear(p, 'general', 'balancing', 3);
    expect(p.general?.balancing).toBe(3);
  });

  it('keeps each course’s stars apart', () => {
    const p = recordClear({}, 'ap', 'balancing', 3);
    expect(p.ap?.balancing).toBe(3);
    expect(p.general?.balancing).toBeUndefined();
  });

  it('opens the final chamber once every chosen chamber is cleared, in that course', () => {
    const chosen = ['periodic', 'balancing'];
    let p = recordClear({}, 'general', 'periodic', 3);
    expect(finalOpen(p, 'general', chosen)).toBe(false);
    p = recordClear(p, 'general', 'balancing', 1);
    expect(finalOpen(p, 'general', chosen)).toBe(true);
    expect(finalOpen(p, 'ap', chosen)).toBe(false);
    // chambers the class left out don't hold it shut
    expect(finalOpen(p, 'general', ['periodic'])).toBe(true);
  });
});

describe('the setup: topics and course', () => {
  const all = ['periodic', 'lewis', 'balancing'];

  it('starts with every topic, at General Chemistry', () => {
    expect(parseSetup('', all)).toEqual({ topics: all, course: 'general' });
  });

  it('reads a teacher’s link, keeping topics in the dungeon’s order', () => {
    expect(parseSetup('?topics=balancing,periodic&course=ap', all)).toEqual({
      topics: ['periodic', 'balancing'],
      course: 'ap',
    });
  });

  it('ignores topics and courses it doesn’t know', () => {
    expect(parseSetup('?topics=lewis,gas-laws&course=college', all)).toEqual({
      topics: ['lewis'],
      course: 'general',
    });
  });

  it('never leaves the dungeon empty: no known topics means all of them', () => {
    expect(parseSetup('?topics=nothing', all).topics).toEqual(all);
  });

  it('writes a setup back into a link that reads the same', () => {
    const setup = { topics: ['lewis', 'balancing'], course: 'ap' as const };
    expect(parseSetup(setupQuery(setup), all)).toEqual(setup);
  });
});

describe('choices', () => {
  it('sorts numbers around the right one, each shown once, with no zero or negatives', () => {
    for (let seed = 1; seed < 30; seed++) {
      const { choices, answer } = numberChoices(
        createRng(seed),
        2,
        [1, 3, 3, 0, -1, 4, 6],
      );
      expect(choices).toHaveLength(4);
      expect(choices[answer]).toBe('2');
      expect(new Set(choices).size).toBe(4);
      expect(choices.map(Number)).toEqual(
        [...choices.map(Number)].sort((a, b) => a - b),
      );
      expect(choices.every((c) => Number(c) > 0)).toBe(true);
    }
  });

  it('formats numbers, never showing a wrong one that reads like the right one', () => {
    const { choices, answer } = numberChoices(
      createRng(1),
      1.1,
      [1.1001, 2.2, 0.55, 3.3],
      (n) => `${n.toFixed(2)} V`,
    );
    expect(choices[answer]).toBe('1.10 V');
    expect(choices.filter((c) => c === '1.10 V')).toHaveLength(1);
  });

  it('shuffles words, keeping track of the right one', () => {
    const seen = new Set<number>();
    for (let seed = 1; seed < 30; seed++) {
      const q = textChoices(createRng(seed), 'Gas', ['Solid', 'Liquid', 'Gas']);
      expect(q.choices).toHaveLength(3);
      expect(q.choices[q.answer]).toBe('Gas');
      seen.add(q.answer);
    }
    expect(seen.size).toBe(3);
  });
});

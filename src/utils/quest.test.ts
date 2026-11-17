import {
  MAX_HEARTS,
  type Chamber,
  type QuestState,
  answer,
  begin,
  createRng,
  finalOpen,
  recordClear,
  solveRoom,
  stars,
  startChamber,
} from './quest';

// A stand-in question: which level it was asked at, and a random number
type TestQuestion = { level: number; value: number };

const chamber: Chamber<TestQuestion> = {
  id: 'test',
  rooms: 2,
  bossHp: 4,
  levels: 3,
  bossQuestion: (rng, level) => ({ level, value: rng() }),
};

// Story read, both rooms solved: standing in front of the boss
function atBoss(seed = 1): QuestState<TestQuestion> {
  let s = begin(startChamber(chamber, seed));
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
    const s = startChamber(chamber, 1);
    expect(s.stage).toBe('story');
    expect(s.hearts).toBe(MAX_HEARTS);
  });

  it('goes from the story to the first room', () => {
    const s = begin(startChamber(chamber, 1));
    expect(s.stage).toBe('room');
    expect(s.room).toBe(0);
  });

  it('opens the next room as each one is solved, then the boss', () => {
    let s = begin(startChamber(chamber, 1));
    s = solveRoom(s, chamber);
    expect(s).toMatchObject({ stage: 'room', room: 1 });
    s = solveRoom(s, chamber);
    expect(s.stage).toBe('boss');
    expect(s.bossHp).toBe(chamber.bossHp);
    expect(s.question).toBeDefined();
  });

  it('ignores moves that do not fit the stage', () => {
    const story = startChamber(chamber, 1);
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

  it('is won when the boss runs out of HP', () => {
    let s = atBoss();
    for (let i = 0; i < chamber.bossHp; i++) s = answer(s, chamber, true);
    expect(s.stage).toBe('loot');
  });

  it('asks harder questions as the boss weakens', () => {
    let s = atBoss();
    const levels = [s.question!.level];
    while (s.stage === 'boss') {
      s = answer(s, chamber, true);
      if (s.question) levels.push(s.question.level);
    }
    expect(levels[0]).toBe(1);
    expect(levels.at(-1)).toBe(chamber.levels);
    levels
      .slice(1)
      .forEach((l, i) => expect(l).toBeGreaterThanOrEqual(levels[i]));
  });

  describe('running out of hearts', () => {
    function knockedOut(seed = 1) {
      let s = answer(atBoss(seed), chamber, true); // one hit landed first
      for (let i = 0; i < MAX_HEARTS; i++) s = answer(s, chamber, false);
      return s;
    }

    it('refills the hearts and resets the boss, without going back to the rooms', () => {
      const s = knockedOut();
      expect(s.stage).toBe('boss');
      expect(s.hearts).toBe(MAX_HEARTS);
      expect(s.bossHp).toBe(chamber.bossHp);
      expect(s.retries).toBe(1);
    });

    it('starts the rematch with fresh questions', () => {
      const first = atBoss();
      const rematch = knockedOut();
      expect(rematch.question!.level).toBe(1);
      expect(rematch.question!.value).not.toBe(first.question!.value);
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
    let p = recordClear({}, 'balancing', 2);
    p = recordClear(p, 'balancing', 1);
    expect(p.balancing).toBe(2);
    p = recordClear(p, 'balancing', 3);
    expect(p.balancing).toBe(3);
  });

  it('opens the final chamber only once every other chamber is cleared', () => {
    const ids = ['periodic', 'balancing'];
    expect(finalOpen({}, ids)).toBe(false);
    expect(finalOpen({ periodic: 3 }, ids)).toBe(false);
    expect(finalOpen({ periodic: 3, balancing: 1 }, ids)).toBe(true);
  });
});

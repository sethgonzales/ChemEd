import {
  LEVELS,
  arrive,
  fly,
  gasLeg,
  levelsFor,
  next,
  retry,
  coinsLeft,
  score,
  startLevel,
} from './balloon-game';
import { COINS_PER_LEG, FREE_LEGS } from './balloon-free';
import { BOYLE_LEGS, rightAnswer, tieOffVolume } from './balloon-legs';

const begin = () => startLevel('general', 'boyle', 11);
const flyRight = (s: ReturnType<typeof begin>) =>
  arrive(fly(s, tieOffVolume(gasLeg(s))));

describe('a level of Balloon Riser', () => {
  it('starts on the first platform with Mr. G’s briefing', () => {
    const s = begin();
    expect(s.leg).toBe(0);
    expect(s.phase).toBe('brief');
    expect(s.misses).toBe(0);
  });

  it('flies on the answer, then lands with the right one', () => {
    const flying = fly(begin(), tieOffVolume(gasLeg(begin())));
    expect(flying.phase).toBe('flying');
    expect(flying.plan?.outcome).toBe('landed');
    expect(arrive(flying).phase).toBe('landed');
  });

  it('counts a miss, and a retry gives the same leg fresh numbers', () => {
    const s = begin();
    const missed = arrive(fly(s, tieOffVolume(gasLeg(s)) * 1.2));
    expect(missed.phase).toBe('missed');
    expect(missed.misses).toBe(1);
    const again = retry(missed, 99);
    expect(again.phase).toBe('brief');
    expect(again.leg).toBe(0);
    expect(gasLeg(again).moles).not.toBe(gasLeg(s).moles);
  });

  it('moves leg to leg, and finishes after the last one', () => {
    let s = begin();
    for (let i = 0; i < BOYLE_LEGS; i++) {
      s = flyRight(s);
      expect(s.phase).toBe('landed');
      s = next(s);
    }
    expect(s.phase).toBe('done');
  });

  it('only opens the levels that are built, and the AP ones for AP', () => {
    expect(levelsFor('general').every((l) => !l.ap)).toBe(true);
    expect(levelsFor('ap').some((l) => l.ap)).toBe(true);
    expect(LEVELS.filter((l) => l.ready).map((l) => l.id)).toEqual([
      'boyle',
      'charles',
      'gay-lussac',
      'avogadro',
      'combined',
      'ideal',
      'free',
      'dalton',
      'graham',
    ]);
  });

  it.each([
    'boyle',
    'charles',
    'gay-lussac',
    'avogadro',
    'combined',
    'ideal',
    'dalton',
  ])('flies the %s level on its own law, all the way through', (level) => {
    let s = startLevel('general', level, 5);
    expect(gasLeg(s).law).toBe(level);
    for (let i = 0; i < s.legs; i++) {
      s = arrive(fly(s, rightAnswer(gasLeg(s))));
      expect(s.phase).toBe('landed');
      s = next(s);
    }
    expect(s.phase).toBe('done');
  });
});

describe('free flight', () => {
  const begin = () => startLevel('general', 'free', 21);
  const right = (s: ReturnType<typeof begin>) =>
    arrive(fly(s, rightAnswer(gasLeg(s))));

  it('flies five legs out to Far Horizon, each on its own law', () => {
    let s = begin();
    expect(s.legs).toBe(FREE_LEGS);
    const laws = new Set<string>();
    for (let i = 0; i < s.legs; i++) {
      laws.add(gasLeg(s).law);
      s = right(s);
      expect(s.phase).toBe('landed');
      if (i < s.legs - 1) s = next(s);
    }
    expect(gasLeg(s).leg.to.name).toBe('Far Horizon');
    expect(laws.size).toBeGreaterThan(1);
    expect(next(s).phase).toBe('done');
  });

  it('scores every coin and five for each leg landed first time', () => {
    let s = begin();
    expect(score(s)).toBe(0);
    for (let i = 0; i < s.legs; i++) {
      expect(coinsLeft(s)).toHaveLength(COINS_PER_LEG);
      s = next(right(s));
    }
    expect(s.coins).toBe(FREE_LEGS * COINS_PER_LEG);
    expect(s.firstTry).toBe(FREE_LEGS);
    expect(score(s)).toBe(FREE_LEGS * COINS_PER_LEG + 5 * FREE_LEGS);
  });

  it('loses a leg’s points on a miss: its coins are gone, and the retry keeps the law and platforms', () => {
    let s = begin();
    const leg = gasLeg(s);
    s = arrive(fly(s, rightAnswer(leg) * 1.3));
    expect(s.phase).toBe('missed');
    s = retry(s, 99);
    expect(gasLeg(s).law).toBe(leg.law);
    expect(gasLeg(s).leg).toEqual(leg.leg);
    expect(coinsLeft(s)).toHaveLength(0);
    s = right(s);
    expect(s.firstTry).toBe(0);
    expect(score(s)).toBe(s.coins);
    expect(s.coins).toBeLessThan(COINS_PER_LEG);
    s = next(s);
    expect(coinsLeft(s)).toHaveLength(COINS_PER_LEG);
  });

  it('has no coins on the other levels', () => {
    expect(coinsLeft(startLevel('general', 'boyle', 1))).toHaveLength(0);
  });
});

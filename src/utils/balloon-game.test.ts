import {
  LEVELS,
  arrive,
  fly,
  gasLeg,
  levelsFor,
  next,
  retry,
  startLevel,
} from './balloon-game';
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
    ]);
  });

  it.each(['boyle', 'charles', 'gay-lussac', 'avogadro'])(
    'flies the %s level on its own law, all the way through',
    (level) => {
      let s = startLevel('general', level, 5);
      expect(gasLeg(s).law).toBe(level);
      for (let i = 0; i < s.legs; i++) {
        s = arrive(fly(s, rightAnswer(gasLeg(s))));
        expect(s.phase).toBe('landed');
        s = next(s);
      }
      expect(s.phase).toBe('done');
    },
  );
});

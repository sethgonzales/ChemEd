import { REACTIONS } from '~/constants/reactions';
import { formatFormula } from './lewis';
import { PREDICT_POOL, predict } from './predict';
import { createRng } from './quest';
import {
  netIonicQuestion,
  precipitateQuestion,
  typeQuestion,
  reactionRooms,
} from './quest-reactions';
import { classify } from './reaction-types';
import { parseEquation } from './reactions';

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const capital = (s: string) => s[0].toUpperCase() + s.slice(1);

describe('Chemical Reactions questions', () => {
  it('sort an equation into its type', () => {
    for (const seed of SEEDS) {
      const q = typeQuestion(createRng(seed));
      const r = REACTIONS.find((x) => x.name === q.about)!;
      expect(q.choices[q.answer]).toBe(
        capital(classify(parseEquation(r.equation))),
      );
    }
  });

  it('pick out the precipitate, and only it, when two solutions mix', () => {
    for (const seed of SEEDS) {
      const q = precipitateQuestion(createRng(seed));
      const { products } = predict(q.pair);
      const solids = products!
        .filter((p) => p.state === 's')
        .map((p) => formatFormula(p.formula));
      expect(solids).toEqual([q.choices[q.answer]]);
    }
  });

  it('pick out the net ionic equation', () => {
    for (const seed of SEEDS) {
      const q = netIonicQuestion(createRng(seed));
      const p = predict(q.pair);
      expect(q.choices[q.answer]).toBe(p.netIonic);
      expect(q.choices.filter((c) => c === p.netIonic)).toHaveLength(1);
    }
  });

  it('never asks about an acid precipitating (phosphoric acid is soluble)', () => {
    for (const seed of SEEDS) {
      for (const q of [
        precipitateQuestion(createRng(seed)),
        netIonicQuestion(createRng(seed)),
      ]) {
        const solids = predict(q.pair).products!.filter((p) => p.state === 's');
        for (const s of solids) expect(s.formula).not.toMatch(/^H\d?[A-Z(]/);
      }
    }
  });
});

describe('the Slime’s rooms', () => {
  it('deal two different pairs, the first always one that reacts', () => {
    const seen = new Set<number>();
    for (const seed of SEEDS) {
      const [a, b] = reactionRooms(createRng(seed));
      expect(a).not.toBe(b);
      expect(predict(PREDICT_POOL[a]).products).not.toBeNull();
      seen.add(a);
    }
    expect(seen.size).toBeGreaterThan(10);
  });
});

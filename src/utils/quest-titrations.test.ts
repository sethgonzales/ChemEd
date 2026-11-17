import { ANALYTES, INDICATORS } from '~/constants/titrations';
import { createRng } from './quest';
import {
  concentrationQuestion,
  equivalenceQuestion,
  halfwayQuestion,
  strengthQuestion,
  indicatorQuestion,
  titrationPool,
} from './quest-titrations';
import { equivalenceVolumes, phAfter } from './titrations';

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const analyte = (about: string) => ANALYTES.find((a) => a.name === about)!;
const eqPh = (about: string) => {
  const a = analyte(about);
  return phAfter(a, 0.1, equivalenceVolumes(a, 0.1)[0].volume);
};

describe('Titration questions', () => {
  it('say which side of 7 the equivalence point falls', () => {
    for (const seed of SEEDS) {
      const q = equivalenceQuestion(createRng(seed));
      const pH = eqPh(q.about);
      const side = pH > 7.5 ? 'Above 7' : pH < 6.5 ? 'Below 7' : 'About 7';
      expect(q.choices[q.answer]).toBe(side);
    }
  });

  it('pick the one indicator whose colour change spans the equivalence pH', () => {
    for (const seed of SEEDS) {
      const q = indicatorQuestion(createRng(seed));
      const pH = eqPh(q.about);
      q.choices.forEach((name, i) => {
        const ind = INDICATORS.find((x) => x.name === name)!;
        expect(ind.low <= pH && pH <= ind.high).toBe(i === q.answer);
      });
    }
  });

  it('work out a concentration from the burette reading, 1 : 1', () => {
    for (const seed of SEEDS) {
      const q = concentrationQuestion(createRng(seed));
      const volume = Number(/needs ([\d.]+) mL/.exec(q.prompt)![1]);
      expect(q.choices[q.answer]).toBe(
        `${((0.1 * volume) / 25).toPrecision(3)} M`,
      );
    }
  });

  it('give pKa as the pH halfway to equivalence, as the model does', () => {
    for (const seed of SEEDS) {
      const q = halfwayQuestion(createRng(seed));
      const a = analyte(q.about);
      const half = equivalenceVolumes(a, 0.1)[0].volume / 2;
      expect(q.choices[q.answer]).toBe(a.pKas[0].toFixed(2));
      expect(Math.abs(phAfter(a, 0.1, half) - a.pKas[0])).toBeLessThan(0.1);
    }
  });

  it('ask whether an acid or base is strong or weak, by whether it has a pKa', () => {
    for (const seed of SEEDS) {
      const q = strengthQuestion(createRng(seed));
      const a = analyte(q.about);
      expect(q.choices[q.answer]).toBe(
        `${a.pKas.length ? 'Weak' : 'Strong'} ${a.kind}`,
      );
    }
  });
});

describe('the Hydra’s rooms', () => {
  it('titrate strong acids and bases in General Chemistry, weak ones in AP', () => {
    const general = titrationPool('general');
    const ap = titrationPool('ap');
    expect(general.length).toBeGreaterThan(1);
    expect(ap.length).toBeGreaterThan(1);
    for (const a of [...general, ...ap]) expect(a.protons).toBe(1);
    for (const a of general) expect(a.pKas).toHaveLength(0);
    for (const a of ap) expect(a.pKas.length).toBeGreaterThan(0);
  });
});

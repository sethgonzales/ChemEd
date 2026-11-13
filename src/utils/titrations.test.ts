import { ANALYTES, INDICATORS } from '~/constants/titrations';
import {
  addTitrant,
  checkAnswer,
  concentrationFrom,
  curvePoints,
  equivalenceVolumes,
  halfEquivalences,
  indicatorColor,
  indicatorColorName,
  newUnknown,
  phAfter,
  unknownFeedback,
} from './titrations';

const analyte = (id: string) => ANALYTES.find((a) => a.id === id)!;
const indicator = (id: string) => INDICATORS.find((i) => i.id === id)!;
const C = 0.1; // M, the analyte in the flask

describe('phAfter: strong acid with strong base', () => {
  const hcl = analyte('hcl');

  it('starts at pH 1 for 0.100 M HCl', () => {
    expect(phAfter(hcl, C, 0)).toBeCloseTo(1.0, 2);
  });

  it('is neutral at the equivalence point', () => {
    expect(phAfter(hcl, C, 25)).toBeCloseTo(7.0, 2);
  });

  it('is set by the excess base past it', () => {
    // 2.5 mmol OH⁻ in 75 mL: pOH = 1.48
    expect(phAfter(hcl, C, 50)).toBeCloseTo(12.52, 2);
  });
});

describe('phAfter: weak acid with strong base', () => {
  const acetic = analyte('acetic');

  it('starts well above a strong acid at the same concentration', () => {
    expect(phAfter(acetic, C, 0)).toBeCloseTo(2.88, 1);
  });

  it('equals the pKa at half-equivalence', () => {
    expect(phAfter(acetic, C, 12.5)).toBeCloseTo(4.756, 1);
  });

  it('is basic at the equivalence point', () => {
    expect(phAfter(acetic, C, 25)).toBeCloseTo(8.72, 1);
  });
});

describe('phAfter: bases titrated with HCl', () => {
  it('takes NaOH from pH 13 to 7 at equivalence', () => {
    expect(phAfter(analyte('naoh'), C, 0)).toBeCloseTo(13.0, 2);
    expect(phAfter(analyte('naoh'), C, 25)).toBeCloseTo(7.0, 2);
  });

  it('takes ammonia through pKa 9.24 to an acidic equivalence point', () => {
    const nh3 = analyte('ammonia');
    expect(phAfter(nh3, C, 0)).toBeCloseTo(11.12, 1);
    expect(phAfter(nh3, C, 12.5)).toBeCloseTo(9.24, 1);
    expect(phAfter(nh3, C, 25)).toBeCloseTo(5.28, 1);
  });
});

describe('phAfter: phosphoric acid', () => {
  it('equals pKa₂ halfway between the first two equivalence points', () => {
    expect(phAfter(analyte('phosphoric'), C, 37.5)).toBeCloseTo(7.2, 1);
  });
});

describe('phAfter: every analyte', () => {
  it.each(ANALYTES.map((a) => [a.name, a]))(
    'moves %s steadily one way as titrant goes in',
    (_, a) => {
      const sign = a.kind === 'acid' ? 1 : -1;
      let last = phAfter(a, C, 0);
      for (let v = 0.5; v <= 90; v += 0.5) {
        const ph = phAfter(a, C, v);
        expect(sign * (ph - last)).toBeGreaterThanOrEqual(-1e-9);
        last = ph;
      }
    },
  );
});

describe('equivalenceVolumes', () => {
  it('needs one volume of titrant per proton', () => {
    expect(equivalenceVolumes(analyte('hcl'), C).map((e) => e.volume)).toEqual([
      25,
    ]);
    expect(
      equivalenceVolumes(analyte('phosphoric'), 0.05).map((e) => e.volume),
    ).toEqual([12.5, 25, 37.5]);
  });

  it('flags phosphoric acid’s third proton as too weak to show a jump', () => {
    expect(
      equivalenceVolumes(analyte('phosphoric'), C).map((e) => e.visible),
    ).toEqual([true, true, false]);
    for (const id of ['hcl', 'acetic', 'naoh', 'ammonia']) {
      expect(equivalenceVolumes(analyte(id), C)[0].visible).toBe(true);
    }
  });
});

describe('indicatorColor', () => {
  const rgba = (css: string) => css.match(/[\d.]+/g)!.map(Number);

  it('shows the low colour below the range and the high colour above it', () => {
    const mo = indicator('methyl-orange');
    expect(indicatorColor(mo, 2)).toBe(indicatorColor(mo, 3.1));
    expect(indicatorColor(mo, 6)).toBe(indicatorColor(mo, 4.4));
    expect(indicatorColor(mo, 2)).not.toBe(indicatorColor(mo, 6));
  });

  it('keeps phenolphthalein colourless in acid and pink in base', () => {
    const php = indicator('phenolphthalein');
    expect(rgba(indicatorColor(php, 7))[3]).toBe(0);
    const [r, g, b, a] = rgba(indicatorColor(php, 11));
    expect(a).toBeGreaterThan(0.5);
    expect(r).toBeGreaterThan(g);
    expect(b).toBeGreaterThan(g);
  });

  it('turns bromothymol blue green in the middle of its range', () => {
    const [r, g, b] = rgba(indicatorColor(indicator('bromothymol-blue'), 6.8));
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
  });
});

describe('checkAnswer', () => {
  it('accepts answers within 2% of the true concentration', () => {
    expect(checkAnswer(0.1, 0.1)).toBe(true);
    expect(checkAnswer(0.1019, 0.1)).toBe(true);
    expect(checkAnswer(0.0981, 0.1)).toBe(true);
    expect(checkAnswer(0.103, 0.1)).toBe(false);
    expect(checkAnswer(Number.NaN, 0.1)).toBe(false);
  });
});

describe('indicatorColorName', () => {
  it('names the colour the flask shows', () => {
    const php = indicator('phenolphthalein');
    expect(indicatorColorName(php, 7)).toBe('colourless');
    expect(indicatorColorName(php, 9)).toBe('pale pink');
    expect(indicatorColorName(php, 11)).toBe('pink');
    const btb = indicator('bromothymol-blue');
    expect(indicatorColorName(btb, 5)).toBe('yellow');
    expect(indicatorColorName(btb, 6.8)).toBe('green');
    expect(indicatorColorName(btb, 9)).toBe('blue');
  });
});

describe('addTitrant', () => {
  it('adds to the volume, to the nearest 0.01 mL', () => {
    expect(addTitrant(0, 0.05)).toBe(0.05);
    expect(addTitrant(0.1, 0.2)).toBe(0.3); // not 0.30000000000000004
  });

  it('stops when the burette is empty', () => {
    expect(addTitrant(49.5, 1)).toBe(50);
    expect(addTitrant(50, 0.05)).toBe(50);
  });
});

describe('curvePoints', () => {
  it('plots pH every 0.1 mL from the start to the volume added so far', () => {
    const points = curvePoints(analyte('hcl'), C, 2.05);
    expect(points[0]).toEqual({ volume: 0, pH: phAfter(analyte('hcl'), C, 0) });
    expect(points[1].volume).toBeCloseTo(0.1);
    expect(points[points.length - 1].volume).toBe(2.05); // ends where we are
    expect(points).toHaveLength(22);
  });

  it('is a single point before any titrant goes in', () => {
    expect(curvePoints(analyte('hcl'), C, 0)).toHaveLength(1);
  });
});

describe('halfEquivalences', () => {
  const half = (id: string, c: number) =>
    halfEquivalences(analyte(id), c).map(({ volume, pKa }) => [volume, pKa]);

  it('marks where pH = pKa for weak acids and bases', () => {
    expect(half('acetic', C)).toEqual([[12.5, 4.756]]);
    expect(half('ammonia', C)).toEqual([[12.5, 9.24]]);
  });

  it('has none for strong acids and bases', () => {
    expect(half('hcl', C)).toEqual([]);
    expect(half('naoh', C)).toEqual([]);
  });

  it('skips phosphoric acid’s first and third protons, where pH isn’t the pKa', () => {
    // the first is too strong (pH 2.3, not 2.14) and the third too weak
    expect(half('phosphoric', 0.05)).toEqual([[18.75, 7.2]]);
  });
});

describe('newUnknown', () => {
  it('picks a monoprotic analyte at 0.050–0.150 M, to three decimals', () => {
    const rolls = [0.3, 0.37]; // second analyte; 0.05 + 0.37 × 0.1
    const unknown = newUnknown(() => rolls.shift()!);
    expect(unknown.analyte.id).toBe('acetic');
    expect(unknown.concentration).toBe(0.087);
  });

  it('never picks phosphoric acid, and stays in range', () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      const { analyte: a, concentration } = newUnknown(() => r);
      expect(a.protons).toBe(1);
      expect(concentration).toBeGreaterThanOrEqual(0.05);
      expect(concentration).toBeLessThanOrEqual(0.15);
    }
  });
});

describe('unknownFeedback', () => {
  // 0.0870 M: equivalence at 21.75 mL of 0.100 M titrant
  const actual = 0.087;

  it('is correct within 2%', () => {
    expect(unknownFeedback(0.0871, 21.75, actual)).toBe('correct');
  });

  it('blames the endpoint when the maths fits a reading taken too early or late', () => {
    // 15.00 mL → 0.100 × 15.00 ÷ 25.00 = 0.0600 M
    expect(unknownFeedback(0.06, 15, actual)).toBe('early');
    expect(unknownFeedback(0.12, 30, actual)).toBe('late');
  });

  it('blames the calculation when the answer doesn’t fit the reading', () => {
    expect(unknownFeedback(0.5, 21.75, actual)).toBe('calculation');
  });

  it('works the concentration out from a burette reading', () => {
    expect(concentrationFrom(21.75)).toBeCloseTo(0.087, 6);
  });
});

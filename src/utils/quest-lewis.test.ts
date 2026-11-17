import { MOLECULES } from '~/constants/molecules';
import {
  formalCharge,
  formatFormula,
  fromAnswer,
  totalValenceElectrons,
} from './lewis';
import { createRng } from './quest';
import {
  LEWIS_LEVELS,
  bondingPairsQuestion,
  centralLonePairsQuestion,
  formalChargeQuestion,
  lewisQuestion,
  lewisRooms,
  questMolecules,
  sigmaPiQuestion,
  totalLonePairsQuestion,
  totalElectronsQuestion,
} from './quest-lewis';

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const molecule = (about: string) => MOLECULES.find((m) => m.name === about)!;
const ids = (level: number) => questMolecules(level).map((m) => m.id);
const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

describe('the Lewis levels', () => {
  it('start both courses on single bonds; AP goes two levels further', () => {
    expect(LEWIS_LEVELS.general).toEqual([1, 3]);
    expect(LEWIS_LEVELS.ap).toEqual([1, 5]);
  });

  it('build up from single bonds to multiple bonds to polyatomic ions', () => {
    expect(ids(1)).toContain('methane');
    expect(questMolecules(1).every((m) => m.level === 1)).toBe(true);
    expect(ids(2)).toEqual(
      expect.arrayContaining(['nitrogen', 'carbon-dioxide']),
    );
    // both courses meet charged polyatomic ions
    expect(ids(3)).toEqual(
      expect.arrayContaining(['ammonium', 'nitrate', 'carbonate', 'sulfate']),
    );
    expect(
      questMolecules(3).every(
        (m) => m.charge !== 0 || m.id === 'carbon-monoxide',
      ),
    ).toBe(true);
  });

  it('mixes easier molecules into AP’s levels', () => {
    expect(ids(4)).toEqual(
      expect.arrayContaining(['water', 'nitrogen', 'nitrate']),
    );
    expect(ids(5)).toEqual(
      expect.arrayContaining(['methane', 'sulfur-hexafluoride']),
    );
  });
});

describe('Lewis Structure questions', () => {
  it('count the valence electrons, charge included', () => {
    for (const level of [1, 3])
      for (const seed of SEEDS) {
        const q = totalElectronsQuestion(createRng(seed), level);
        const m = molecule(q.about);
        expect(ids(level)).toContain(m.id);
        expect(q.prompt).toContain(formatFormula(m.formula, m.charge));
        expect(q.choices[q.answer]).toBe(
          String(totalValenceElectrons(m.formula, m.charge)),
        );
      }
  });

  it('ask for the central atom’s lone pairs, only where every best structure agrees', () => {
    for (const seed of SEEDS) {
      const q = centralLonePairsQuestion(createRng(seed), 2);
      const m = molecule(q.about);
      const pairs = new Set(m.answers.map((a) => a.lonePairs[0]));
      expect(pairs.size).toBe(1);
      expect(m.skeleton.bonds.every(([a]) => a === 0)).toBe(true);
      expect(q.choices[q.answer]).toBe(String([...pairs][0]));
    }
  });

  it('count shared pairs: a double bond is two', () => {
    for (const seed of SEEDS) {
      const q = bondingPairsQuestion(createRng(seed), 2);
      const m = molecule(q.about);
      expect(q.choices[q.answer]).toBe(String(sum(m.answers[0].orders)));
    }
  });

  it('count every lone pair in the best structure', () => {
    for (const seed of SEEDS) {
      const q = totalLonePairsQuestion(createRng(seed), 1);
      const m = molecule(q.about);
      expect(q.choices[q.answer]).toBe(String(sum(m.answers[0].lonePairs)));
    }
  });

  it('ask about molecules from the level it’s given', () => {
    for (const level of [1, 2, 3, 4, 5])
      for (const seed of SEEDS) {
        const q = lewisQuestion(createRng(seed), level);
        expect(ids(level)).toContain(molecule(q.about).id);
      }
  });
});

describe('AP questions', () => {
  it('count σ and π bonds: every bond has one σ, and each extra pair is a π', () => {
    for (const level of [4, 5])
      for (const seed of SEEDS) {
        const q = sigmaPiQuestion(createRng(seed), level);
        const m = molecule(q.about);
        const { orders } = m.answers[0];
        const pi = sum(orders.map((o) => o - 1));
        expect(q.choices[q.answer]).toBe(`${orders.length} σ, ${pi} π`);
        expect(new Set(q.choices).size).toBe(q.choices.length);
      }
  });

  it('find the central atom’s formal charge in the best structure', () => {
    const sign = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
    for (const level of [4, 5])
      for (const seed of SEEDS) {
        const q = formalChargeQuestion(createRng(seed), level);
        const m = molecule(q.about);
        const s = fromAnswer(m.skeleton, m.answers[0]);
        expect(q.choices[q.answer]).toBe(sign(formalCharge(s, s.atoms[0].id)));
      }
  });

  it('don’t make 0 the usual formal charge, so it can’t just be guessed', () => {
    const zero = SEEDS.filter((seed) => {
      const q = formalChargeQuestion(createRng(seed), 5);
      return q.choices[q.answer] === '0';
    }).length;
    expect(zero / SEEDS.length).toBeLessThan(0.6);
  });

  it('say “its one bond”, not “each of the 1 bond”', () => {
    for (const seed of SEEDS)
      expect(sigmaPiQuestion(createRng(seed), 4).explain).not.toMatch(
        /of the 1 bond/,
      );
  });

  it('are AP’s alone: its top levels ask them, the shared levels never do', () => {
    const asked = (level: number) =>
      new Set(
        SEEDS.map((seed) =>
          /σ|formal charge/.test(lewisQuestion(createRng(seed), level).prompt),
        ),
      );
    for (const level of [1, 2, 3])
      expect(asked(level)).toEqual(new Set([false]));
    for (const level of [4, 5]) expect(asked(level)).toEqual(new Set([true]));
  });
});

describe('the Weaver’s rooms', () => {
  it.each(['general', 'ap'] as const)(
    'ask the %s course to draw two different molecules, each with one best structure',
    (course) => {
      const seen = new Set<string>();
      for (const seed of SEEDS) {
        const rooms = lewisRooms(createRng(seed), course);
        expect(rooms).toHaveLength(2);
        expect(rooms[0].id).not.toBe(rooms[1].id);
        // no resonance forms to draw in a quick room
        for (const m of rooms) expect(m.answers).toHaveLength(1);
        rooms.forEach((m) => seen.add(m.id));
      }
      expect(seen.size).toBeGreaterThan(5);
    },
  );

  it('give General Chemistry multiple bonds and ions to draw, never octet exceptions', () => {
    const seen = SEEDS.flatMap((seed) =>
      lewisRooms(createRng(seed), 'general'),
    );
    expect(seen.some((m) => m.answers[0].orders.some((o) => o > 1))).toBe(true);
    expect(seen.some((m) => m.charge !== 0)).toBe(true);
    expect(seen.every((m) => m.level <= 3)).toBe(true);
  });

  it('end AP on a structure where formal charge or an expanded octet matters', () => {
    for (const seed of SEEDS) {
      const [, last] = lewisRooms(createRng(seed), 'ap');
      expect(last.level).toBeGreaterThanOrEqual(3);
    }
  });
});

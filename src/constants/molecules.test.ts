import {
  bestStructures,
  checkStructure,
  electronCount,
  fromAnswer,
  netCharge,
  validStructures,
  type Answer,
} from '~/utils/lewis';
import { MOLECULES } from './molecules';

// Compares answers by atom index, so resonance forms count as different
const key = (a: Answer) =>
  JSON.stringify([
    a.lonePairs,
    a.orders,
    a.radicals ?? a.lonePairs.map(() => 0),
  ]);

const keyOf = (s: ReturnType<typeof fromAnswer>) =>
  key({
    lonePairs: s.atoms.map((a) => a.lonePairs),
    orders: s.bonds.map((b) => b.order),
    radicals: s.atoms.map((a) => a.radicals),
  });

describe('MOLECULES', () => {
  it('has unique ids and molecules at every level', () => {
    expect(new Set(MOLECULES.map((m) => m.id)).size).toBe(MOLECULES.length);
    for (const level of [1, 2, 3, 4, 5]) {
      expect(MOLECULES.some((m) => m.level === level)).toBe(true);
    }
  });

  it('covers the AP and college topics', () => {
    const structures = MOLECULES.map((m) =>
      fromAnswer(m.skeleton, m.answers[0]),
    );
    // resonance
    expect(MOLECULES.some((m) => m.answers.length > 1)).toBe(true);
    // expanded octets
    expect(
      structures.some((s) => s.atoms.some((a) => electronCount(s, a.id) > 8)),
    ).toBe(true);
    // incomplete octets
    expect(
      structures.some((s) =>
        s.atoms.some((a) => a.symbol !== 'H' && electronCount(s, a.id) < 8),
      ),
    ).toBe(true);
    // radicals
    expect(structures.some((s) => s.atoms.some((a) => a.radicals > 0))).toBe(
      true,
    );
    // ions
    expect(MOLECULES.some((m) => m.charge !== 0)).toBe(true);
  });

  it.each(MOLECULES)('$name: answers fit its skeleton', (m) => {
    for (const a of [...m.answers, ...(m.alsoAccepted ?? [])]) {
      expect(a.lonePairs).toHaveLength(m.skeleton.atoms.length);
      expect(a.orders).toHaveLength(m.skeleton.bonds.length);
    }
  });

  it.each(MOLECULES)('$name: every answer is a valid structure', (m) => {
    for (const a of [...m.answers, ...(m.alsoAccepted ?? [])]) {
      const s = fromAnswer(m.skeleton, a);
      expect(checkStructure(s, m)).toEqual([]);
      expect(netCharge(s)).toBe(m.charge);
    }
  });

  it.each(MOLECULES)('$name: answers are distinct', (m) => {
    const all = [...m.answers, ...(m.alsoAccepted ?? [])].map(key);
    expect(new Set(all).size).toBe(all.length);
  });

  it.each(MOLECULES)(
    '$name: answers are exactly the best structures for its skeleton',
    (m) => {
      const best = bestStructures(validStructures(m.skeleton, m)).map(keyOf);
      expect(new Set(best)).toEqual(new Set(m.answers.map(key)));
    },
  );

  it.each(MOLECULES.filter((m) => m.alsoAccepted))(
    '$name: also-accepted structures are valid but not best, with a note',
    (m) => {
      const valid = new Set(validStructures(m.skeleton, m).map(keyOf));
      const best = new Set(m.answers.map(key));
      for (const a of m.alsoAccepted!) {
        expect(valid).toContain(key(a));
        expect(best).not.toContain(key(a));
      }
      expect(m.note).toBeTruthy();
    },
  );

  it.each([
    ['nitrate', 3],
    ['carbonate', 3],
    ['ozone', 2],
    ['nitrite', 2],
    ['sulfate', 6],
    ['phosphate', 4],
  ])('%s has %i resonance structures', (id, count) => {
    expect(MOLECULES.find((m) => m.id === id)?.answers).toHaveLength(count);
  });
});

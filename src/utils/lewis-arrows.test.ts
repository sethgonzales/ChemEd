import { MOLECULES } from '~/constants/molecules';
import {
  electronsUsed,
  formalCharge,
  fromAnswer,
  netCharge,
  type CurvedArrow,
  type LewisStructure,
  type Molecule,
} from './lewis';
import {
  applyArrows,
  assessDrawing,
  assessResonance,
  sameLabelled,
} from './lewis-arrows';

const molecule = (id: string) => MOLECULES.find((m) => m.id === id)!;

/** An answer with every formal charge marked, and brackets for ions */
function marked(
  m: Molecule,
  answer: number,
  set: 'answers' | 'alsoAccepted' = 'answers',
) {
  const s = fromAnswer(m.skeleton, m[set]![answer]);
  const charge = netCharge(s);
  return {
    ...s,
    atoms: s.atoms.map((a) => {
      const fc = formalCharge(s, a.id);
      return fc ? { ...a, marks: { charge: fc } } : a;
    }),
    ...(charge ? { bracket: { charge } } : {}),
  };
}

const withArrows = (s: LewisStructure, arrows: CurvedArrow[]) => ({
  ...s,
  arrows,
});

// Ozone forms: atom 0 is the central O.
// Form 0 has O0=O1 (O1: 2 pairs) and O0–O2 (O2: 3 pairs); form 1 the reverse.
const ozone = molecule('ozone');
const ozoneArrows: CurvedArrow[] = [
  { from: { kind: 'lonePair', atom: 2 }, to: { kind: 'bond', a: 0, b: 2 } },
  { from: { kind: 'bond', a: 0, b: 1 }, to: { kind: 'atom', id: 1 } },
];

describe('sameLabelled', () => {
  it('tells resonance forms apart even though they have the same shape', () => {
    const a = fromAnswer(ozone.skeleton, ozone.answers[0]);
    const b = fromAnswer(ozone.skeleton, ozone.answers[1]);
    expect(sameLabelled(a, a)).toBe(true);
    expect(sameLabelled(a, b)).toBe(false);
  });

  it('ignores positions, marks and arrows', () => {
    const a = fromAnswer(ozone.skeleton, ozone.answers[0]);
    const moved = {
      ...a,
      atoms: a.atoms.map((x) => ({ ...x, x: x.x + 3, marks: { charge: 1 } })),
      arrows: ozoneArrows,
    };
    expect(sameLabelled(a, moved)).toBe(true);
  });
});

describe('applyArrows', () => {
  it('turns one ozone resonance form into the other', () => {
    const from = fromAnswer(ozone.skeleton, ozone.answers[0]);
    const { structure, problems } = applyArrows(from, ozoneArrows);
    expect(problems).toEqual([]);
    expect(
      sameLabelled(structure, fromAnswer(ozone.skeleton, ozone.answers[1])),
    ).toBe(true);
    expect(electronsUsed(structure)).toBe(electronsUsed(from));
  });

  it('moves a double bond around nitrate', () => {
    const nitrate = molecule('nitrate');
    // form 0: N=O1; form 1: N=O2
    const { structure, problems } = applyArrows(
      fromAnswer(nitrate.skeleton, nitrate.answers[0]),
      [
        {
          from: { kind: 'lonePair', atom: 2 },
          to: { kind: 'bond', a: 0, b: 2 },
        },
        { from: { kind: 'bond', a: 0, b: 1 }, to: { kind: 'atom', id: 1 } },
      ],
    );
    expect(problems).toEqual([]);
    expect(
      sameLabelled(structure, fromAnswer(nitrate.skeleton, nitrate.answers[1])),
    ).toBe(true);
  });

  it('shifts a bond order to a neighbouring bond', () => {
    const s = fromAnswer(ozone.skeleton, ozone.answers[0]);
    const { structure } = applyArrows(s, [
      { from: { kind: 'bond', a: 0, b: 1 }, to: { kind: 'bond', a: 0, b: 2 } },
    ]);
    expect(structure.bonds.map((b) => b.order)).toEqual([1, 2]);
  });

  it('reports arrows that can’t move electrons, and skips them', () => {
    const s = fromAnswer(ozone.skeleton, ozone.answers[0]);
    const nitrogen = fromAnswer(
      molecule('nitrogen').skeleton,
      molecule('nitrogen').answers[0],
    );
    const cases: [LewisStructure, CurvedArrow, string][] = [
      [
        fromAnswer(
          molecule('methane').skeleton,
          molecule('methane').answers[0],
        ),
        {
          from: { kind: 'lonePair', atom: 0 },
          to: { kind: 'bond', a: 0, b: 1 },
        },
        'C has no lone pair to move.',
      ],
      [
        s,
        {
          from: { kind: 'lonePair', atom: 1 },
          to: { kind: 'bond', a: 0, b: 2 },
        },
        "A lone pair on O can only move into one of that atom's bonds.",
      ],
      [
        nitrogen,
        {
          from: { kind: 'lonePair', atom: 0 },
          to: { kind: 'bond', a: 0, b: 1 },
        },
        'N–N is already a triple bond.',
      ],
      [
        s,
        { from: { kind: 'bond', a: 0, b: 1 }, to: { kind: 'atom', id: 2 } },
        "Electrons from the O–O bond can only move onto one of that bond's atoms.",
      ],
    ];
    for (const [structure, arrow, message] of cases) {
      const result = applyArrows(structure, [arrow]);
      expect(result.problems).toEqual([message]);
      expect(sameLabelled(result.structure, structure)).toBe(true);
    }
  });
});

describe('assessResonance', () => {
  const nitrate = molecule('nitrate');
  const forms = [0, 1, 2].map((i) => marked(nitrate, i));
  const messages = (r: ReturnType<typeof assessResonance>) =>
    r.feedback.map((f) => f.message);

  it('celebrates every resonance form found', () => {
    const result = assessResonance(forms, nitrate);
    expect(result.verdict).toBe('best');
    expect(messages(result)).toContain(
      'Correct! All 3 resonance structures found.',
    );
  });

  it('counts how many forms are still missing', () => {
    const result = assessResonance(forms.slice(0, 2), nitrate);
    expect(result.verdict).toBe('valid');
    expect(messages(result)).toContain(
      "You've found 2 of 3 resonance structures.",
    );
  });

  it('points out repeated forms', () => {
    const result = assessResonance([forms[0], forms[1], forms[0]], nitrate);
    expect(result.verdict).toBe('valid');
    expect(messages(result)).toContain('Forms 1 and 3 are the same structure.');
  });

  it('labels problems with the form they belong to', () => {
    const broken = {
      ...forms[1],
      atoms: forms[1].atoms.map((a) => ({ ...a, lonePairs: 0 })),
    };
    const result = assessResonance([forms[0], broken], nitrate);
    expect(result.verdict).toBe('invalid');
    expect(messages(result).some((m) => m.startsWith('Form 2: '))).toBe(true);
  });

  it('accepts arrows that lead to the next form', () => {
    const o = [0, 1].map((i) => marked(ozone, i));
    const result = assessResonance(
      [withArrows(o[0], ozoneArrows), o[1]],
      ozone,
    );
    expect(result.verdict).toBe('best');
  });

  it('flags arrows that don’t lead to the next form', () => {
    const o = [0, 1].map((i) => marked(ozone, i));
    const wrong: CurvedArrow[] = [
      { from: { kind: 'lonePair', atom: 2 }, to: { kind: 'bond', a: 0, b: 2 } },
    ];
    const result = assessResonance([withArrows(o[0], wrong), o[1]], ozone);
    expect(result.verdict).toBe('valid');
    expect(messages(result)).toContain(
      "Your arrows on form 1 don't lead to form 2.",
    );
  });

  it('treats a single form like a single structure', () => {
    const water = molecule('water');
    expect(assessResonance([marked(water, 0)], water).verdict).toBe('best');
  });

  it('counts octet-rule forms against the accepted set', () => {
    const so2 = molecule('sulfur-dioxide');
    const result = assessResonance(
      [marked(so2, 0, 'alsoAccepted'), marked(so2, 1, 'alsoAccepted')],
      so2,
    );
    expect(result.verdict).toBe('accepted');
    expect(messages(result)).toContain(so2.note);
    expect(messages(result)).toContain('All 2 resonance structures found.');
  });

  it('accepts a mix of expanded-octet and octet-rule forms', () => {
    const so2 = molecule('sulfur-dioxide');
    const result = assessResonance(
      [
        marked(so2, 0),
        marked(so2, 0, 'alsoAccepted'),
        marked(so2, 1, 'alsoAccepted'),
      ],
      so2,
    );
    expect(result.verdict).toBe('accepted');
    expect(messages(result)).toContain('All 3 resonance structures found.');
  });
});

describe('assessDrawing', () => {
  const messages = (r: ReturnType<typeof assessDrawing>) =>
    r.feedback.map((f) => f.message);

  it('says a valid drawing looks good', () => {
    const result = assessDrawing([marked(molecule('water'), 0)]);
    expect(result.verdict).toBe('best');
    expect(messages(result)).toEqual([
      'Looks good! Every atom has a full shell and the charges are marked.',
    ]);
  });

  it('passes on problems with the drawing', () => {
    const result = assessDrawing([
      fromAnswer(molecule('water').skeleton, {
        lonePairs: [0, 0, 0],
        orders: [1, 1],
      }),
    ]);
    expect(result.verdict).toBe('invalid');
  });

  it('checks arrows between several forms', () => {
    const o = [0, 1].map((i) => marked(ozone, i));
    expect(assessDrawing([withArrows(o[0], ozoneArrows), o[1]]).verdict).toBe(
      'best',
    );
    const wrong = assessDrawing([withArrows(o[0], [ozoneArrows[0]]), o[1]]);
    expect(wrong.verdict).toBe('valid');
    expect(messages(wrong)).toContain(
      "Your arrows on form 1 don't lead to form 2.",
    );
  });

  it('labels each form’s problems', () => {
    const o = marked(ozone, 0);
    const broken = {
      ...o,
      atoms: o.atoms.map((a) => ({ ...a, lonePairs: 0 })),
    };
    const result = assessDrawing([o, broken]);
    expect(messages(result).some((m) => m.startsWith('Form 2: '))).toBe(true);
  });
});

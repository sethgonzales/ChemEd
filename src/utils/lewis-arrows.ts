import {
  assessStructure,
  checkDrawing,
  type BondOrder,
  type CurvedArrow,
  type Feedback,
  type LewisStructure,
  type Molecule,
  type Verdict,
} from './lewis';

const pairKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

/**
 * Same atoms (by id) with the same electrons and bond orders. Unlike
 * sameStructure, resonance forms with equivalent shapes count as different.
 */
export function sameLabelled(a: LewisStructure, b: LewisStructure) {
  const atomKey = (s: LewisStructure) =>
    s.atoms
      .map((x) => `${x.id}:${x.symbol}:${x.lonePairs}:${x.radicals}`)
      .sort()
      .join('|');
  const bondKey = (s: LewisStructure) =>
    s.bonds
      .map((x) => `${pairKey(x.a, x.b)}:${x.order}`)
      .sort()
      .join('|');
  return atomKey(a) === atomKey(b) && bondKey(a) === bondKey(b);
}

/**
 * Pushes electrons along curved arrows, in order. Arrows that can't move
 * electrons are skipped and explained.
 */
export function applyArrows(
  s: LewisStructure,
  arrows: CurvedArrow[],
): { structure: LewisStructure; problems: string[] } {
  const atoms = s.atoms.map((a) => ({ ...a }));
  let bonds = s.bonds.map((b) => ({ ...b }));
  const problems: string[] = [];

  const atom = (id: number) => atoms.find((a) => a.id === id)!;
  const bond = (a: number, b: number) =>
    bonds.find((x) => pairKey(x.a, x.b) === pairKey(a, b));
  const name = (a: number, b: number) => `${atom(a).symbol}–${atom(b).symbol}`;

  // one more shared pair between x and y; false if already triple
  const strengthen = (x: number, y: number) => {
    const existing = bond(x, y);
    if (!existing) {
      bonds.push({ a: x, b: y, order: 1 });
      return true;
    }
    if (existing.order === 3) {
      problems.push(`${name(x, y)} is already a triple bond.`);
      return false;
    }
    existing.order = (existing.order + 1) as BondOrder;
    return true;
  };
  const weaken = (x: number, y: number) => {
    const existing = bond(x, y)!;
    if (existing.order === 1) {
      bonds = bonds.filter((b) => b !== existing);
    } else {
      existing.order = (existing.order - 1) as BondOrder;
    }
  };

  for (const { from, to } of arrows) {
    if (from.kind === 'lonePair') {
      const source = atom(from.atom);
      if (source.lonePairs < 1) {
        problems.push(`${source.symbol} has no lone pair to move.`);
        continue;
      }
      // the pair becomes a bond between its atom and the target
      const partner =
        to.kind === 'atom'
          ? to.id
          : to.a === from.atom
            ? to.b
            : to.b === from.atom
              ? to.a
              : null;
      if (partner === null || partner === from.atom) {
        problems.push(
          `A lone pair on ${source.symbol} can only move into one of that atom's bonds.`,
        );
        continue;
      }
      if (strengthen(from.atom, partner)) source.lonePairs -= 1;
      continue;
    }

    if (!bond(from.a, from.b)) continue;
    if (to.kind === 'atom') {
      if (to.id !== from.a && to.id !== from.b) {
        problems.push(
          `Electrons from the ${name(from.a, from.b)} bond can only move onto one of that bond's atoms.`,
        );
        continue;
      }
      weaken(from.a, from.b);
      atom(to.id).lonePairs += 1;
      continue;
    }
    // bond to a neighbouring bond: the pair slides across the shared atom
    const shared = [from.a, from.b].find((x) => x === to.a || x === to.b);
    if (
      shared === undefined ||
      pairKey(from.a, from.b) === pairKey(to.a, to.b)
    ) {
      problems.push(
        `Electrons from the ${name(from.a, from.b)} bond can only move to a bond next to it.`,
      );
      continue;
    }
    if (strengthen(to.a, to.b)) weaken(from.a, from.b);
  }

  return { structure: { ...s, atoms, bonds }, problems };
}

const prefixed = (i: number, message: string): Feedback => ({
  kind: 'resonance',
  message: `Form ${i + 1}: ${message}`,
});

/** Each form's arrows must turn it into the next form. */
function checkArrows(forms: LewisStructure[]): Feedback[] {
  const feedback: Feedback[] = [];
  forms.forEach((form, i) => {
    if (!form.arrows?.length) return;
    const next = forms[i + 1];
    if (!next) {
      feedback.push(
        prefixed(i, 'arrows on the last form have no form to lead to.'),
      );
      return;
    }
    const { structure, problems } = applyArrows(form, form.arrows);
    problems.forEach((p) => feedback.push(prefixed(i, p)));
    if (problems.length || !sameLabelled(structure, next)) {
      feedback.push({
        kind: 'resonance',
        message: `Your arrows on form ${i + 1} don't lead to form ${i + 2}.`,
      });
    }
  });
  return feedback;
}

/**
 * Grades a set of resonance forms: each must be a correct structure, none
 * repeated, all of them found, and any arrows must lead to the next form.
 */
export function assessResonance(
  forms: LewisStructure[],
  molecule: Molecule,
): { verdict: Verdict; feedback: Feedback[] } {
  if (forms.length === 1) return assessStructure(forms[0], molecule);

  const results = forms.map((f) => assessStructure(f, molecule));

  if (results.some((r) => r.verdict === 'invalid' || r.verdict === 'valid')) {
    return {
      verdict: results.some((r) => r.verdict === 'invalid')
        ? 'invalid'
        : 'valid',
      feedback: results.flatMap((r, i) =>
        r.verdict === 'invalid' || r.verdict === 'valid'
          ? r.feedback.map((f) => prefixed(i, f.message))
          : [],
      ),
    };
  }

  const feedback: Feedback[] = [];
  // forms are all best, all octet-rule (accepted), or a mix of the two;
  // a mix counts against both sets together
  const allBest = results.every((r) => r.verdict === 'best');
  const allAccepted = results.every((r) => r.verdict === 'accepted');
  const accepted = molecule.alsoAccepted?.length ?? 0;
  const total = allBest
    ? molecule.answers.length
    : allAccepted
      ? accepted
      : molecule.answers.length + accepted;

  let repeats = false;
  const unique: LewisStructure[] = [];
  forms.forEach((form, i) => {
    const first = forms.findIndex((other) => sameLabelled(other, form));
    if (first < i) {
      repeats = true;
      feedback.push({
        kind: 'resonance',
        message: `Forms ${first + 1} and ${i + 1} are the same structure.`,
      });
    } else {
      unique.push(form);
    }
  });

  const arrows = checkArrows(forms);
  feedback.push(...arrows);
  const arrowsWrong = arrows.length > 0;

  const complete = unique.length >= total;
  if (!complete) {
    feedback.push({
      kind: 'resonance',
      message: `You've found ${unique.length} of ${total} resonance structures.`,
    });
  }

  if (!complete || repeats || arrowsWrong) {
    return { verdict: 'valid', feedback };
  }
  return !allBest
    ? {
        verdict: 'accepted',
        feedback: [
          ...(molecule.note
            ? [{ kind: 'note' as const, message: molecule.note }]
            : []),
          {
            kind: 'resonance',
            message: `All ${total} resonance structures found.`,
          },
        ],
      }
    : {
        verdict: 'best',
        feedback: [
          {
            kind: 'resonance',
            message: `Correct! All ${total} resonance structures found.`,
          },
        ],
      };
}

/** Grades freely drawn forms: each must be a sound structure, and arrows lead on. */
export function assessDrawing(forms: LewisStructure[]): {
  verdict: Verdict;
  feedback: Feedback[];
} {
  const problems = forms.flatMap((form, i) =>
    checkDrawing(form).map((f) =>
      forms.length === 1 ? f : prefixed(i, f.message),
    ),
  );
  if (problems.length) return { verdict: 'invalid', feedback: problems };

  const arrows = checkArrows(forms);
  if (arrows.length) return { verdict: 'valid', feedback: arrows };

  return {
    verdict: 'best',
    feedback: [
      {
        kind: 'correct',
        message:
          'Looks good! Every atom has a full shell and the charges are marked.',
      },
    ],
  };
}

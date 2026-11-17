// Reaction Balancing's questions for the Dungeon Quest, drawn from the
// balancer's own reactions (REACTIONS) and their levels.

import { REACTIONS, type BalancingReaction } from '~/constants/reactions';
import { formatFormula } from '~/utils/lewis';
import {
  numberChoices,
  pick,
  shuffle,
  type Course,
  type QuickQuestion,
  type Rng,
} from '~/utils/quest';
import {
  elementTally,
  isBalanced,
  parseCompound,
  parseEquation,
  type Reaction,
} from '~/utils/reactions';

// Which balancer levels each course plays: General Chemistry synthesis,
// decomposition and combustion; AP on through replacement and redox
export const BALANCING_LEVELS: Record<Course, [number, number]> = {
  general: [1, 2],
  ap: [2, 4],
};

/** 'CH₄ + 2 O₂ → CO₂ + 2 H₂O'; a null coefficient is a blank to fill */
export function writeEquation(
  r: Reaction,
  coefficients: (number | null)[],
): string {
  const term = (formula: string, i: number) => {
    const c = coefficients[i];
    const lead = c === null ? '__ ' : c === 1 ? '' : `${c} `;
    return lead + formatFormula(formula);
  };
  const reactants = r.reactants.map(term);
  const products = r.products.map((f, i) => term(f, i + r.reactants.length));
  return `${reactants.join(' + ')} → ${products.join(' + ')}`;
}

// 'C 1 = 1, H 4 = 4, O 4 = 4'
const tallyText = (r: Reaction, coefficients: number[]) =>
  elementTally(r, coefficients)
    .map((t) => `${t.element} ${t.reactants} = ${t.products}`)
    .join(', ');

const atLevel = (level: number) => REACTIONS.filter((r) => r.level === level);

/** A course's rooms, from its easiest level to its hardest, no reaction twice */
export function balancingRooms(
  rng: Rng,
  course: Course,
  rooms: number,
): BalancingReaction[] {
  const [easiest, hardest] = BALANCING_LEVELS[course];
  const chosen: BalancingReaction[] = [];
  for (let i = 0; i < rooms; i++) {
    const level =
      rooms === 1
        ? easiest
        : easiest + Math.round((i * (hardest - easiest)) / (rooms - 1));
    const fresh = atLevel(level).filter((r) => !chosen.includes(r));
    chosen.push(pick(rng, fresh));
  }
  return chosen;
}

/** Fill the blank: which coefficient balances the equation? */
export function blankQuestion(
  r: BalancingReaction,
  rng: Rng,
): QuickQuestion & { blank: number } {
  const eq = parseEquation(r.equation);
  const blank = Math.floor(rng() * r.answer.length);
  const right = r.answer[blank];
  const shown = r.answer.map((c, i) => (i === blank ? null : c));
  return {
    prompt: 'Fill the blank: which coefficient balances the equation?',
    shown: writeEquation(eq, shown),
    about: r.name,
    ...numberChoices(rng, right, [
      right - 1,
      right + 1,
      right + 2,
      right * 2,
      right + 3,
      right + 4,
    ]),
    explain: `It’s ${right}. In ${writeEquation(eq, r.answer)}, every element matches: ${tallyText(eq, r.answer)}.`,
    blank,
  };
}

/** The balanced coefficients and a few near misses, each one off by one */
export function whichOptions(r: BalancingReaction, rng: Rng): number[][] {
  const eq = parseEquation(r.equation);
  const misses = r.answer.flatMap((c, i) =>
    [c - 1, c + 1]
      .filter((n) => n > 0)
      .map((n) => r.answer.map((a, k) => (k === i ? n : a))),
  );
  const wrong = shuffle(
    rng,
    misses.filter((m) => !isBalanced(eq, m)),
  ).slice(0, 3); // three near misses
  return shuffle(rng, [r.answer, ...wrong]);
}

/** Which of these equations is balanced? */
export function whichQuestion(r: BalancingReaction, rng: Rng): QuickQuestion {
  const eq = parseEquation(r.equation);
  const options = whichOptions(r, rng);
  return {
    prompt: 'Which equation is balanced?',
    about: r.name,
    choices: options.map((o) => writeEquation(eq, o)),
    answer: options.indexOf(r.answer),
    explain: `${writeEquation(eq, r.answer)}: every element matches, ${tallyText(eq, r.answer)}.`,
  };
}

/** How many atoms of one element are on each side? */
export function countQuestion(
  r: BalancingReaction,
  rng: Rng,
): QuickQuestion & { element: string } {
  const eq = parseEquation(r.equation);
  const tally = elementTally(eq, r.answer);
  const { element, reactants: right } = pick(rng, tally);
  // the classic slip: counting subscripts and forgetting the coefficients
  const unweighted = elementTally(
    eq,
    r.answer.map(() => 1),
  ).find((t) => t.element === element)!.reactants;
  const terms = eq.reactants.flatMap((f, i) => {
    const n = parseCompound(f)[element];
    const c = r.answer[i];
    return n
      ? [`${c} × ${n} in ${c > 1 ? `${c} ` : ''}${formatFormula(f)}`]
      : [];
  });
  return {
    prompt: `How many ${element} atoms are on each side of the balanced equation?`,
    shown: writeEquation(eq, r.answer),
    about: r.name,
    ...numberChoices(rng, right, [
      unweighted,
      right - 1,
      right + 1,
      right * 2,
      right + 2,
      right + 3,
    ]),
    explain: `Multiply each coefficient by its subscript: ${terms.join(', ')}, ${right} in all, on each side.`,
    element,
  };
}

const KINDS = [blankQuestion, whichQuestion, countQuestion];

/** A boss question about a reaction at this balancer level */
export function balancingQuestion(rng: Rng, level: number): QuickQuestion {
  const r = pick(rng, atLevel(level));
  return pick(rng, KINDS)(r, rng);
}

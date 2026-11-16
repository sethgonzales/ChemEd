import { elementsIn, splitSalt } from './ions';
import { formatFormula } from './lewis';
import {
  check,
  pieces,
  type Prediction,
  type Product,
  type State,
  type Verdict,
} from './predict';
import {
  elementTally,
  isBalanced,
  isLowestTerms,
  parseCompound,
} from './reactions';

export type Typed = { text: string; state?: State };

const PLAIN_DIGITS: Record<string, string> = Object.fromEntries(
  [...'₀₁₂₃₄₅₆₇₈₉'].map((d, i) => [d, String(i)]),
);

/** A typed formula as plain text (Pb(NO3)2), or null if it isn't one */
export function readFormula(text: string) {
  const plain = text
    .replace(/\s+/g, '')
    .replace(/[₀-₉]/g, (d) => PLAIN_DIGITS[d]);
  if (!plain) return null;
  try {
    parseCompound(plain);
    return plain;
  } catch {
    return null;
  }
}

const show = (formula: string) => formatFormula(formula);
const signed = (n: number) => (n > 0 ? `+${n}` : `−${-n}`);
const count = (n: number) => ['', 'one', 'two', 'three'][n] ?? String(n);

/** Why a typed product is wrong, in a way that points without telling */
function hintFor(prediction: Prediction, text: string): string | null {
  const expected = prediction.products!.map((p) => p.formula);
  if (/^\s*\d/.test(text))
    return 'Put the coefficient in the box in front, and write just the formula here.';
  const formula = readFormula(text);
  const plain = text.replace(/\s+/g, '').toLowerCase();
  if (expected.some((f) => f.toLowerCase() === plain && f !== formula))
    return 'Check your capitals: each symbol starts with a capital letter and any second letter is small, like Pb or Cl.';
  if (!formula)
    return `Can’t read “${text.trim()}” as a formula: check the symbols and brackets.`;

  const reactants = prediction.reactants.map((r) => r.formula);
  if (reactants.includes(formula))
    return `${show(formula)} is a reactant. What does it turn into?`;
  const present = new Set(reactants.flatMap(elementsIn));
  const extra = elementsIn(formula).filter((e) => !present.has(e));
  if (extra.length)
    return `There’s no ${extra.join(' or ')} in the reactants: atoms can’t appear from nowhere.`;
  if (formula === 'H' && expected.includes('H2'))
    return 'Hydrogen gas is diatomic: H₂.';
  if (expected.some((f) => f.replace(/[()]/g, '') === formula))
    return 'Put brackets round a polyatomic ion before its subscript, so the subscript counts the whole ion.';

  // the ions of this puzzle, with their charges, to check the total
  const parts = splitSalt(formula);
  const { ions } = pieces(
    prediction.reactants.map((r) => r.formula) as [string, string],
  );
  const cation = ions.find((i) => i.charge > 0 && i.symbol === parts?.symbol);
  const anion = ions.find((i) => i.charge < 0 && i.symbol === parts?.anion);
  if (parts && cation && anion) {
    const total = cation.charge * parts.cations + anion.charge * parts.anions;
    if (total !== 0)
      return `${show(formula)} isn’t neutral: ${count(parts.cations)} ${formatFormula(cation.symbol, cation.charge)} (${signed(cation.charge)}) and ${count(parts.anions)} ${formatFormula(anion.symbol, anion.charge)} (${signed(anion.charge)}) add up to ${signed(total)}. Cross the charges to balance them.`;
  }
  return null;
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** What still needs balancing, or null once it balances in lowest terms */
function balanceHint(
  reactants: string[],
  products: string[],
  coefficients: number[],
) {
  const reaction = { reactants, products };
  if (isBalanced(reaction, coefficients))
    return isLowestTerms(coefficients)
      ? null
      : `Balanced, but use the smallest whole numbers: every coefficient divides by ${coefficients.reduce(gcd)}.`;
  const off = elementTally(reaction, coefficients).find(
    (row) => row.reactants !== row.products,
  )!;
  return `Count the ${off.element}: ${off.reactants} on the left, ${off.products} on the right.`;
}

/**
 * Grade typed products, with a hint for each blank that needs one; once the
 * products and states are right, any coefficients given (reactants then
 * products, blank meaning 1) must balance the equation
 */
export function gradeTyped(
  prediction: Prediction,
  answers: Typed[],
  coefficients?: string[], // leave out to skip balancing
) {
  const products = answers.map(
    (a) =>
      ({ formula: readFormula(a.text) ?? a.text, state: a.state }) as Product,
  );
  let verdict: Verdict = check(prediction, products).verdict;
  const hints = answers.map((answer, i) => {
    if (!prediction.products) return null;
    const match = prediction.products.find(
      (p) => p.formula === products[i].formula,
    );
    if (!match) return hintFor(prediction, answer.text);
    return match.state === answer.state
      ? null
      : 'Right formula: now check its state.';
  });
  const counts = [...prediction.reactants, ...answers].map(
    (_, i) => Number(coefficients?.[i]) || 1,
  );
  const balance =
    coefficients && verdict === 'correct' && prediction.products
      ? balanceHint(
          prediction.reactants.map((r) => r.formula),
          products.map((p) => p.formula),
          counts,
        )
      : null;
  if (balance) verdict = 'unbalanced';
  return { verdict, hints, balance };
}

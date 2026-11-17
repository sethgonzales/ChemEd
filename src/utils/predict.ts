import { COUPLES } from '~/constants/electrochemistry';
import { compound, elementsIn, gcd, ionsOf, type Ion } from './ions';
import { formatFormula } from './lewis';
import { solve } from './reactions';

export { compound, ionsOf, type Ion } from './ions';
import { displaces, isSoluble, isStrongAcid } from './solubility';

export type State = 's' | 'l' | 'g' | 'aq';
export type Product = { formula: string; state: State };

export interface Prediction {
  kind: 'single' | 'double';
  reactants: Product[];
  products: Product[] | null; // null: no reaction
  reason: string;
  equation: string; // balanced, with states
  netIonic: string;
  spectators: string[];
  ionic: { left: IonicTerm[]; right: IonicTerm[] }; // complete, before cancelling
}

export type IonicTerm = { text: string; spectator: boolean };

// a free element as it is found: hydrogen as H₂, metals as atoms
const elementFormula = (symbol: string) => (symbol === 'H' ? 'H2' : symbol);
const elementState = (symbol: string): State => (symbol === 'H' ? 'g' : 's');
// the ion a free metal forms, from its cited half-reaction
const metalCharge = (symbol: string) =>
  symbol === 'H' ? 1 : COUPLES.find((c) => c.id === symbol)?.charge;

const show = (formula: string) => formatFormula(formula);
const showIon = ({ symbol, charge }: Ion) => formatFormula(symbol, charge);
const isElement = (formula: string) =>
  ionsOf(formula) === null && elementsIn(formula).length === 1;

function saltState(formula: string): State {
  const ions = ionsOf(formula);
  if (!ions) return 'l';
  // the solubility rules are for ionic compounds; these acids all dissolve
  if (ions.cation.symbol === 'H') return 'aq';
  return isSoluble(ions.cation, ions.anion.symbol) === false ? 's' : 'aq';
}

/** Balanced molecular equation with states, plus the net ionic equation */
function equations(reactants: Product[], products: Product[]) {
  const coefficients = solve({
    reactants: reactants.map((r) => r.formula),
    products: products.map((p) => p.formula),
  })!;
  const n = reactants.length;
  const term = (p: Product, k: number) =>
    `${k === 1 ? '' : k}${show(p.formula)}(${p.state})`;
  const side = (list: Product[], offset: number) =>
    list.map((p, i) => term(p, coefficients[offset + i])).join(' + ');
  const equation = `${side(reactants, 0)} → ${side(products, n)}`;

  // dissolved strong electrolytes split into ions; everything else stays whole
  const species = (list: Product[], offset: number) => {
    const counts = new Map<
      string,
      { count: number; ion?: string; anion?: boolean }
    >();
    const add = (key: string, count: number, ion?: string, anion = false) =>
      counts.set(key, {
        count: (counts.get(key)?.count ?? 0) + count,
        ion,
        anion,
      });
    list.forEach((p, i) => {
      const k = coefficients[offset + i];
      const ions = ionsOf(p.formula);
      const splits =
        p.state === 'aq' &&
        ions &&
        (ions.cation.symbol !== 'H' || isStrongAcid(p.formula));
      if (splits) {
        const cat = showIon(ions.cation);
        const an = showIon(ions.anion);
        add(`${cat}(aq)`, k * ions.cations, cat);
        add(`${an}(aq)`, k * ions.anions, an, true);
      } else add(`${show(p.formula)}(${p.state})`, k);
    });
    return counts;
  };
  const left = species(reactants, 0);
  const right = species(products, n);
  // every species written out, spectators marked, before any cancel
  const complete = (side: typeof left, other: typeof left): IonicTerm[] =>
    [...side].map(([key, { count }]) => ({
      text: `${count === 1 ? '' : count}${key}`,
      spectator: other.has(key),
    }));
  const ionic = { left: complete(left, right), right: complete(right, left) };
  const spectators: string[] = [];
  for (const [key, { count, ion }] of left) {
    const other = right.get(key);
    if (!other) continue;
    const common = Math.min(count, other.count);
    left.set(key, { ...left.get(key)!, count: count - common });
    right.set(key, { ...other, count: other.count - common });
    if (ion && common > 0) spectators.push(ion);
  }
  const counts = [...left.values(), ...right.values()]
    .map((s) => s.count)
    .filter(Boolean);
  const divisor = counts.reduce(gcd);
  // by convention, cations are written before anions
  const write = (side: Map<string, { count: number; anion?: boolean }>) =>
    [...side]
      .filter(([, s]) => s.count > 0)
      .sort(([, x], [, y]) => Number(!!x.anion) - Number(!!y.anion))
      .map(([key, s]) => {
        const k = s.count / divisor;
        return `${k === 1 ? '' : k}${key}`;
      })
      .join(' + ');
  const netIonic = `${write(left)} → ${write(right)}`;
  return { equation, netIonic, spectators, ionic };
}

const noReaction = (
  kind: Prediction['kind'],
  reactants: Product[],
  reason: string,
): Prediction => ({
  kind,
  reactants,
  products: null,
  reason,
  equation: `${reactants.map((r) => `${show(r.formula)}(${r.state})`).join(' + ')} → no reaction`,
  netIonic: '',
  spectators: [],
  ionic: { left: [], right: [] },
});

/** What a single or double replacement makes, or why nothing happens */
export function predict([a, b]: [string, string]): Prediction {
  const free = [a, b].find(isElement);
  if (free) {
    const salt = free === a ? b : a;
    const ions = ionsOf(salt)!;
    const metal = elementsIn(free)[0];
    const other = ions.cation.symbol;
    const reactants: Product[] = [
      { formula: free, state: elementState(metal) },
      { formula: salt, state: saltState(salt) },
    ];
    const otherName = other === 'H' ? 'hydrogen' : other;
    if (!displaces(metal, other))
      return noReaction(
        'single',
        reactants,
        other === 'H'
          ? `${metal} is below hydrogen in the activity series, so it can’t free hydrogen from the acid: no reaction.`
          : `${metal} is below ${other} in the activity series, so it can’t replace ${other}’s ions: no reaction.`,
      );
    const formed = compound(
      { symbol: metal, charge: metalCharge(metal)! },
      ions.anion,
    );
    const products: Product[] = [
      { formula: formed, state: saltState(formed) },
      { formula: elementFormula(other), state: elementState(other) },
    ];
    return {
      kind: 'single',
      reactants,
      products,
      reason: `${metal} is above ${otherName} in the activity series, so it gives its electrons to ${showIon(ions.cation)} and takes its place.`,
      ...equations(reactants, products),
    };
  }

  const [first, second] = [ionsOf(a)!, ionsOf(b)!];
  const reactants: Product[] = [
    { formula: a, state: saltState(a) },
    { formula: b, state: saltState(b) },
  ];
  const formulas = [
    compound(first.cation, second.anion),
    compound(second.cation, first.anion),
  ];
  const products: Product[] = formulas.map((formula) => ({
    formula,
    state: formula === 'H2O' ? 'l' : saltState(formula),
  }));
  const solid = products.find((p) => p.state === 's');
  if (!solid && !formulas.includes('H2O'))
    return noReaction(
      'double',
      reactants,
      `${formulas.map(show).join(' and ')} are both soluble, so the ions stay dissolved: no reaction.`,
    );
  return {
    kind: 'double',
    reactants,
    products,
    reason: solid
      ? `${show(solid.formula)} is insoluble, so it precipitates as a solid.`
      : 'H⁺ from the acid and OH⁻ from the base join to make water.',
    ...equations(reactants, products),
  };
}

export type Verdict =
  | 'correct'
  | 'unbalanced'
  | 'wrong-state'
  | 'wrong-products'
  | 'missed-reaction'
  | 'no-reaction';

/** Grade a student's products, or their call of No reaction */
export function check(
  prediction: Prediction,
  answer: Product[] | 'none',
): { verdict: Verdict } {
  const { products } = prediction;
  if (answer === 'none')
    return { verdict: products ? 'missed-reaction' : 'correct' };
  if (!products) return { verdict: 'no-reaction' };
  const sorted = (list: Product[], withState: boolean) =>
    list
      .map((p) => (withState ? `${p.formula}(${p.state})` : p.formula))
      .sort()
      .join(' ');
  if (sorted(answer, false) !== sorted(products, false))
    return { verdict: 'wrong-products' };
  return {
    verdict:
      sorted(answer, true) === sorted(products, true)
        ? 'correct'
        : 'wrong-state',
  };
}

const METALS = COUPLES.map((c) => c.id);
const nitrate = (symbol: string) =>
  compound(
    { symbol, charge: metalCharge(symbol)! },
    { symbol: 'NO3', charge: -1 },
  );
// solutions to mix: each dissolves, and every product can be judged by Table 4.1
const SOLUTIONS = [
  'AgNO3',
  'Pb(NO3)2',
  'BaCl2',
  'NaCl',
  'KI',
  'Na2SO4',
  'Na2CO3',
  'NaOH',
  'CuSO4',
  'CaCl2',
  'Na3PO4',
  'KNO3',
  'KOH',
  'HCl',
  'HNO3',
];

const UNMODELLED_WITH_ACID = ['CO3', 'PO4'];

function mixable(a: string, b: string) {
  const [x, y] = [ionsOf(a)!, ionsOf(b)!];
  const acid = (i: typeof x) => i.cation.symbol === 'H';
  return (
    x.cation.symbol !== y.cation.symbol &&
    x.anion.symbol !== y.anion.symbol &&
    !(acid(x) && acid(y)) &&
    // an acid and a carbonate make CO₂ gas, and with a phosphate a weak acid:
    // reactions this engine doesn't model
    !(acid(x) && UNMODELLED_WITH_ACID.includes(y.anion.symbol)) &&
    !(acid(y) && UNMODELLED_WITH_ACID.includes(x.anion.symbol))
  );
}

/** Reactant pairs to predict: metals in solutions, and solutions mixed */
export const PREDICT_POOL: [string, string][] = [
  ...METALS.flatMap((metal) => [
    ...METALS.filter((m) => m !== metal).map((m): [string, string] => [
      metal,
      nitrate(m),
    ]),
    [metal, 'HCl'] as [string, string],
  ]),
  ...SOLUTIONS.flatMap((a, i) =>
    SOLUTIONS.slice(i + 1)
      .filter((b) => mixable(a, b))
      .map((b): [string, string] => [a, b]),
  ),
];

/**
 * The chips for building products: every ion in the reactants, the ion a free
 * metal would form, and (for a single replacement) the free elements
 */
export function pieces(reactants: [string, string]) {
  const ions: Ion[] = [];
  const wholes: string[] = [];
  const addIon = (ion: Ion) => {
    if (!ions.some((i) => i.symbol === ion.symbol && i.charge === ion.charge))
      ions.push(ion);
  };
  const free = reactants.find(isElement);
  for (const formula of reactants) {
    const parts = ionsOf(formula);
    if (parts) {
      addIon(parts.cation);
      addIon(parts.anion);
      if (free) wholes.push(elementFormula(parts.cation.symbol));
    } else {
      const metal = elementsIn(formula)[0];
      addIon({ symbol: metal, charge: metalCharge(metal)! });
      wholes.push(formula);
    }
  }
  return { ions, wholes };
}

/** The index of a random puzzle, never the one just played */
export function dealPredict(
  previous: number | undefined,
  random = Math.random,
) {
  const choices = PREDICT_POOL.map((_, i) => i).filter((i) => i !== previous);
  return choices[Math.floor(random() * choices.length)];
}

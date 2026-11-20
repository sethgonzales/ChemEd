// Gas law questions for the Dungeon Quest, on the core laws Balloon Riser
// flies: Boyle's, Charles's, Gay-Lussac's, Avogadro's, combined and ideal.
// Every answer is solved by the same solver the balloon flies on.

import { ATMOSPHERE, GAS_CONSTANT, ZERO_CELSIUS } from '~/constants/physical';
import { TOLERANCE } from '~/utils/balloon-flight';
import {
  fromSI,
  solveGas,
  toSI,
  type Gas,
  type GasUnit,
} from '~/utils/gas-laws';
import {
  numberChoices,
  pick,
  textChoices,
  type Course,
  type QuickQuestion,
  type Rng,
} from '~/utils/quest';

// which laws first, then one law solved, then the combined and ideal laws
// in mixed units
export const GAS_LEVELS: Record<Course, [number, number]> = {
  general: [1, 2],
  ap: [2, 3],
};

export type GasLaw =
  | 'boyle'
  | 'charles'
  | 'gay-lussac'
  | 'avogadro'
  | 'combined'
  | 'ideal';
type Quantity = keyof Gas;

type TwoState = Exclude<GasLaw, 'ideal'>; // a gas before and after a change
const SIMPLE: TwoState[] = ['boyle', 'charles', 'gay-lussac', 'avogadro'];

interface Given {
  symbol: string; // e.g. P₁
  quantity: Quantity;
  value: number; // in its unit, as shown
  unit: GasUnit;
}

export interface GasProblem {
  law: GasLaw;
  setting: string; // what happens to the gas, and what's held fixed
  givens: Given[];
  find: { symbol: string; quantity: Quantity; unit: GasUnit };
  answer: number; // SI
  worked: string[]; // Mr. G's working, after a miss
}

const NAMES: Record<GasLaw, string> = {
  boyle: 'Boyle’s law',
  charles: 'Charles’s law',
  'gay-lussac': 'Gay-Lussac’s law',
  avogadro: 'Avogadro’s law',
  combined: 'The combined gas law',
  ideal: 'The ideal gas law',
};

const EQUATIONS: Record<GasLaw, string> = {
  boyle: 'P₁V₁ = P₂V₂',
  charles: 'V₁/T₁ = V₂/T₂',
  'gay-lussac': 'P₁/T₁ = P₂/T₂',
  avogadro: 'V₁/n₁ = V₂/n₂',
  combined: 'P₁V₁/T₁ = P₂V₂/T₂',
  ideal: 'PV = nRT',
};

// what each law lets change; the rest are held fixed
const CHANGES: Record<TwoState, Quantity[]> = {
  boyle: ['p', 'v'],
  charles: ['v', 't'],
  'gay-lussac': ['p', 't'],
  avogadro: ['v', 'n'],
  combined: ['p', 'v', 't'],
};

const FIXED: Record<GasLaw, string> = {
  boyle: 'the temperature and amount of gas',
  charles: 'the pressure and amount of gas',
  'gay-lussac': 'the volume and amount of gas',
  avogadro: 'the temperature and pressure',
  combined: 'the amount of gas',
  ideal: 'nothing: it’s one state of the gas',
};

// what happens to the gas, saying what's held fixed
const SETTINGS: Record<GasLaw, string[]> = {
  boyle: [
    'A gas in a sealed syringe is squeezed or let out slowly, so its temperature doesn’t change.',
    'A sealed bubble of gas moves to a new pressure at a constant temperature.',
  ],
  charles: [
    'A gas under a freely sliding piston is heated or cooled, so its pressure stays the same.',
    'A tied balloon changes temperature while the pressure around it stays the same.',
  ],
  'gay-lussac': [
    'A gas in a sealed, rigid steel tank is heated or cooled.',
    'A sealed, rigid flask of gas changes temperature.',
  ],
  avogadro: [
    'Gas is added to or let out of a cylinder under a freely sliding piston, at a constant temperature and pressure.',
    'A balloon is filled or let down at a constant temperature and pressure.',
  ],
  combined: [
    'A sealed weather balloon rises, and the pressure and temperature around it both change.',
    'A sealed syringe of gas is heated and squeezed at the same time.',
  ],
  ideal: ['A rigid tank holds some gas.', 'A sealed flask holds some gas.'],
};

const UNITS: Record<Course, Record<Quantity, GasUnit[]>> = {
  general: { p: ['atm', 'kPa'], v: ['L'], t: ['K'], n: ['mol'] },
  ap: { p: ['atm', 'kPa', 'mmHg'], v: ['L', 'mL'], t: ['K', '°C'], n: ['mol'] },
};

// where a gas starts (game values, everyday lab sizes), SI
const START: Record<Quantity, [number, number]> = {
  p: [0.5 * ATMOSPHERE, 3 * ATMOSPHERE], // Pa
  v: [0.001, 0.02], // m³: 1 to 20 L
  t: [250, 450], // K
  n: [0.2, 5], // mol
};
// m³: 100 to 450 mL, so even doubled it's under a litre
const GLASSWARE: [number, number] = [0.0001, 0.00045];
// how far a quantity changes: a factor below or above 1, never close to it
const SCALE: Record<Quantity, [number, number]> = {
  p: [1.15, 2],
  v: [1.15, 2],
  t: [1.1, 1.35],
  n: [1.15, 2],
};

const SYMBOLS: Record<Quantity, string> = { p: 'P', v: 'V', t: 'T', n: 'n' };

const between = (rng: Rng, [low, high]: [number, number]) =>
  low + rng() * (high - low);

// three significant figures, or whole degrees Celsius
const shown = (value: number, unit: GasUnit) =>
  unit === '°C' ? Math.round(value) : Number(value.toPrecision(3));

const display = (n: number) =>
  Number(n.toPrecision(3)).toLocaleString('en-US', {
    maximumSignificantDigits: 3,
  });

/** A value with its unit, as choices and working show it */
export const format = (value: number, unit: GasUnit) =>
  `${unit === '°C' ? Math.round(value) : display(value)} ${unit}`;

/** A quantity, rounded as shown in its unit, and its SI value from that */
function given(
  symbol: string,
  quantity: Quantity,
  si: number,
  unit: GasUnit,
): Given & { si: number } {
  const value = shown(fromSI(si, unit), unit);
  return { symbol, quantity, value, unit, si: toSI(value, unit) };
}

/**
 * Where a problem's gas starts, and the unit each given and the answer use:
 * one per quantity, or mixed for AP. Half of AP's gases are in glassware,
 * the only ones measured in millilitres, so none reads "13,000 mL".
 */
function setUp(rng: Rng, course: Course) {
  const glassware = course === 'ap' && rng() < 0.5;
  const start = { ...START, v: glassware ? GLASSWARE : START.v };
  const units = {
    ...UNITS[course],
    v: glassware ? UNITS.ap.v : (['L'] as GasUnit[]),
  };
  const fixed = Object.fromEntries(
    (['p', 'v', 't', 'n'] as const).map((q) => [q, pick(rng, units[q])]),
  ) as Record<Quantity, GasUnit>;
  const unitFor = (q: Quantity) =>
    course === 'ap' ? pick(rng, units[q]) : fixed[q];
  return { start, unitFor };
}

/**
 * How a quantity scales when others do, by PV/nT staying the same: P and V
 * on top, n and T below, so two on the same side go inversely
 */
export function scaleBy(
  _law: GasLaw,
  changes: Partial<Record<Quantity, number>>,
  asked: Quantity,
) {
  const top = (q: Quantity) => q === 'p' || q === 'v';
  return Object.entries(changes).reduce(
    (k, [q, f]) => k * (top(q as Quantity) === top(asked) ? 1 / f! : f!),
    1,
  );
}

// the units working is done in: kPa when every pressure is, else atm
function workingUnits(units: GasUnit[]): Record<Quantity, GasUnit> {
  const pressures = units.filter((u) => ['atm', 'kPa', 'mmHg'].includes(u));
  const p = pressures.every((u) => u === 'kPa') ? 'kPa' : 'atm';
  return { p, v: 'L', t: 'K', n: 'mol' };
}

/** A conversion into the working unit, as a line of working */
function convertLine(g: Given, to: GasUnit) {
  const into = display(fromSI(toSI(g.value, g.unit), to));
  const ways: Partial<Record<string, string>> = {
    '°C>K': `${g.value} °C + 273.15`,
    'mL>L': `${display(g.value)} mL ÷ 1000`,
    'mmHg>atm': `${display(g.value)} mmHg ÷ 760`,
    'kPa>atm': `${display(g.value)} kPa ÷ 101.325`,
  };
  const how = ways[`${g.unit}>${to}`] ?? `${display(g.value)} ${g.unit}`;
  return `${g.symbol} = ${how} = ${into} ${to}`;
}

/** From the working unit into the one asked for, if they differ */
function answerLine(si: number, from: GasUnit, to: GasUnit, symbol: string) {
  return from === to
    ? []
    : [
        `${symbol} = ${format(fromSI(si, from), from)} = ${format(fromSI(si, to), to)}`,
      ];
}

/** A problem on one of the two-state laws: before, and after a change */
function twoState(rng: Rng, law: TwoState, course: Course) {
  const changes = CHANGES[law];
  const unknown = pick(rng, changes);
  const { start: from, unitFor } = setUp(rng, course);
  const before = Object.fromEntries(
    (['p', 'v', 't', 'n'] as const).map((q) => [q, between(rng, from[q])]),
  ) as unknown as Gas;

  const givens: (Given & { si: number })[] = [];
  const known = { ...before };
  for (const q of changes)
    givens.push(given(`${SYMBOLS[q]}₁`, q, before[q], unitFor(q)));
  for (const g of givens) known[g.quantity] = g.si;
  const after: Partial<Gas> = { ...known };
  for (const q of changes) {
    if (q === unknown) continue;
    const f = between(rng, SCALE[q]);
    const g = given(
      `${SYMBOLS[q]}₂`,
      q,
      known[q] * (rng() < 0.5 ? f : 1 / f),
      unitFor(q),
    );
    givens.push(g);
    after[q] = g.si;
  }
  delete after[unknown];
  const answer = solveGas(known, after)[unknown];
  const find = {
    symbol: `${SYMBOLS[unknown]}₂`,
    quantity: unknown,
    unit: unitFor(unknown),
  };

  // the working: convert, then scale the unknown's start by each ratio
  const work = workingUnits([...givens.map((g) => g.unit), find.unit]);
  const inWork = (g: Given) => fromSI(toSI(g.value, g.unit), work[g.quantity]);
  const start = givens.find((g) => g.symbol === `${SYMBOLS[unknown]}₁`)!;
  const others = changes.filter((q) => q !== unknown);
  const top = (q: Quantity) => q === 'p' || q === 'v';
  const ratio = (q: Quantity) => {
    const [a, b] = top(q) === top(unknown) ? ['₁', '₂'] : ['₂', '₁'];
    return { q, a: `${SYMBOLS[q]}${a}`, b: `${SYMBOLS[q]}${b}` };
  };
  const ratios = others.map(ratio);
  const value = (symbol: string) =>
    display(inWork(givens.find((g) => g.symbol === symbol)!));
  const worked = [
    `${NAMES[law]}: ${EQUATIONS[law]}, with ${FIXED[law]} fixed.`,
    ...givens
      .filter((g) => g.unit !== work[g.quantity])
      .map((g) => convertLine(g, work[g.quantity])),
    `${find.symbol} = ${start.symbol} × ${ratios.map((r) => `(${r.a} ÷ ${r.b})`).join(' × ')}`,
    `${find.symbol} = ${display(inWork(start))} ${work[unknown]} × ${ratios
      .map((r) => `(${value(r.a)} ÷ ${value(r.b)})`)
      .join(' × ')} = ${format(fromSI(answer, work[unknown]), work[unknown])}`,
    ...answerLine(answer, work[unknown], find.unit, find.symbol),
  ];

  // slips, in SI: every ratio flipped; °C used as if it were kelvin
  const si = (symbol: string, celsius = false) => {
    const g = givens.find((x) => x.symbol === symbol)!;
    return celsius && g.unit === '°C' ? g.value : g.si;
  };
  const scaled = (flip: boolean, celsius: boolean) =>
    ratios.reduce(
      (x, r) =>
        x *
        (flip
          ? si(r.b, celsius) / si(r.a, celsius)
          : si(r.a, celsius) / si(r.b, celsius)),
      si(start.symbol, celsius),
    );
  const slips = [scaled(true, false), scaled(false, true), scaled(true, true)];

  return { givens, find, answer, worked, slips };
}

// R in the units the working uses
const R_WORK = {
  atm: {
    value: (GAS_CONSTANT * 1000) / ATMOSPHERE,
    text: '0.08206 L·atm/(mol·K)',
  },
  kPa: { value: GAS_CONSTANT, text: '8.314 L·kPa/(mol·K)' },
} as const;

/** An ideal gas law problem: one state, three of P, V, n and T given */
function oneState(rng: Rng, course: Course) {
  const { start: from, unitFor } = setUp(rng, course);
  const gas = solveGas({
    p: between(rng, from.p),
    v: between(rng, from.v),
    t: between(rng, from.t),
  });
  const unknown = pick(rng, ['p', 'v', 't', 'n'] as const);
  const givens = (['p', 'v', 't', 'n'] as const)
    .filter((q) => q !== unknown)
    .map((q) => given(SYMBOLS[q], q, gas[q], unitFor(q)));
  const known = Object.fromEntries(givens.map((g) => [g.quantity, g.si]));
  const answer = solveGas(known)[unknown];
  const find = {
    symbol: SYMBOLS[unknown],
    quantity: unknown,
    unit: unitFor(unknown),
  };

  const work = workingUnits([...givens.map((g) => g.unit), find.unit]);
  const r = R_WORK[work.p as 'atm' | 'kPa'];
  const w = (q: Quantity) => {
    const g = givens.find((x) => x.quantity === q)!;
    return `${display(fromSI(g.si, work[q]))} ${work[q]}`;
  };
  const R = r.value.toPrecision(4);
  // only the unknown's, as the others need it given
  const formulas: Record<Quantity, () => [string, string]> = {
    p: () => ['P = nRT ÷ V', `(${w('n')} × ${R} × ${w('t')}) ÷ ${w('v')}`],
    v: () => ['V = nRT ÷ P', `(${w('n')} × ${R} × ${w('t')}) ÷ ${w('p')}`],
    n: () => ['n = PV ÷ RT', `(${w('p')} × ${w('v')}) ÷ (${R} × ${w('t')})`],
    t: () => ['T = PV ÷ nR', `(${w('p')} × ${w('v')}) ÷ (${w('n')} × ${R})`],
  };
  const [formula, numbers] = formulas[unknown]();
  const worked = [
    `${NAMES.ideal}: ${EQUATIONS.ideal}, with R = ${r.text}.`,
    ...givens
      .filter((g) => g.unit !== work[g.quantity])
      .map((g) => convertLine(g, work[g.quantity])),
    formula,
    `${find.symbol} = ${numbers} = ${format(fromSI(answer, work[unknown]), work[unknown])}`,
    ...answerLine(answer, work[unknown], find.unit, find.symbol),
  ];

  // slips: R in the wrong units (8.314 with atm, or 0.08206 with kPa), and
  // °C used as if it were kelvin
  const wrongR = ATMOSPHERE / 1000;
  const tGiven = givens.find((g) => g.quantity === 't');
  const celsius =
    tGiven?.unit === '°C'
      ? solveGas({ ...known, t: tGiven.value })[unknown]
      : undefined;
  const slips = [
    answer * wrongR,
    answer / wrongR,
    ...(celsius ? [celsius] : []),
  ];
  return { givens, find, answer, worked, slips };
}

/** A gas law problem, on a law, in the course's units */
export function gasProblem(rng: Rng, law: GasLaw, course: Course) {
  const setting = pick(rng, SETTINGS[law]);
  const { givens, find, answer, worked, slips } =
    law === 'ideal' ? oneState(rng, course) : twoState(rng, law, course);
  const problem: GasProblem = {
    law,
    setting,
    givens: givens.map(({ symbol, quantity, value, unit }) => ({
      symbol,
      quantity,
      value,
      unit,
    })),
    find,
    answer,
    worked,
  };
  return Object.assign(problem, { slips }) as GasProblem & { slips: number[] };
}

/** A room's problem: one law in the first room, combined or ideal in the second */
export const roomProblem = (rng: Rng, course: Course, room: number) =>
  gasProblem(rng, pick(rng, room ? ['combined', 'ideal'] : SIMPLE), course);

/** The units an answer can be typed in, the one asked for first */
export const answerUnits = ({ find }: GasProblem): GasUnit[] => [
  find.unit,
  ...UNITS.ap[find.quantity].filter((u) => u !== find.unit),
];

/** Right within the game's 2%, so rounding along the way doesn't fail a correct method */
export const isRight = (p: GasProblem, si: number) =>
  Math.abs(si / p.answer - 1) <= TOLERANCE;

/** The problem as the student reads it */
export const problemText = (p: GasProblem) =>
  `${p.setting} ${p.givens
    .map((g) => `${g.symbol} = ${format(g.value, g.unit)}`)
    .join(', ')}. Find ${p.find.symbol} in ${p.find.unit}.`;

/** Solve a law: pick the value, with the real slips as the wrong choices */
export function solveQuestion(rng: Rng, law: GasLaw, course: Course) {
  const problem = gasProblem(rng, law, course);
  const { unit } = problem.find;
  const asked = (si: number) => fromSI(si, unit);
  const right = asked(problem.answer);
  const question: QuickQuestion = {
    prompt: problemText(problem),
    about: NAMES[law],
    ...numberChoices(
      rng,
      right,
      [...problem.slips.map(asked), right * 2, right / 2],
      (n) => format(n, unit),
      unit === '°C' ? -ZERO_CELSIUS : undefined,
    ),
    explain: problem.worked.join(' '),
  };
  return { problem, question };
}

// which law: what happens to a gas, in everyday terms
const SCENARIOS: [GasLaw, string][] = [
  [
    'boyle',
    'A diver’s air bubble grows as it rises through water of the same temperature.',
  ],
  [
    'boyle',
    'A sealed syringe of air is slowly squeezed to half its volume, staying at room temperature.',
  ],
  [
    'boyle',
    'A sealed bag of chips puffs up when it’s carried up a mountain in a car kept at the same temperature.',
  ],
  [
    'charles',
    'A tied balloon shrinks when it’s moved from a warm room into a freezer.',
  ],
  [
    'charles',
    'A gas under a freely sliding piston is heated, and the piston rises.',
  ],
  [
    'charles',
    'A loaf’s bubbles of gas swell as it bakes, at the same air pressure.',
  ],
  [
    'gay-lussac',
    'A sealed steel can of gas is heated, and the pressure inside climbs.',
  ],
  [
    'gay-lussac',
    'A car tyre’s pressure rises on a hot afternoon, its size hardly changing.',
  ],
  [
    'gay-lussac',
    'A rigid, sealed tank of gas is left out in the cold, and its gauge reads lower.',
  ],
  [
    'avogadro',
    'More air is blown into a balloon at the same temperature and pressure, and it grows.',
  ],
  [
    'avogadro',
    'Gas is let out of a cylinder under a freely sliding piston at a constant temperature, and the piston falls.',
  ],
  [
    'combined',
    'A sealed weather balloon rises, into air that’s both colder and thinner.',
  ],
  [
    'combined',
    'A sealed syringe of gas is heated and squeezed at the same time.',
  ],
  [
    'ideal',
    'A tank’s pressure, volume and temperature are read, and you want the moles of gas inside.',
  ],
  [
    'ideal',
    'You know the moles of gas in a flask, its volume and its temperature, and want its pressure.',
  ],
];

const CHANGING: Record<GasLaw, string> = {
  boyle: 'pressure and volume change',
  charles: 'volume and temperature change',
  'gay-lussac': 'pressure and temperature change',
  avogadro: 'volume and the amount of gas change',
  combined: 'pressure, volume and temperature change',
  ideal: 'three of P, V, n and T are known',
};

/** Which law does a scenario follow? */
export function whichLawQuestion(rng: Rng): QuickQuestion {
  const [law, scenario] = pick(rng, SCENARIOS);
  const all = Object.values(NAMES);
  return {
    prompt: `${scenario} Which gas law describes it?`,
    about: 'Which law', // shown over the question, so not the law itself
    ...textChoices(rng, NAMES[law], all),
    explain:
      law === 'ideal'
        ? `One state of a gas, with ${CHANGING.ideal}: ${NAMES.ideal}, ${EQUATIONS.ideal}.`
        : `With ${FIXED[law]} fixed, the ${CHANGING[law]}: ${NAMES[law]}, ${EQUATIONS[law]}.`,
  };
}

const FACTORS: [number, string, string][] = [
  [4, 'quadruples', 'It quadruples'],
  [3, 'triples', 'It triples'],
  [2, 'doubles', 'It doubles'],
  [1 / 2, 'is halved', 'It is halved'],
  [1 / 3, 'falls to a third', 'It falls to a third'],
  [1 / 4, 'falls to a quarter', 'It falls to a quarter'],
];
const SAME = 'It stays the same';
const WAYS = [...FACTORS.map(([, , w]) => w), SAME];

const NOUNS: Record<Quantity, string> = {
  p: 'pressure',
  v: 'volume',
  t: 'kelvin temperature',
  n: 'amount of gas',
};

const wordFor = (k: number) =>
  Math.abs(k - 1) < 1e-9
    ? SAME
    : FACTORS.find(([f]) => Math.abs(f - k) < 1e-9)?.[2];

/** If one quantity changes so much, what happens to another? */
export function whichWayQuestion(rng: Rng): QuickQuestion {
  for (;;) {
    const law = pick<TwoState>(rng, [...SIMPLE, 'combined']);
    const changes = CHANGES[law];
    const asked = pick(rng, changes);
    const changed = changes.filter((q) => q !== asked);
    const steps = changed.map((q) => [q, pick(rng, FACTORS)] as const);
    const k = scaleBy(
      law,
      Object.fromEntries(steps.map(([q, [f]]) => [q, f])),
      asked,
    );
    const right = wordFor(k);
    if (!right) continue; // only ratios the choices can say
    const what = steps.map(([q, [, verb]]) => `its ${NOUNS[q]} ${verb}`);
    const held =
      law === 'combined'
        ? 'A sealed gas'
        : `A gas, with ${FIXED[law]} held fixed,`;
    return {
      prompt: `${held} changes: ${what.join(' and ')}. What happens to its ${NOUNS[asked]}?`,
      about: NAMES[law],
      ...textChoices(rng, right, WAYS),
      explain: `${NAMES[law]}: ${EQUATIONS[law]}. P and V sit on one side and n and T on the other, so on the same side they go inversely, on opposite sides directly: its ${NOUNS[asked]} ${right.replace('It ', '')}.`,
    };
  }
}

/** A gas laws question: which law and which way, then solving, then the combined and ideal laws in mixed units */
export function gasQuestion(rng: Rng, level: number): QuickQuestion {
  if (level <= 1) return pick(rng, [whichLawQuestion, whichWayQuestion])(rng);
  if (level === 2)
    return rng() < 0.3
      ? whichWayQuestion(rng)
      : solveQuestion(rng, pick(rng, SIMPLE), 'general').question;
  return solveQuestion(rng, pick(rng, ['combined', 'ideal'] as const), 'ap')
    .question;
}

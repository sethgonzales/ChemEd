// States of Matter questions for the Dungeon Quest, from the substances the
// simulation heats and cools, each with its cited phase data.

import { SUBSTANCES, type Substance } from '~/constants/substances';
import {
  numberChoices,
  pick,
  shuffle,
  textChoices,
  type Course,
  type QuickQuestion,
  type Rng,
} from '~/utils/quest';
import {
  PARTICLE_MOTION,
  phaseOf,
  temperatureRange,
} from '~/utils/states-of-matter';
import type { Phase } from '~/utils/guide';

// water's phases first; then every substance, its melting and boiling points,
// and (AP) the heat a phase change takes
export const STATES_LEVELS: Record<Course, [number, number]> = {
  general: [1, 2],
  ap: [2, 3],
};

const CLEAR_OF_CHANGE = 5; // °C at least between a question's temperature and a phase change
const SPREAD = 30; // °C, how far past a change a temperature can be
const MOLES = [0.5, 1, 2, 3];

const pool = (level: number) =>
  level === 1 ? SUBSTANCES.filter((s) => s.id === 'water') : SUBSTANCES;

const celsius = (t: number) => `${String(t).replace('-', '−')} °C`;
const points = (s: Substance) =>
  `${s.name} melts at ${celsius(s.meltC)} and boils at ${celsius(s.boilC)} at 1 atm`;

const PHASES: Phase[] = ['Solid', 'Liquid', 'Gas'];

/** A whole-degree temperature in a phase, well clear of its changes */
function temperatureIn(rng: Rng, s: Substance, phase: Phase) {
  const gap = CLEAR_OF_CHANGE;
  return Math.round(
    phase === 'Solid'
      ? s.meltC - gap - rng() * SPREAD
      : phase === 'Liquid'
        ? s.meltC + gap + rng() * (s.boilC - s.meltC - 2 * gap)
        : s.boilC + gap + rng() * SPREAD,
  );
}

/** What phase is X at T °C? */
export function phaseQuestion(rng: Rng, level: number): QuickQuestion {
  const s = pick(rng, pool(level));
  const t = temperatureIn(rng, s, pick(rng, PHASES));
  const right = phaseOf(s, t);
  return {
    prompt: `What phase is ${s.name.toLowerCase()} in at ${celsius(t)} and 1 atm?`,
    about: s.name,
    ...textChoices(rng, right, ['Solid', 'Liquid', 'Gas']),
    explain: `${points(s)}, so at ${celsius(t)} it’s a ${right.toLowerCase()}.`,
  };
}

/** At what temperature does X melt (or boil)? */
export function pointQuestion(rng: Rng, level: number): QuickQuestion {
  const s = pick(rng, pool(level));
  const boil = rng() < 0.5;
  const right = boil ? s.boilC : s.meltC;
  return {
    prompt: `At what temperature does ${s.name.toLowerCase()} ${boil ? 'boil' : 'melt'} at 1 atm?`,
    about: s.name,
    ...textChoices(
      rng,
      celsius(right),
      SUBSTANCES.flatMap((o) => [o.meltC, o.boilC]).map(celsius),
    ),
    explain: `${points(s)}.`,
  };
}

/** How much heat melts (or boils) n mol of X at its melting (boiling) point? */
export function heatQuestion(rng: Rng, level: number): QuickQuestion {
  const s = pick(rng, pool(level));
  const n = pick(rng, MOLES);
  const melt = rng() < 0.5;
  const perMole = melt ? s.fusionKJ : s.vaporizationKJ;
  const other = melt ? s.vaporizationKJ : s.fusionKJ;
  const kJ = (q: number) => `${q.toFixed(2)} kJ`;
  const change = melt ? 'fusion' : 'vaporization';
  return {
    prompt: `How much heat does it take to ${melt ? 'melt' : 'boil'} ${n} mol of ${s.name.toLowerCase()} at its ${melt ? 'melting' : 'boiling'} point?`,
    about: s.name,
    ...numberChoices(
      rng,
      n * perMole,
      [
        n * other, // the other phase change's enthalpy
        perMole, // forgetting the moles
        perMole / n,
        2 * n * perMole,
      ],
      kJ,
    ),
    explain: `Heat = moles × ΔH of ${change}: ${n} mol × ${perMole} kJ/mol = ${kJ(n * perMole)}.`,
  };
}

/** A States of Matter question: heat calculations join in at level 3 */
export function statesQuestion(rng: Rng, level: number): QuickQuestion {
  const kinds =
    level === 1
      ? [phaseQuestion]
      : level === 2
        ? [phaseQuestion, pointQuestion]
        : [phaseQuestion, pointQuestion, heatQuestion, heatQuestion];
  return pick(rng, kinds)(rng, level);
}

// ---- The Wyrm's rooms: what the particles show, reading the heating curve,
// and how the states differ

export type StatesRoom =
  | {
      kind: 'particles';
      substance: Substance;
      tempC: number;
      question: QuickQuestion;
    }
  | { kind: 'curve'; substance: Substance; question: QuickQuestion }
  | { kind: 'concept'; question: QuickQuestion };

/** Which state do these particles show? */
function particlesRoom(rng: Rng, substance: Substance): StatesRoom {
  const tempC = temperatureIn(rng, substance, pick(rng, PHASES));
  const right = phaseOf(substance, tempC);
  return {
    kind: 'particles',
    substance,
    tempC,
    question: {
      prompt: 'Which state of matter are these particles in?',
      about: substance.name,
      ...textChoices(rng, right, PHASES),
      explain: `The particles are ${PARTICLE_MOTION[right]}: a ${right.toLowerCase()}.`,
    },
  };
}

// a heating curve's five segments, as the room letters them
export const CURVE_SEGMENTS = [
  { letter: 'A', what: 'warming as a solid' },
  { letter: 'B', what: 'melting' },
  { letter: 'C', what: 'warming as a liquid' },
  { letter: 'D', what: 'boiling' },
  { letter: 'E', what: 'warming as a gas' },
] as const;
const LETTERS = CURVE_SEGMENTS.map((g) => g.letter);
const degrees = (t: number) => celsius(Math.round(t)); // as the axis shows it

type CurveAsk = (rng: Rng, s: Substance) => QuickQuestion;

const segmentAsk: CurveAsk = (rng, s) => {
  const { letter, what } = pick(rng, CURVE_SEGMENTS);
  const name = s.name.toLowerCase();
  return {
    prompt: `On ${name}’s heating curve, which segment shows it ${what}?`,
    about: s.name,
    // every letter, in order, as on the curve
    choices: [...LETTERS],
    answer: LETTERS.indexOf(letter),
    explain: `Sloped segments warm one state (A solid, C liquid, E gas); flat ones change state (B melting at ${degrees(s.meltC)}, D boiling at ${degrees(s.boilC)}).`,
  };
};

const readingAsk: CurveAsk = (rng, s) => {
  const boil = rng() < 0.5;
  const t = boil ? s.boilC : s.meltC;
  const { min, max } = temperatureRange(s);
  return {
    prompt: `Read the curve: at what temperature does it ${boil ? 'boil' : 'melt'}?`,
    about: s.name,
    ...textChoices(rng, degrees(t), [
      degrees(boil ? s.meltC : s.boilC), // the other flat segment
      degrees(min),
      degrees(max),
    ]),
    explain: `It ${boil ? 'boils' : 'melts'} along the flat segment ${boil ? 'D' : 'B'}, level with ${degrees(t)} on the temperature axis.`,
  };
};

// heat absorbed in a change of state leaves the temperature alone (latent heat)
const flatAsk: CurveAsk = (rng, s) => {
  const melting = rng() < 0.5;
  const right =
    'The heat goes into changing the state, not into raising the temperature';
  return {
    prompt: `Heat is still being added along segment ${melting ? 'B' : 'D'}. Why does the temperature stay the same?`,
    about: s.name,
    ...textChoices(rng, right, [
      'The particles stop moving while it ' + (melting ? 'melts' : 'boils'),
      'The heat escapes as fast as it’s added',
      'The thermometer can’t read during a change of state',
    ]),
    explain: `While it ${melting ? 'melts' : 'boils'}, the heat absorbed (latent heat) changes its state at a constant temperature.`,
  };
};

// plateau lengths are the heats of fusion and vaporization, per mole
const longerAsk: CurveAsk = (rng, s) => ({
  prompt: `On ${s.name.toLowerCase()}’s curve, segment D is longer than segment B. What does that show?`,
  about: s.name,
  ...textChoices(rng, 'Boiling takes more heat per mole than melting', [
    'Melting takes more heat per mole than boiling',
    'It boils at a lower temperature than it melts',
    'The liquid warms faster than the solid',
  ]),
  explain: `The flat segments’ lengths are the heat each change takes: ${s.vaporizationKJ} kJ/mol to boil, ${s.fusionKJ} kJ/mol to melt.`,
});

const CURVE_ASKS: Record<Course, CurveAsk[]> = {
  general: [segmentAsk, readingAsk],
  ap: [segmentAsk, readingAsk, flatAsk, longerAsk],
};

// How the states differ, from Wikipedia's State of matter (stateOfMatter)
interface Fact {
  prompt: string;
  right: string;
  wrong?: string[]; // defaults to the other two states
  explain: string;
}
const GENERAL_FACTS: Fact[] = [
  {
    prompt: 'Which state of matter has a definite shape and a definite volume?',
    right: 'Solid',
    explain:
      'A solid’s particles are held in fixed positions, so it keeps its shape and its volume.',
  },
  {
    prompt:
      'Which state keeps its volume but takes the shape of its container?',
    right: 'Liquid',
    explain:
      'A liquid’s particles stay close but move past one another: its volume stays the same, its shape follows the container.',
  },
  {
    prompt: 'Which state expands to fill its whole container?',
    right: 'Gas',
    explain:
      'A gas has no definite shape or volume; it fills whatever container holds it.',
  },
  {
    prompt: 'In which state are the particles farthest apart?',
    right: 'Gas',
    explain:
      'In a gas the particles are, on average, much farther apart than their own size.',
  },
  {
    prompt: 'In which state can the particles only vibrate in fixed positions?',
    right: 'Solid',
    explain:
      'In a solid the forces between particles are so strong that they can only vibrate in place.',
  },
  {
    prompt:
      'In which state are the particles close together but able to move past one another?',
    right: 'Liquid',
    explain:
      'A liquid’s particles stay close together but have enough energy to slide past one another.',
  },
  {
    prompt: 'Which state is easily compressed?',
    right: 'Gas',
    explain:
      'A gas is compressible, since its particles are far apart; liquids and solids barely compress.',
  },
];
const AP_FACTS: Fact[] = [
  {
    prompt:
      'In which state do intermolecular forces have the least effect on the particles?',
    right: 'Gas',
    explain:
      'Gas particles have enough kinetic energy, and are far enough apart, that the forces between them have little effect.',
  },
  {
    prompt:
      'Why can a gas be squeezed into a smaller volume, but a liquid hardly at all?',
    right: 'Gas particles are far apart, with mostly empty space between them',
    wrong: [
      'Gas particles are smaller than liquid particles',
      'Gas particles have no mass',
      'Liquid particles are held in fixed positions',
    ],
    explain:
      'The distance between gas particles is much greater than their size, so there’s room to push them together; a liquid’s particles are already close.',
  },
  {
    prompt:
      'What lets a liquid’s particles move past one another, when a solid’s can only vibrate?',
    right:
      'They have enough energy to move, though the forces between them still matter',
    wrong: [
      'The forces between them disappear',
      'They are much farther apart than in a solid',
      'They have no kinetic energy',
    ],
    explain:
      'In a liquid the intermolecular forces still hold the particles close, but they have enough energy to move relative to one another.',
  },
];
const FACTS: Record<Course, Fact[]> = {
  general: GENERAL_FACTS,
  ap: [...GENERAL_FACTS, ...AP_FACTS, ...AP_FACTS], // the deeper ones, often
};

function conceptRoom(rng: Rng, course: Course): StatesRoom {
  const fact = pick(rng, FACTS[course]);
  return {
    kind: 'concept',
    question: {
      prompt: fact.prompt,
      about: 'States of matter',
      ...textChoices(rng, fact.right, fact.wrong ?? PHASES),
      explain: fact.explain,
    },
  };
}

/** The Wyrm's three rooms, each on a different substance where there's one */
export function statesRooms(rng: Rng, course: Course): StatesRoom[] {
  const [first, second] = shuffle(rng, SUBSTANCES);
  return [
    particlesRoom(rng, first),
    {
      kind: 'curve',
      substance: second,
      question: pick(rng, CURVE_ASKS[course])(rng, second),
    },
    conceptRoom(rng, course),
  ];
}

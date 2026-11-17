// Titration questions for the Dungeon Quest, from the lab's acids, bases and
// indicators, with every pH read from the simulation's own model.

import {
  ANALYTES,
  ANALYTE_VOLUME,
  INDICATORS,
  TITRANT_CONCENTRATION,
  titrantFor,
  type Analyte,
} from '~/constants/titrations';
import {
  numberChoices,
  pick,
  textChoices,
  type Course,
  type QuickQuestion,
  type Rng,
} from '~/utils/quest';
import { equivalenceVolumes, phAfter } from '~/utils/titrations';

// the equivalence point, then indicators and concentrations; the
// half-equivalence pH (pKa) is AP only
export const TITRATION_LEVELS: Record<Course, [number, number]> = {
  general: [1, 2],
  ap: [2, 3],
};

const CONCENTRATION = 0.1; // M, every analyte here
const NEUTRAL = 0.5; // pH within this of 7 counts as about 7
const VOLUME_MIN = 10; // mL, burette readings asked about
const VOLUME_SPAN = 30; // mL

// one proton each, so every mole ratio is 1 : 1
const SINGLE = ANALYTES.filter((a) => a.protons === 1);

const equivalencePh = (a: Analyte) =>
  phAfter(a, CONCENTRATION, equivalenceVolumes(a, CONCENTRATION)[0].volume);

const titration = (a: Analyte) =>
  `${a.name.toLowerCase()} titrated with ${titrantFor(a)}`;

/** Why the salt at equivalence is acidic, basic or neutral */
function saltReason(a: Analyte) {
  if (!a.pKas.length)
    return 'A strong acid and a strong base leave a neutral salt.';
  return a.kind === 'acid'
    ? `${a.name} is weak, so its conjugate base is left at equivalence and makes the solution basic.`
    : `${a.name} is weak, so its conjugate acid is left at equivalence and makes the solution acidic.`;
}

/** Is the pH at equivalence above, below or about 7? */
export function equivalenceQuestion(rng: Rng): QuickQuestion {
  const a = pick(rng, SINGLE);
  const pH = equivalencePh(a);
  const side =
    pH > 7 + NEUTRAL ? 'Above 7' : pH < 7 - NEUTRAL ? 'Below 7' : 'About 7';
  return {
    prompt: `For ${titration(a)}, where is the pH at the equivalence point?`,
    about: a.name,
    ...textChoices(rng, side, ['Above 7', 'Below 7', 'About 7']),
    explain: `${saltReason(a)} The pH at equivalence is about ${pH.toFixed(1)}.`,
  };
}

// analytes whose equivalence pH falls inside exactly one indicator's range
const inRange = (pH: number) =>
  INDICATORS.filter((i) => i.low <= pH && pH <= i.high);
const CLEAR = SINGLE.filter((a) => inRange(equivalencePh(a)).length === 1);

/** Which indicator changes colour at the equivalence point? */
export function indicatorQuestion(rng: Rng): QuickQuestion {
  const a = pick(rng, CLEAR);
  const pH = equivalencePh(a);
  const right = inRange(pH)[0];
  return {
    prompt: `Which indicator changes colour right at the equivalence point of ${titration(a)}?`,
    about: a.name,
    ...textChoices(
      rng,
      right.name,
      INDICATORS.map((i) => i.name),
    ),
    explain: `The equivalence point is near pH ${pH.toFixed(1)}, inside ${right.name.toLowerCase()}’s range of ${right.low} to ${right.high}.`,
  };
}

/** From a burette reading, what's the analyte's concentration? */
export function concentrationQuestion(rng: Rng): QuickQuestion {
  const a = pick(rng, SINGLE);
  const volume = Math.round((VOLUME_MIN + rng() * VOLUME_SPAN) * 10) / 10;
  const right = (TITRANT_CONCENTRATION * volume) / ANALYTE_VOLUME;
  const molar = (c: number) => `${c.toPrecision(3)} M`;
  return {
    prompt: `${ANALYTE_VOLUME.toFixed(1)} mL of ${a.name.toLowerCase()} needs ${volume.toFixed(1)} mL of ${TITRANT_CONCENTRATION.toFixed(3)} M ${titrantFor(a)} to reach the equivalence point. What is its concentration?`,
    about: a.name,
    ...numberChoices(
      rng,
      right,
      [
        (TITRANT_CONCENTRATION * ANALYTE_VOLUME) / volume, // the volumes swapped
        right * 2,
        right / 2,
        right * 10,
      ],
      molar,
    ),
    explain: `Moles of ${titrantFor(a)} = ${TITRANT_CONCENTRATION} M × ${volume.toFixed(1)} mL, and they react 1 : 1. Divide by the ${ANALYTE_VOLUME} mL in the flask: ${molar(right)}.`,
  };
}

/** What's the pH halfway to the equivalence point? (weak acids and bases) */
export function halfwayQuestion(rng: Rng): QuickQuestion {
  const a = pick(
    rng,
    SINGLE.filter((x) => x.pKas.length),
  );
  const pKa = a.pKas[0];
  const fixed = (n: number) => n.toFixed(2);
  return {
    prompt: `What is the pH halfway to the equivalence point of ${titration(a)}?`,
    about: a.name,
    ...textChoices(
      rng,
      fixed(pKa),
      [7, equivalencePh(a), phAfter(a, CONCENTRATION, 0), 14 - pKa].map(fixed),
    ),
    explain: `Halfway there, the ${a.kind === 'acid' ? 'acid and its conjugate base' : 'base and its conjugate acid'} are equal, so pH = pKa = ${fixed(pKa)}${a.kind === 'base' ? ' (the pKa of its conjugate acid)' : ''}.`,
  };
}

/** Strong or weak, acid or base? Strong ones ionize fully, so the lab gives them no pKa */
export function strengthQuestion(rng: Rng): QuickQuestion {
  const a = pick(rng, ANALYTES);
  const strength = a.pKas.length ? 'Weak' : 'Strong';
  return {
    prompt: `Is ${a.name.toLowerCase()} a strong or weak acid or base?`,
    about: a.name,
    ...textChoices(rng, `${strength} ${a.kind}`, [
      'Strong acid',
      'Weak acid',
      'Strong base',
      'Weak base',
    ]),
    explain: a.pKas.length
      ? `${a.name} only partly ${a.kind === 'acid' ? 'gives up its protons' : 'takes protons from water'}, so it’s a weak ${a.kind}.`
      : `${a.name} ionizes completely in water, so it’s a strong ${a.kind}.`,
  };
}

/** A Titration question: indicators at level 2, pKa at the halfway point at level 3 */
export function titrationQuestion(rng: Rng, level: number): QuickQuestion {
  const kinds =
    level === 1
      ? [equivalenceQuestion, strengthQuestion, concentrationQuestion]
      : level === 2
        ? [
            equivalenceQuestion,
            strengthQuestion,
            indicatorQuestion,
            concentrationQuestion,
          ]
        : [indicatorQuestion, concentrationQuestion, halfwayQuestion];
  return pick(rng, kinds)(rng);
}

/**
 * The Hydra's rooms titrate an unknown: strong acids and bases for General
 * Chemistry; weak ones for AP, where the indicator has to be chosen well
 */
export const titrationPool = (course: Course): Analyte[] =>
  SINGLE.filter((a) => (course === 'ap') === a.pKas.length > 0);

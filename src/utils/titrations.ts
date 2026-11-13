import { colord } from 'colord';
import {
  ANALYTE_VOLUME,
  BURETTE_CAPACITY,
  KW,
  TITRANT_CONCENTRATION,
  type Analyte,
  type Indicator,
} from '~/constants/titrations';

// bisection bounds on pH, and steps: 60 halvings of 18 pH units is far
// finer than the two decimals shown
const PH_MIN = -2;
const PH_MAX = 16;
const BISECTIONS = 60;

// an equivalence point counts as visible when the pH jumps at least this much
// within ±2% of its volume
const VISIBLE_JUMP = 1; // pH units
const VISIBLE_WINDOW = 0.02;

const ANSWER_TOLERANCE = 0.02; // ±2%

/**
 * The fraction of each protonation state of a weak acid HₙA at [H⁺] = h,
 * from fully protonated (0 protons lost) to fully deprotonated (n lost)
 */
function fractions(h: number, kas: number[]) {
  const terms = [1];
  for (const ka of kas) terms.push((terms[terms.length - 1] * ka) / h);
  const total = terms.reduce((s, t) => s + t, 0);
  return terms.map((t) => t / total);
}

/**
 * pH after adding `volume` mL of titrant to the flask, from the charge
 * balance [H⁺] + [Na⁺] = [OH⁻] + [Cl⁻] + (charge on the weak-acid species).
 * One equation covers strong, weak and polyprotic acids and weak bases, with
 * no buffer approximations, so it holds at every point of the titration.
 */
export function phAfter(
  analyte: Analyte,
  concentration: number,
  volume: number,
) {
  const total = ANALYTE_VOLUME + volume; // mL
  const analyteC = (concentration * ANALYTE_VOLUME) / total; // M after dilution
  const titrantC = (TITRANT_CONCENTRATION * volume) / total;

  // spectator ions: Na⁺ from NaOH, Cl⁻ from HCl, whichever side they're on
  const strong = analyte.pKas.length === 0;
  let sodium = 0;
  let chloride = 0;
  if (analyte.kind === 'acid') {
    sodium = titrantC;
    if (strong) chloride = analyteC;
  } else {
    chloride = titrantC;
    if (strong) sodium = analyteC;
  }

  // a weak base is counted as its conjugate acid (NH₄⁺), which carries +1
  // when fully protonated; a weak acid (CH₃COOH, H₃PO₄) is neutral
  const kas = analyte.pKas.map((pKa) => 10 ** -pKa);
  const startCharge = analyte.kind === 'base' ? 1 : 0;

  // net positive charge; it falls as pH rises, so bisect on its sign
  const netCharge = (pH: number) => {
    const h = 10 ** -pH;
    let charge = h + sodium - KW / h - chloride;
    if (!strong) {
      fractions(h, kas).forEach((f, lost) => {
        charge += analyteC * f * (startCharge - lost);
      });
    }
    return charge;
  };

  let lo = PH_MIN;
  let hi = PH_MAX;
  for (let i = 0; i < BISECTIONS; i++) {
    const mid = (lo + hi) / 2;
    if (netCharge(mid) > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Titrant needed to reach each equivalence point, in mL */
export function equivalenceVolumes(analyte: Analyte, concentration: number) {
  const perProton = (concentration * ANALYTE_VOLUME) / TITRANT_CONCENTRATION;
  return Array.from({ length: analyte.protons }, (_, i) => {
    const volume = perProton * (i + 1);
    const jump = Math.abs(
      phAfter(analyte, concentration, volume * (1 + VISIBLE_WINDOW)) -
        phAfter(analyte, concentration, volume * (1 - VISIBLE_WINDOW)),
    );
    return { volume, visible: jump >= VISIBLE_JUMP };
  });
}

/** The flask's colour at a pH, blended across the indicator's range */
export function indicatorColor(indicator: Indicator, pH: number) {
  const { low, high, colors } = indicator;
  const t = Math.min(1, Math.max(0, (pH - low) / (high - low)));
  const x = t * (colors.length - 1);
  const i = Math.min(Math.floor(x), colors.length - 2);
  const f = x - i;
  const a = colord(colors[i]).toRgb();
  const b = colord(colors[i + 1]).toRgb();
  const mix = (p: number, q: number) => p + (q - p) * f;
  const round = (v: number) => Math.round(v);
  return `rgba(${round(mix(a.r, b.r))}, ${round(mix(a.g, b.g))}, ${round(mix(a.b, b.b))}, ${+mix(a.a, b.a).toFixed(2)})`;
}

/** Whether a student's concentration is close enough to the real one */
export const checkAnswer = (answer: number, actual: number) =>
  Number.isFinite(answer) &&
  Math.abs(answer - actual) <= ANSWER_TOLERANCE * actual;

/** The flask's colour in words, for screen readers and Mr. G */
export function indicatorColorName(indicator: Indicator, pH: number) {
  const { low, high, colorNames } = indicator;
  if (pH <= low) return colorNames[0];
  if (pH >= high) return colorNames[colorNames.length - 1];
  return colorNames.length > 2 ? colorNames[1] : `pale ${colorNames[1]}`;
}

/** The volume added after running `amount` mL more from the burette */
export const addTitrant = (volume: number, amount: number) =>
  Math.round(Math.min(BURETTE_CAPACITY, volume + amount) * 100) / 100;

const CURVE_STEP = 0.1; // mL between plotted points
// pH within this of the pKa at half-equivalence counts as "pH = pKa"; a strong
// first proton (H₃PO₄'s) or one weaker than water (its third) misses it
const HALF_EQUIVALENCE_TOLERANCE = 0.1;

/** pH every 0.1 mL from the start to the volume added so far */
export function curvePoints(
  analyte: Analyte,
  concentration: number,
  upTo: number,
) {
  const points: { volume: number; pH: number }[] = [];
  for (let i = 0; i * CURVE_STEP < upTo - 1e-9; i++) {
    const volume = Math.round(i * CURVE_STEP * 100) / 100;
    points.push({ volume, pH: phAfter(analyte, concentration, volume) });
  }
  points.push({ volume: upTo, pH: phAfter(analyte, concentration, upTo) });
  return points;
}

/**
 * Halfway to each equivalence point, half the weak acid (or base) is
 * neutralised, so the buffer's pH equals its pKa. Only where that holds.
 */
export function halfEquivalences(analyte: Analyte, concentration: number) {
  const perProton = (concentration * ANALYTE_VOLUME) / TITRANT_CONCENTRATION;
  return analyte.pKas
    .map((pKa, i) => ({ volume: perProton * (i + 0.5), pKa }))
    .filter(
      ({ volume, pKa }) =>
        volume <= BURETTE_CAPACITY &&
        Math.abs(phAfter(analyte, concentration, volume) - pKa) <=
          HALF_EQUIVALENCE_TOLERANCE,
    );
}

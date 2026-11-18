import {
  AVOGADRO_ROUTE,
  BALLOON,
  CHARLES_ROUTE,
  COMBINED_ROUTE,
  DALTON_ROUTE,
  IDEAL_ROUTE,
  GAY_LUSSAC_ROUTE,
  ROUTE,
  type Leg,
  type Platform,
} from '~/constants/balloon-world';
import { AIR_MOLAR_MASS } from '~/constants/atmosphere';
import { ZERO_CELSIUS } from '~/constants/physical';
import { airAt } from '~/utils/atmosphere';
import { HELIUM_MOLAR_MASS, type Balloon, type Flight } from '~/utils/balloon';
import { solveGas } from '~/utils/gas-laws';
import { createRng } from '~/utils/quest';

// Each leg of a level: the platforms, and the balloon's helium as it sets off.
// The numbers are seeded, so a retry gets fresh ones and a test can replay them.

export type Law =
  | 'boyle'
  | 'charles'
  | 'gay-lussac'
  | 'avogadro'
  | 'combined'
  | 'ideal'
  | 'dalton';

export const LEGS_PER_LEVEL = ROUTE.length - 1;
export const BOYLE_LEGS = LEGS_PER_LEVEL;

const VALLEY_BELOW = 300; // m the land falls below the lower platform
const LOWEST_VALLEY = 100; // m above sea level
const TIE_OFF = [600, 900]; // m³: the volumes asked for, inside the envelope
const HEATER = [280, 295]; // K: where the heater holds the helium
const COOLED = [275, 288]; // K: the helium after resting on a platform
const WARM_UP = [15, 40]; // K the heater has to add to float
const FULL_PRESSURE = [2000, 6000]; // Pa over the air's, stretched full
// kg the balloon carried in, cargo and all, so dropping some still leaves
// more than the 600 kg rider, basket and fabric (game values)
const LOAD = [760, 840];
const CARGO = [80, 160]; // kg picked up or dropped off (game values)
const CARGO_STEP = 10; // kg
// kg on an ideal gas law leg, camping gear and all, so each morning's fill
// differs (game values)
const CAMP_LOAD = [620, 760];
// overnight, air seeps into the envelope and helium out (game values)
const AIR_LEAK = [1500, 4000]; // mol
const HELIUM_LOSS = [0.06, 0.12]; // of the helium
const MOLE_STEP = 100; // the helium counter reads in hundreds
// K: where the heater holds the helium before a climb into the cold, warm
// enough that turning it down still leaves it above freezing
const CLIMB_HEATER = [290, 300];
// K the heater drops for the climb: at least 9 after rounding to half a
// degree, so Boyle's law alone misses by more than the tolerance
const COOL_DOWN = [9.5, 14];

export interface GasLeg {
  law: Law;
  leg: Leg;
  moles: number; // mol of helium
  gasTemperature: number; // K, held steady by the heater
  envelope: number; // m³: the most the fabric stretches to
  payload: number; // kg: rider, basket, fabric, ballast and any cargo
  said: number; // the one number Mr. G gives: a volume (m³) or a pressure (Pa)
  cargo?: 'picked up' | 'dropped off';
  airMoles?: number; // mol of air leaked in, on a Dalton's law leg
}

const between = (rng: () => number, [low, high]: number[]) =>
  low + rng() * (high - low);
const toStep = (v: number, step: number) => Math.round(v / step) * step;

const legBetween = (from: Platform, to: Platform): Leg => ({
  from,
  to,
  valley: Math.max(
    LOWEST_VALLEY,
    Math.min(from.height, to.height) - VALLEY_BELOW,
  ),
});

export const seeded = (seed: number, index: number) =>
  createRng(Math.imul(seed, 0x9e3779b1) ^ index);

const molesFor = (p: number, v: number, t: number) =>
  toStep(solveGas({ p, v, t }).n, MOLE_STEP);

/**
 * The volume (m³) that floats a load at a height: the air it pushes aside
 * weighs as much as the load and the helium, ρ_air·V = m + V·ρ_He (Archimedes)
 */
function floatingVolume(height: number, load: number, t: number) {
  const air = airAt(height);
  // helium's density, ρ = PM/RT: the moles in one cubic metre, times M
  const helium = HELIUM_MOLAR_MASS * solveGas({ p: air.pressure, v: 1, t }).n;
  return load / (air.density - helium);
}

/**
 * A Boyle's law leg: the heater holds the temperature and the tank's shut,
 * so as the balloon climbs into thinner air it expands, P₁V₁ = P₂V₂. Mr. G
 * ties the envelope off at a volume; the balloon stops expanding there, and
 * he holds it at that height to drift across.
 */
function boyleBetween(from: Platform, to: Platform, rng: () => number): GasLeg {
  const gasTemperature = Math.round(between(rng, HEATER) * 2) / 2;
  // pick the volume it'll have at the next stop, then the helium that gives it
  const target = between(rng, TIE_OFF);
  const moles = molesFor(airAt(to.height).pressure, target, gasTemperature);
  return {
    law: 'boyle',
    leg: legBetween(from, to),
    moles,
    gasTemperature,
    envelope: BALLOON.fullVolume,
    payload: BALLOON.payload,
    said: target,
  };
}

/**
 * A Charles's law leg: level with the next platform, the tank shut. Cooled
 * from resting, the balloon's too small to lift; heated, it expands at the
 * same pressure until it's big enough to float, V₁/T₁ = V₂/T₂.
 */
function charlesBetween(
  from: Platform,
  to: Platform,
  rng: () => number,
): GasLeg {
  const gasTemperature = Math.round(between(rng, COOLED) * 2) / 2;
  const warm = gasTemperature + between(rng, WARM_UP);
  const { pressure } = airAt(from.height);
  // the helium that floats the load at the warmer temperature
  const moles = molesFor(
    pressure,
    floatingVolume(from.height, BALLOON.payload, warm),
    warm,
  );
  return {
    law: 'charles',
    leg: legBetween(from, to),
    moles,
    gasTemperature,
    envelope: BALLOON.fullVolume,
    payload: BALLOON.payload,
    said: Math.round(floatingVolume(from.height, BALLOON.payload, warm)),
  };
}

/**
 * An Avogadro's law leg: level with the next platform, the heater holding the
 * temperature. Cargo comes on or off, so the volume that floats changes, and
 * Mr. G tops up from the tank or vents: V₁/n₁ = V₂/n₂.
 */
function avogadroBetween(
  from: Platform,
  to: Platform,
  rng: () => number,
): GasLeg {
  const gasTemperature = Math.round(between(rng, HEATER) * 2) / 2;
  const before = between(rng, LOAD);
  const { pressure } = airAt(from.height);
  // it floated in carrying the old load
  const moles = molesFor(
    pressure,
    floatingVolume(from.height, before, gasTemperature),
    gasTemperature,
  );
  const cargo = rng() < 0.5 ? 'picked up' : 'dropped off';
  const change = toStep(between(rng, CARGO), CARGO_STEP);
  const payload = toStep(
    before + (cargo === 'picked up' ? change : -change),
    CARGO_STEP,
  );
  return {
    law: 'avogadro',
    leg: legBetween(from, to),
    moles,
    gasTemperature,
    envelope: BALLOON.fullVolume,
    payload,
    said: Math.round(floatingVolume(from.height, payload, gasTemperature)),
    cargo,
  };
}

/**
 * A Gay-Lussac's law leg: stretched full under a heavy load, so the volume
 * can't change. The sun heats the helium and its pressure climbs toward the
 * gauge's red line, P₁/T₁ = P₂/T₂.
 */
function gayLussacBetween(
  from: Platform,
  to: Platform,
  rng: () => number,
): GasLeg {
  const gasTemperature = Math.round(between(rng, COOLED) * 2) / 2;
  const air = airAt(from.height);
  const envelope = BALLOON.fullVolume;
  const moles = molesFor(
    air.pressure + between(rng, FULL_PRESSURE),
    envelope,
    gasTemperature,
  );
  // loaded so that, stretched full, it just floats here
  const payload = air.density * envelope - moles * HELIUM_MOLAR_MASS;
  return {
    law: 'gay-lussac',
    leg: legBetween(from, to),
    moles,
    gasTemperature,
    envelope,
    payload,
    // the red line, as the gauge reads it, to 0.1 kPa
    said: Math.round((air.pressure + BALLOON.burstOverpressure) / 100) * 100,
  };
}

/**
 * A combined gas law leg: a long climb into colder air, the tank shut. The
 * air thins, so the balloon expands, but Mr. G turns the heater down for the
 * cold, so the helium cools and shrinks a little too: P₁V₁/T₁ = P₂V₂/T₂. He
 * ties the envelope off at a volume, as on a Boyle's law leg, and holds it
 * at the height where it stops expanding.
 */
function combinedBetween(
  from: Platform,
  to: Platform,
  rng: () => number,
): GasLeg {
  const gasTemperature = Math.round(between(rng, CLIMB_HEATER) * 2) / 2;
  // the heater's new setting, in whole or half degrees Celsius as he says it
  const said =
    ZERO_CELSIUS +
    Math.round((gasTemperature - between(rng, COOL_DOWN) - ZERO_CELSIUS) * 2) /
      2;
  const target = between(rng, TIE_OFF);
  return {
    law: 'combined',
    leg: legBetween(from, to),
    moles: molesFor(airAt(to.height).pressure, target, said),
    gasTemperature,
    envelope: BALLOON.fullVolume,
    payload: BALLOON.payload,
    said,
  };
}

/**
 * An ideal gas law leg: the balloon was packed away overnight, so it starts
 * empty, with no volume or moles to scale from. Mr. G needs it filled to the
 * volume that floats here; the student finds the moles from the air pressure
 * and the helium's temperature: PV = nRT.
 */
function idealBetween(from: Platform, to: Platform, rng: () => number): GasLeg {
  const gasTemperature = Math.round(between(rng, HEATER) * 2) / 2;
  const payload = toStep(between(rng, CAMP_LOAD), CARGO_STEP);
  return {
    law: 'ideal',
    leg: legBetween(from, to),
    moles: 0,
    gasTemperature,
    envelope: BALLOON.fullVolume,
    payload,
    said: Math.round(floatingVolume(from.height, payload, gasTemperature)),
  };
}

/**
 * A Dalton's law leg: overnight, air seeped into the envelope and some helium
 * out. The air's heavier, so the balloon must be bigger to float, and it
 * stays in: Mr. G tops up or vents helium. Each gas fills the space as if
 * alone, so the air's moles come from its own partial pressure, and the
 * helium is the rest of the moles that fill the volume he needs.
 */
function daltonBetween(
  from: Platform,
  to: Platform,
  rng: () => number,
): GasLeg {
  const gasTemperature = Math.round(between(rng, HEATER) * 2) / 2;
  const { pressure } = airAt(from.height);
  // it floated in on helium alone
  const before = molesFor(
    pressure,
    floatingVolume(from.height, BALLOON.payload, gasTemperature),
    gasTemperature,
  );
  const moles = toStep(before * (1 - between(rng, HELIUM_LOSS)), MOLE_STEP);
  const airMoles = toStep(between(rng, AIR_LEAK), MOLE_STEP);
  // the air weighs what it does less the helium it stands in for
  const extra = airMoles * (AIR_MOLAR_MASS - HELIUM_MOLAR_MASS);
  return {
    law: 'dalton',
    leg: legBetween(from, to),
    moles,
    airMoles,
    gasTemperature,
    envelope: BALLOON.fullVolume,
    payload: BALLOON.payload,
    said: Math.round(
      floatingVolume(from.height, BALLOON.payload + extra, gasTemperature),
    ),
  };
}

type Builder = (from: Platform, to: Platform, rng: () => number) => GasLeg;

/** Each law's leg between any two platforms, for a route of mixed laws */
export const BUILDERS: Record<Law, Builder> = {
  boyle: boyleBetween,
  charles: charlesBetween,
  'gay-lussac': gayLussacBetween,
  avogadro: avogadroBetween,
  combined: combinedBetween,
  ideal: idealBetween,
  dalton: daltonBetween,
};

/** A level's legs along its own route, the numbers seeded per leg */
const onRoute =
  (route: Platform[], build: Builder) => (index: number, seed: number) =>
    build(route[index], route[index + 1], seeded(seed, index));

export const boyleLeg = onRoute(ROUTE, boyleBetween);
export const charlesLeg = onRoute(CHARLES_ROUTE, charlesBetween);
export const gayLussacLeg = onRoute(GAY_LUSSAC_ROUTE, gayLussacBetween);
export const avogadroLeg = onRoute(AVOGADRO_ROUTE, avogadroBetween);
export const combinedLeg = onRoute(COMBINED_ROUTE, combinedBetween);
export const idealLeg = onRoute(IDEAL_ROUTE, idealBetween);
export const daltonLeg = onRoute(DALTON_ROUTE, daltonBetween);

/** Whether Mr. G ties the envelope off at the answer, as a volume */
export const tiesOff = (g: GasLeg) => g.law === 'boyle' || g.law === 'combined';

/** The helium's temperature (K) as it arrives: the heater's new setting, if he turns it */
export const arrivalTemperature = (g: GasLeg) =>
  g.law === 'combined' ? g.said : g.gasTemperature;

/** Resting on its platform, ready to go */
export const startFlight = (g: GasLeg): Flight => ({
  moles: g.moles,
  airMoles: g.airMoles,
  gasTemperature: g.gasTemperature,
  height: g.leg.from.height,
  speed: 0,
});

/** The balloon, tied off at a volume (m³) if Mr. G has tied it */
export const balloonFor = (g: GasLeg, tiedAt?: number): Balloon => ({
  ...BALLOON,
  payload: g.payload,
  fullVolume: Math.min(tiedAt ?? g.envelope, g.envelope),
});

/** The volume (m³) it'll have at the next stop's air pressure: the answer */
export const tieOffVolume = (g: GasLeg) =>
  solveGas({
    p: airAt(g.leg.to.height).pressure,
    n: g.moles,
    t: arrivalTemperature(g),
  }).v;

/** The answer to a leg, in SI: m³ to tie off at, K for the heater, mol for the tank */
export function rightAnswer(g: GasLeg): number {
  const now = solveGas({
    p: airAt(g.leg.from.height).pressure,
    n: g.moles,
    t: g.gasTemperature,
  });
  switch (g.law) {
    case 'boyle':
    case 'combined':
      return tieOffVolume(g);
    case 'charles':
      return (g.gasTemperature * g.said) / now.v;
    case 'avogadro':
      return (g.moles * g.said) / now.v;
    case 'ideal':
      return solveGas({
        p: airAt(g.leg.from.height).pressure,
        v: g.said,
        t: g.gasTemperature,
      }).n;
    case 'dalton':
      // all the moles that fill the volume at the total pressure, less the air's
      return (
        solveGas({
          p: airAt(g.leg.from.height).pressure,
          v: g.said,
          t: g.gasTemperature,
        }).n - g.airMoles!
      );
    case 'gay-lussac': {
      const full = solveGas({ v: g.envelope, n: g.moles, t: g.gasTemperature });
      return (g.gasTemperature * g.said) / full.p;
    }
  }
}

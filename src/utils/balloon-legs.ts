import { BALLOON, ROUTE, type Leg } from '~/constants/balloon-world';
import { airAt } from '~/utils/atmosphere';
import type { Balloon, Flight } from '~/utils/balloon';
import { solveGas } from '~/utils/gas-laws';
import { createRng } from '~/utils/quest';

// Each leg of a level: the platforms, and the balloon's helium as it sets off.
// The numbers are seeded, so a retry gets fresh ones and a test can replay them.

export const BOYLE_LEGS = ROUTE.length - 1;

const VALLEY_BELOW = 300; // m the land falls below the lower platform
const LOWEST_VALLEY = 100; // m above sea level
const TIE_OFF = [600, 900]; // m³: the volumes asked for, inside the envelope
const HEATER = [280, 295]; // K: where the heater holds the helium
const MOLE_STEP = 100; // the helium counter reads in hundreds

export interface GasLeg {
  leg: Leg;
  moles: number; // mol of helium
  gasTemperature: number; // K, held steady by the heater
  envelope: number; // m³: the most the fabric stretches to
}

const between = (rng: () => number, [low, high]: number[]) =>
  low + rng() * (high - low);

/**
 * A Boyle's law leg: the heater holds the temperature and the tank's shut,
 * so as the balloon climbs into thinner air it expands, P₁V₁ = P₂V₂. Mr. G
 * ties the envelope off at a volume; the balloon stops expanding there, and
 * he holds it at that height to drift across.
 */
export function boyleLeg(index: number, seed: number): GasLeg {
  const rng = createRng(Math.imul(seed, 0x9e3779b1) ^ index);
  const from = ROUTE[index];
  const to = ROUTE[index + 1];
  const gasTemperature = Math.round(between(rng, HEATER) * 2) / 2;
  // pick the volume it'll have at the next stop, then the helium that gives it
  const target = between(rng, TIE_OFF);
  const moles =
    Math.round(
      solveGas({ p: airAt(to.height).pressure, v: target, t: gasTemperature })
        .n / MOLE_STEP,
    ) * MOLE_STEP;
  return {
    leg: {
      from,
      to,
      valley: Math.max(
        LOWEST_VALLEY,
        Math.min(from.height, to.height) - VALLEY_BELOW,
      ),
    },
    moles,
    gasTemperature,
    envelope: BALLOON.fullVolume,
  };
}

/** Resting on its platform, ready to go */
export const startFlight = (g: GasLeg): Flight => ({
  moles: g.moles,
  gasTemperature: g.gasTemperature,
  height: g.leg.from.height,
  speed: 0,
});

/** The balloon, tied off at a volume (m³) if Mr. G has tied it */
export const balloonFor = (g: GasLeg, tiedAt?: number): Balloon => ({
  ...BALLOON,
  fullVolume: Math.min(tiedAt ?? g.envelope, g.envelope),
});

/** The volume (m³) it'll have at the next stop's air pressure: the answer */
export const tieOffVolume = (g: GasLeg) =>
  solveGas({
    p: airAt(g.leg.to.height).pressure,
    n: g.moles,
    t: g.gasTemperature,
  }).v;

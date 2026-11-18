import { AIR_MOLAR_MASS, STANDARD_GRAVITY } from '~/constants/atmosphere';
import { ELEMENTS } from '~/constants/elements';
import { airAt } from '~/utils/atmosphere';
import { solveGas } from '~/utils/gas-laws';

// A sealed helium balloon. While slack, its gas sits at the air's pressure
// and fills V = nRT/P; once the fabric is stretched full, the volume is fixed
// and the gas pressure climbs instead. It floats when the air it pushes aside
// weighs as much as it does (Archimedes).

// game estimates, not measured values
const DRAG_COEFFICIENT = 0.5; // a sphere's, roughly, at these speeds
const TOP = 20000; // m; the highest float height looked for
const SEARCH_STEP = 10; // m between checks when looking for the float height

export const HELIUM_MOLAR_MASS =
  ELEMENTS.find((e) => e.symbol === 'He')!.atomicMass! / 1000; // kg/mol

export interface Balloon {
  fullVolume: number; // m³, stretched full
  burstOverpressure: number; // Pa above the outside air it can hold
  payload: number; // kg: the rider, basket, fabric and ballast
  leakTest?: number; // mol/min of air through a test patch of the fabric
}

export interface Flight {
  moles: number; // mol of helium
  airMoles?: number; // mol of air leaked in, mixed with the helium
  gasTemperature: number; // K, held by the heater
  height: number; // m above sea level
  speed: number; // m/s, upwards
  burst?: boolean;
}

export interface GasInside {
  pressure: number; // Pa
  volume: number; // m³
  taut: boolean; // stretched full
  burst: boolean;
}

/** The gas's pressure and volume where the balloon is now */
export function gasInside(balloon: Balloon, flight: Flight): GasInside {
  const air = airAt(flight.height);
  // Dalton's law: each gas fills the space as if alone, so the moles add
  const n = flight.moles + (flight.airMoles ?? 0);
  const t = flight.gasTemperature;
  const slack = solveGas({ p: air.pressure, n, t }).v;
  if (slack <= balloon.fullVolume)
    return { pressure: air.pressure, volume: slack, taut: false, burst: false };
  const pressure = solveGas({ v: balloon.fullVolume, n, t }).p;
  return {
    pressure,
    volume: balloon.fullVolume,
    taut: true,
    burst: pressure - air.pressure > balloon.burstOverpressure,
  };
}

const mass = (balloon: Balloon, flight: Flight) =>
  balloon.payload +
  flight.moles * HELIUM_MOLAR_MASS +
  (flight.airMoles ?? 0) * AIR_MOLAR_MASS;

/** Upward force (N) at a height: buoyancy less weight */
function netLift(balloon: Balloon, flight: Flight) {
  if (flight.burst) return -mass(balloon, flight) * STANDARD_GRAVITY;
  const { volume } = gasInside(balloon, flight);
  const displaced = airAt(flight.height).density * volume;
  return (displaced - mass(balloon, flight)) * STANDARD_GRAVITY;
}

/** Whether it can rise from where it rests */
export const liftOff = (balloon: Balloon, flight: Flight) =>
  netLift(balloon, flight) > 0;

/** One time step (s) of flight; the ground at 0 m stops it */
export function step(balloon: Balloon, flight: Flight, dt: number): Flight {
  const burst = flight.burst || gasInside(balloon, flight).burst;
  const f = { ...flight, burst };
  const m = mass(balloon, f);
  const { volume } = gasInside(balloon, f);
  const area = Math.PI * ((3 * volume) / (4 * Math.PI)) ** (2 / 3);
  // air drag, ½ρCdAv², always against the motion
  const drag =
    0.5 *
    airAt(f.height).density *
    DRAG_COEFFICIENT *
    area *
    f.speed *
    Math.abs(f.speed);
  const speed = f.speed + ((netLift(balloon, f) - drag) / m) * dt;
  const height = f.height + speed * dt;
  if (height <= 0) return { ...f, height: 0, speed: 0 };
  return { ...f, height, speed };
}

/**
 * Where it settles: the height its lift falls to nothing, or null if it can't
 * rise. Below the float height it climbs, above it it sinks.
 */
export function floatHeight(balloon: Balloon, flight: Flight): number | null {
  const at = (height: number) => netLift(balloon, { ...flight, height });
  if (at(flight.height) <= 0) return null;
  let low = flight.height;
  while (low < TOP && at(low + SEARCH_STEP) > 0) low += SEARCH_STEP;
  let high = low + SEARCH_STEP;
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    if (at(mid) > 0) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

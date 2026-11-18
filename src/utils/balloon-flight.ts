import { airAt, heightAt } from '~/utils/atmosphere';
import {
  floatHeight,
  gasInside,
  type Balloon,
  type Flight,
} from '~/utils/balloon';
import { SKY_ROOM, groundAt } from '~/utils/balloon-camera';
import { solveGas } from '~/utils/gas-laws';
import {
  balloonFor,
  rightAnswer,
  startFlight,
  type GasLeg,
} from '~/utils/balloon-legs';

// A leg flown on the student's answer, which goes in as the control it
// describes: the volume Mr. G ties off at, the heater's temperature, the
// helium kept, or where the vent opens. Real physics decides where that
// takes the balloon; Mr. G only trims an answer that's within rounding.

export type Outcome = 'landed' | 'over' | 'short' | 'burst';

export const TOLERANCE = 0.02; // an answer within 2% lands: rounding the readings is fine
const CLIMB = 0.4; // of the flight spent climbing, or heating up
const SINK = 0.25; // of a short flight spent sinking back down
const OVERSHOOT = 600; // m past the platform a balloon that's too high drifts
const CLEARANCE = 20; // m the basket needs above the ground
// m above the platform: below the top of the scene's sky
export const MAX_OVERSHOOT = SKY_ROOM - 200;
const MIN_OVERSHOOT = 150; // m: too high is always high enough to see
const SCAN_STEP = 10; // m
const BURST_AT = 0.5; // of the way across, where an overheated balloon bursts
const VENTED_AT = 0.7; // of the way across, where a vented balloon runs out of lift
const SUN = 1.05; // the sun heats the helium this far past the red line
const ESCAPE = 0.1; // of the flight it takes a burst balloon's helium to escape

export interface FlightPlan {
  answer: number; // SI, what the student answered
  tiedAt?: number; // m³, on a Boyle's law leg
  outcome: Outcome;
  cruise: number; // m: the height it holds
  stopAt: number; // m along the route, where the flight ends
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The answer put to work: the helium as it flies */
function controlled(g: GasLeg, answer: number): Flight {
  const start = startFlight(g);
  if (g.law === 'charles') return { ...start, gasTemperature: answer };
  if (g.law === 'avogadro') return { ...start, moles: answer };
  return start;
}

/** Where the balloon stops expanding: the height whose air pressure is nRT/V */
function tiedHeight(g: GasLeg, tiedAt: number) {
  const now = gasInside(balloonFor(g), startFlight(g)).volume;
  if (tiedAt <= now) return g.leg.from.height; // already that big: no lift to climb
  const p = solveGas({ v: tiedAt, n: g.moles, t: g.gasTemperature }).p;
  return Math.max(g.leg.from.height, heightAt(p));
}

/** The helium's temperature (K) at the red line: any hotter and it bursts */
const burstTemperature = (g: GasLeg) =>
  solveGas({
    p: airAt(g.leg.from.height).pressure + balloonFor(g).burstOverpressure,
    v: g.envelope,
    n: g.moles,
  }).t;

/** Too high to land: it holds well above the platform, but in sight */
const tooHigh = (g: GasLeg, height: number) =>
  Math.min(
    Math.max(height, g.leg.to.height + MIN_OVERSHOOT),
    g.leg.to.height + MAX_OVERSHOOT,
  );

export function planFlight(g: GasLeg, answer: number): FlightPlan {
  const { from, to } = g.leg;
  const span = to.distance - from.distance;
  const tiedAt = g.law === 'boyle' ? Math.min(answer, g.envelope) : undefined;
  const error = (tiedAt ?? answer) / rightAnswer(g) - 1;
  const plan = { answer, tiedAt };
  if (Math.abs(error) <= TOLERANCE)
    // Mr. G trims the last few metres, as a pilot does with ballast
    return {
      ...plan,
      outcome: 'landed',
      cruise: to.height,
      stopAt: to.distance,
    };

  if (g.law === 'gay-lussac')
    // too hot, it bursts on the way; too cool, he vents helium it needed
    return {
      ...plan,
      outcome: error > 0 ? 'burst' : 'short',
      cruise: from.height,
      stopAt: from.distance + (error > 0 ? BURST_AT : VENTED_AT) * span,
    };

  if (g.law !== 'boyle') {
    // too small to float, it never leaves the platform
    if (error < 0)
      return {
        ...plan,
        outcome: 'short',
        cruise: from.height,
        stopAt: from.distance,
      };
    // bigger than it needs, it has lift to spare and climbs till it floats
    const floats = floatHeight(balloonFor(g), controlled(g, answer));
    return {
      ...plan,
      outcome: 'over',
      cruise: tooHigh(g, floats ?? to.height),
      stopAt: to.distance + OVERSHOOT,
    };
  }

  const tied = tiedHeight(g, tiedAt!);
  if (error > 0)
    return {
      ...plan,
      outcome: 'over',
      cruise: tooHigh(g, tied),
      stopAt: to.distance + OVERSHOOT,
    };
  if (tied === from.height)
    return { ...plan, outcome: 'short', cruise: tied, stopAt: from.distance };
  // too low to clear the land rising to the platform: it stops at the slope
  let d = (from.distance + to.distance) / 2;
  while (d < to.distance && groundAt(g.leg, d) + CLEARANCE < tied)
    d += SCAN_STEP;
  return { ...plan, outcome: 'short', cruise: tied, stopAt: d - 4 * SCAN_STEP };
}

const sinks = (plan: FlightPlan) =>
  plan.outcome === 'short' || plan.outcome === 'burst';

/** Where the balloon is at a point through the flight, t from 0 to 1 */
export function flightAt(g: GasLeg, plan: FlightPlan, t: number) {
  const { from } = g.leg;
  if (plan.stopAt === from.distance)
    return { distance: from.distance, height: from.height };
  const travel = sinks(plan) ? 1 - SINK : 1;
  const along = Math.min(1, t / travel);
  const distance = lerp(from.distance, plan.stopAt, along);
  const climbed = lerp(
    from.height,
    plan.cruise,
    smooth(Math.min(1, t / CLIMB)),
  );
  if (t <= travel) return { distance, height: climbed };
  // out of lift, it sinks to the ground
  const sunk = smooth((t - travel) / SINK);
  return {
    distance,
    height: lerp(plan.cruise, groundAt(g.leg, distance), sunk),
  };
}

/** A Gay-Lussac's law leg's helium: the sun heats it, and Mr. G vents at the answer */
function sunlit(g: GasLeg, plan: FlightPlan, t: number): Partial<Flight> {
  const t1 = g.gasTemperature;
  const line = burstTemperature(g);
  // landing, it never quite passes the line; otherwise the sun takes it past
  const peak =
    plan.outcome === 'landed'
      ? Math.min(plan.answer, line * 0.999)
      : line * SUN;
  const heatedAt = (at: number) =>
    lerp(t1, peak, smooth(Math.min(1, at / CLIMB)));
  const heated = heatedAt(t);
  if (plan.outcome === 'burst') {
    // the moment it passes the line, found by halving: heating only rises
    let low = 0;
    let high = CLIMB;
    for (let i = 0; i < 30; i++) {
      const mid = (low + high) / 2;
      if (heatedAt(mid) > line) high = mid;
      else low = mid;
    }
    if (t < high) return { gasTemperature: heated };
    // torn open, the helium rushes out
    const left = Math.max(0, 1 - (t - high) / ESCAPE);
    return { gasTemperature: heated, moles: g.moles * left, burst: true };
  }
  if (plan.outcome !== 'short') return { gasTemperature: heated };
  // vented: past the answer he lets helium out to hold the pressure there,
  // then over the far side it cools, with too little helium left to stay full
  const cooling = smooth(Math.max(0, (t - (1 - SINK)) / SINK));
  return {
    gasTemperature: lerp(heated, t1, cooling),
    moles: g.moles * Math.min(1, plan.answer / heated),
  };
}

/** Everything the scene draws at a point through the flight, or at rest */
export function flightState(
  g: GasLeg,
  plan: FlightPlan | undefined,
  t: number,
): { balloon: Balloon; flight: Flight; distance: number } {
  const start = startFlight(g);
  if (!plan)
    return {
      balloon: balloonFor(g),
      flight: start,
      distance: g.leg.from.distance,
    };
  const at = flightAt(g, plan, t);
  const ramp = smooth(Math.min(1, t / CLIMB));
  const answered = controlled(g, plan.answer);
  const gas: Partial<Flight> = {
    boyle: {},
    charles: {
      gasTemperature: lerp(start.gasTemperature, answered.gasTemperature, ramp),
    },
    avogadro: { moles: lerp(start.moles, answered.moles, ramp) },
    'gay-lussac': g.law === 'gay-lussac' ? sunlit(g, plan, t) : {},
  }[g.law];
  return {
    balloon: balloonFor(g, plan.tiedAt),
    flight: { ...start, ...gas, height: at.height },
    distance: at.distance,
  };
}

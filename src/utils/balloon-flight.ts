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
  arrivalTemperature,
  rightAnswer,
  startFlight,
  tiesOff,
  type GasLeg,
} from '~/utils/balloon-legs';

// A leg flown on the student's answer, which goes in as the control it
// describes: the volume Mr. G ties off at, the heater's temperature, the
// helium kept, or where the vent opens. Real physics decides where that
// takes the balloon; Mr. G only trims an answer that's within rounding.

export type Outcome = 'landed' | 'over' | 'short' | 'burst';

export const TOLERANCE = 0.02; // an answer within 2% lands: rounding the readings is fine
const CLIMB = 0.4; // of the flight spent heating up, or filling and venting
const RISE = 0.6; // of the flight spent rising to its height
const ARC = 120; // m the flight arcs above a straight climb, at its middle
const SINK = 0.25; // of a short flight spent sinking back down
const DRIFT = 0.1; // of the leg a burst balloon drifts on while it falls
const FALL = 0.3; // of the flight a burst balloon takes to hit the ground
const OVERSHOOT = 600; // m past the platform a balloon that's too high drifts
const CLEARANCE = 20; // m the basket needs above the ground
// m above the platform: below the top of the scene's sky
export const MAX_OVERSHOOT = SKY_ROOM - 200;
const MIN_OVERSHOOT = 150; // m: too high is always high enough to see
const SCAN_STEP = 10; // m
const VENTED_AT = 0.7; // of the way across, where a vented balloon runs out of lift
const SUN = 1.05; // the sun heats the helium this far past the red line
const LANDING_MARGIN = 0.98; // of the red line's temperature, where a good vent holds it
const ESCAPE = 0.1; // of the flight it takes a burst balloon's helium to escape

export interface FlightPlan {
  answer: number; // SI, what the student answered
  tiedAt?: number; // m³, on a Boyle's law leg
  outcome: Outcome;
  cruise: number; // m: the height it holds
  stopAt: number; // m along the route, where the flight ends
  popsAt?: number; // of the flight, when a burst balloon tears open
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The answer put to work: the helium as it flies */
function controlled(g: GasLeg, answer: number): Flight {
  const start = startFlight(g);
  if (g.law === 'charles') return { ...start, gasTemperature: answer };
  if (g.law === 'avogadro' || g.law === 'ideal' || g.law === 'dalton')
    return { ...start, moles: answer };
  return start;
}

/** Where the balloon stops expanding: the height whose air pressure is nRT/V */
function tiedHeight(g: GasLeg, tiedAt: number) {
  // at the helium's temperature as it arrives, if Mr. G turns the heater
  const t = arrivalTemperature(g);
  const now = gasInside(balloonFor(g), {
    ...startFlight(g),
    gasTemperature: t,
  }).volume;
  if (tiedAt <= now) return g.leg.from.height; // already that big: no lift to climb
  const p = solveGas({ v: tiedAt, n: g.moles, t }).p;
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
  const tiedAt = tiesOff(g) ? Math.min(answer, g.envelope) : undefined;
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

  if (g.law === 'gay-lussac') {
    // too cool, he vents helium it needed, and it sinks once it cools
    if (error < 0)
      return {
        ...plan,
        outcome: 'short',
        cruise: from.height,
        stopAt: from.distance + VENTED_AT * span,
      };
    // too hot, it bursts on the way, as the sun heats it past the red line
    const popsAt = popTime(g);
    return {
      ...plan,
      outcome: 'burst',
      cruise: from.height,
      popsAt,
      stopAt: from.distance + (smooth(popsAt) + DRIFT * (1 - popsAt)) * span,
    };
  }

  if (!tiesOff(g)) {
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

/** The sun's heating through a Gay-Lussac's law leg: up to a peak, then holding */
const sunHeat = (g: GasLeg, peak: number, t: number) =>
  lerp(g.gasTemperature, peak, smooth(Math.min(1, t / CLIMB)));

/** When, through the flight, the sun heats the helium past the red line */
function popTime(g: GasLeg) {
  const line = burstTemperature(g);
  // halving: the heat only rises
  let low = 0;
  let high = CLIMB;
  for (let i = 0; i < 30; i++) {
    const mid = (low + high) / 2;
    if (sunHeat(g, line * SUN, mid) > line) high = mid;
    else low = mid;
  }
  return high;
}

/**
 * Where the balloon is at a point through the flight, t from 0 to 1. It eases
 * off and in, rising to its height in a gentle arc that comes back down onto
 * where it's headed. Out of lift, it sinks; burst, it falls from that moment.
 */
export function flightAt(g: GasLeg, plan: FlightPlan, t: number) {
  const { from, to } = g.leg;
  if (plan.stopAt === from.distance)
    return { distance: from.distance, height: from.height };
  if (t >= 1 && plan.outcome === 'landed')
    return { distance: to.distance, height: to.height };
  // a burst balloon was heading for the platform when it popped
  const aim = plan.outcome === 'burst' ? to.distance : plan.stopAt;
  const glide = (at: number) => ({
    distance: lerp(from.distance, aim, smooth(at)),
    height:
      lerp(from.height, plan.cruise, smooth(Math.min(1, at / RISE))) +
      ARC * Math.sin(Math.PI * at),
  });
  const fallAt =
    plan.outcome === 'burst'
      ? plan.popsAt!
      : plan.outcome === 'short'
        ? 1 - SINK
        : 1;
  if (t <= fallAt) return glide(t);
  const start = glide(fallAt);
  const s = (t - fallAt) / (1 - fallAt);
  if (plan.outcome === 'burst') {
    // nothing holding it up: it falls faster and faster, drifting a little,
    // and lies on the ground for the rest of the flight
    const fell = Math.min(1, (t - fallAt) / FALL);
    const distance = lerp(start.distance, plan.stopAt, Math.sqrt(fell));
    return {
      distance,
      height: lerp(start.height, groundAt(g.leg, distance), fell * fell),
    };
  }
  // out of lift, it sinks gently to the ground
  const distance = glide(t).distance;
  return {
    distance,
    height: lerp(start.height, groundAt(g.leg, distance), smooth(s)),
  };
}

/** A Gay-Lussac's law leg's helium: the sun heats it, and Mr. G vents at the answer */
function sunlit(
  g: GasLeg,
  plan: FlightPlan,
  t: number,
  height: number, // m, where it is now
): Partial<Flight> {
  const t1 = g.gasTemperature;
  const line = burstTemperature(g);
  // landing, Mr. G vents a touch under the line, leaving room for the arc's
  // thinner air up top; otherwise the sun takes it past
  const peak =
    plan.outcome === 'landed'
      ? Math.min(plan.answer, line) * LANDING_MARGIN
      : line * SUN;
  const heated = sunHeat(g, peak, t);
  if (plan.outcome === 'burst') {
    const popsAt = plan.popsAt!;
    if (t < popsAt) return { gasTemperature: heated };
    // torn open, the helium rushes out, and the outside air takes its place
    // round the thermometer
    const left = Math.max(0, 1 - (t - popsAt) / ESCAPE);
    return {
      gasTemperature: lerp(airAt(height).temperature, heated, left),
      moles: g.moles * left,
      burst: true,
    };
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
    // turned down, the heater lets the helium cool all the way up
    combined: {
      gasTemperature: lerp(
        start.gasTemperature,
        arrivalTemperature(g),
        smooth(t),
      ),
    },
    charles: {
      gasTemperature: lerp(start.gasTemperature, answered.gasTemperature, ramp),
    },
    avogadro: { moles: lerp(start.moles, answered.moles, ramp) },
    ideal: { moles: lerp(start.moles, answered.moles, ramp) },
    dalton: { moles: lerp(start.moles, answered.moles, ramp) },
    'gay-lussac': g.law === 'gay-lussac' ? sunlit(g, plan, t, at.height) : {},
  }[g.law];
  return {
    balloon: balloonFor(g, plan.tiedAt),
    flight: { ...start, ...gas, height: at.height },
    distance: at.distance,
  };
}

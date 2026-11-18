import { AIR_MOLAR_MASS } from '~/constants/atmosphere';
import { HELIUM_VAN_DER_WAALS } from '~/constants/van-der-waals';
import { GAS_CONSTANT, ZERO_CELSIUS } from '~/constants/physical';
import { airAt } from '~/utils/atmosphere';
import { HELIUM_MOLAR_MASS, gasInside } from '~/utils/balloon';
import type { FlightPlan } from '~/utils/balloon-flight';
import {
  balloonFor,
  startFlight,
  tiesOff,
  type GasLeg,
  type Law,
} from '~/utils/balloon-legs';
import type { GasUnit } from '~/utils/gas-laws';

// What Mr. G says on a leg. The briefing names the goal and at most the one
// target the balloon needs: every other value is read off an instrument.

const fmt = (n: number, digits = 0) =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/** The readings as the instruments show them, rounded the same way */
function shown(g: GasLeg) {
  const gas = gasInside(balloonFor(g), startFlight(g));
  const celsius = Number((g.gasTemperature - ZERO_CELSIUS).toFixed(1));
  return {
    v1: Math.round(gas.volume), // volume meter, m³
    p1: Number((gas.pressure / 1000).toFixed(1)), // balloon gauge, kPa
    celsius, // helium thermometer
    kelvin: celsius + ZERO_CELSIUS,
    n1: g.moles, // helium counter
    // gas analyser: the air's share of the pressure inside, kPa
    pAir: Number(
      (
        (gas.pressure * (g.airMoles ?? 0)) /
        (g.moles + (g.airMoles ?? 0)) /
        1000
      ).toFixed(1),
    ),
  };
}

// helium's van der Waals constants and R, in the litre-and-bar units they're
// tabled in
const VDW_A = (HELIUM_VAN_DER_WAALS.a * 10).toFixed(4); // L²·bar/mol²
const VDW_B = (HELIUM_VAN_DER_WAALS.b * 1000).toFixed(4); // L/mol
const R_BAR = (GAS_CONSTANT / 100).toFixed(5); // L·bar/(mol·K)

// as the hint and working give them, g/mol
const M_HE = (HELIUM_MOLAR_MASS * 1000).toFixed(3);
const M_AIR = (AIR_MOLAR_MASS * 1000).toFixed(2);

const kPa = (pa: number) => fmt(pa / 1000, 1);
// R as students use it, to four figures
const R = GAS_CONSTANT.toFixed(3);

export interface Ask {
  label: string; // the calculation pad's
  units: GasUnit[];
  action: string; // the button that flies it
  flying: string; // what Mr. G says as it goes
}

const ASKS: Record<Law, Ask> = {
  boyle: {
    label: 'Volume to tie off at',
    units: ['m³', 'L'],
    action: 'Tie off and fly',
    flying: 'Tied off. Here we go…',
  },
  combined: {
    label: 'Volume to tie off at',
    units: ['m³', 'L'],
    action: 'Tie off and fly',
    flying: 'Tied off, and the heater’s turned down. Up we go…',
  },
  real: {
    label: 'Fill the bank to',
    units: ['bar', 'kPa', 'atm'],
    action: 'Fill, pump in and fly',
    flying: 'Bank’s full and pumping in. Here we go…',
  },
  graham: {
    label: 'Helium to set off with',
    units: ['mol'],
    action: 'Fill and fly',
    flying:
      'Topped up. Here’s hoping the leak’s no worse than the tester says…',
  },
  dalton: {
    label: 'Helium to have',
    units: ['mol'],
    action: 'Fill or vent and fly',
    flying: 'Helium’s set, air and all. Here we go…',
  },
  ideal: {
    label: 'Helium to fill',
    units: ['mol'],
    action: 'Fill and fly',
    flying: 'Filling up. Here we go…',
  },
  charles: {
    label: 'Heater temperature',
    units: ['K', '°C'],
    action: 'Heat and fly',
    flying: 'Heater’s on. Here we go…',
  },
  'gay-lussac': {
    label: 'Temperature to vent at',
    units: ['K', '°C'],
    action: 'Set the vent and fly',
    flying: 'Vent’s set. Out into the sun…',
  },
  avogadro: {
    label: 'Helium to have',
    units: ['mol'],
    action: 'Fill or vent and fly',
    flying: 'Helium’s set. Here we go…',
  },
};

/** What the calculation pad asks for on this leg */
export const ask = (g: GasLeg) => ASKS[g.law];

/** What Mr. G shouts the moment the fabric tears */
export const POPPED =
  'Pop! The fabric’s torn and the helium’s pouring out. Hold on, we’re coming down!';

/** Where we're going, what's holding steady, and the one thing to find */
export function briefing(g: GasLeg): string[] {
  const to = g.leg.to.name;
  switch (g.law) {
    case 'boyle':
      return [
        `Next stop: ${to}, up ahead.`,
        'The heater’s holding the helium at the same temperature, and the tank’s shut, so the temperature and the amount of helium aren’t changing.',
        `As we climb, the air thins and the balloon expands. I’ll tie the envelope off so it stops expanding just as we reach ${to}’s height: then we’ll float level with it and drift in.`,
        'Help me find the volume to tie it off at.',
      ];
    case 'real':
      return [
        `Next stop: ${to}, across at the same height.`,
        'We’re empty, so I’ll fill our cylinder bank at the depot, then pump every bit of it into the balloon. The bank’s size is on its label.',
        `To float across we need to be ${fmt(g.said)} m³. Packed into cylinders, helium doesn’t quite follow the ideal gas law.`,
        'Help me find the pressure to fill the bank to.',
      ];
    case 'graham':
      return [
        `Next stop: ${to}, a long hop across the flats at the same height.`,
        'We’re floating level now, but the fabric leaks: helium seeps out through tiny pinholes the whole way. I tested a patch with air, and the leak tester reads how fast air gets out.',
        `Helium’s lighter, so it escapes faster. The hop takes ${g.said} minutes, and if we run low on the way, we’ll sink before we get there.`,
        'Help me find how many moles of helium to set off with.',
      ];
    case 'dalton':
      return [
        `Next stop: ${to}, across at the same height.`,
        'It was a damp night: air seeped into the envelope and some helium seeped out, so we’re carrying a mix now. The gas analyser reads the air’s share of the pressure inside.',
        `Air’s much heavier than helium, so we need to be bigger to float: ${fmt(g.said)} m³. The air’s staying in, so I’ll top up or vent the helium.`,
        'Help me find how many moles of helium to have.',
      ];
    case 'ideal':
      return [
        `Next stop: ${to}, across at the same height.`,
        'We packed the balloon away for the night, so it’s empty: the volume meter and the helium counter both read zero, and there’s nothing to scale from.',
        `The heater’s warming the helium in the tank. To float across, we need to fill out to ${fmt(g.said)} m³: then the air we push aside weighs as much as we do, camping gear and all.`,
        'Help me find how many moles of helium to fill it with.',
      ];
    case 'combined':
      return [
        `Next stop: ${to}, high up ahead.`,
        'The tank’s shut, so the amount of helium isn’t changing. Everything else is: as we climb, the air thins and the balloon expands.',
        `It’s colder up there, so I’ll turn the heater down to ${fmt(g.said - ZERO_CELSIUS, 1)} °C on the way, and the helium will cool and shrink a little as we go.`,
        `I’ll tie the envelope off so it stops expanding just as we reach ${to}’s height. Help me find the volume to tie it off at.`,
      ];
    case 'charles':
      return [
        `Next stop: ${to}, across at the same height.`,
        'The tank’s shut and we’re staying at this height, so the amount of helium and the air pressure aren’t changing.',
        `The helium’s cooled while we rested, and we’re too small to lift off. To float across to ${to} we need to fill out to ${fmt(g.said)} m³: then the air we push aside weighs as much as we do.`,
        'Help me find the temperature to set the heater to.',
      ];
    case 'gay-lussac':
      return [
        `Next stop: ${to}, across the sunny valley at the same height.`,
        'We’re loaded with supplies, so we’re stretched full just to float: the volume can’t change, and the tank’s shut.',
        `The sun out there will bake the helium, and its pressure will climb. The balloon gauge’s red line is ${kPa(g.said)} kPa: past that, the fabric bursts.`,
        'Help me find the temperature that puts us right on the red line. I’ll vent helium if we get any hotter: too early and we lose helium we need, too late and we pop.',
      ];
    case 'avogadro':
      return [
        `Next stop: ${to}, across at the same height.`,
        g.cargo === 'picked up'
          ? 'We’ve picked up supply crates here, so we’re heavier and need to be bigger to float.'
          : 'We’ve dropped off our supply crates here, so we’re lighter and need to be smaller, or we’ll float away.',
        'The heater’s holding the temperature and we’re staying at this height, so the temperature and the air pressure aren’t changing.',
        `To float across now, we need to be ${fmt(g.said)} m³. Help me find how many moles of helium to have: I’ll top up from the tank or vent the extra.`,
      ];
  }
}

export function hint(g: GasLeg): string {
  switch (g.law) {
    case 'boyle':
      return `Boyle’s law: with the temperature and the helium fixed, P₁V₁ = P₂V₂. P₁ and V₁ are ours now, on the balloon gauge and the volume meter. P₂ is the air pressure at ${g.leg.to.name}: its weather station reads it.`;
    case 'real':
      return `Two steps. In the balloon the helium’s thin, so the ideal gas law works: n = PV ÷ RT, with P the air pressure on the balloon gauge, T on the helium thermometer and V the volume I need. Packed into the bank it isn’t, so use van der Waals: (P + an²/V²)(V − nb) = nRT, so P = nRT ÷ (V − nb) − an²/V². For helium a = ${VDW_A} L²·bar/mol² and b = ${VDW_B} L/mol; with V in litres, use R = ${R_BAR} L·bar/(mol·K) and P comes out in bar.`;
    case 'graham':
      return `Graham’s law: a gas escapes through tiny holes at a rate inversely proportional to the square root of its molar mass, so helium leaks √(M(air)/M(He)) times as fast as air, with M(He) = ${M_HE} g/mol and M(air) = ${M_AIR} g/mol. The leak tester reads air’s rate; over the hop’s minutes, helium’s rate gives what we’ll lose. Set off with what we have now, on the helium counter, plus that.`;
    case 'dalton':
      return `Dalton’s law: each gas in the mix fills the balloon as if it were alone, so the partial pressures add up, P = p(He) + p(air), and each gas’s moles follow from its own: n = pV/RT. The air’s partial pressure is on the gas analyser, V₁ on the volume meter and T on the helium thermometer: that gives the air’s moles. At the volume I need, the total pressure on the balloon gauge gives all the moles; the helium is what’s left. R = ${R} J/(mol·K), with P in pascals.`;
    case 'ideal':
      return `The ideal gas law: PV = nRT, so n = PV ÷ RT, with P in pascals, V in cubic metres, T in kelvin and R = ${R} J/(mol·K). Filling, the balloon’s slack, so P is the air pressure: the balloon gauge or the barometer reads it. T is on the helium thermometer, and V is the volume I need.`;
    case 'combined':
      return `The combined gas law: with the helium fixed, P₁V₁/T₁ = P₂V₂/T₂, with T in kelvin. P₁, V₁ and T₁ are ours now, on the balloon gauge, the volume meter and the helium thermometer. P₂ is the air pressure at ${g.leg.to.name}: its weather station reads it. T₂ is the heater’s new setting.`;
    case 'charles':
      return 'Charles’s law: with the pressure and the helium fixed, V₁/T₁ = V₂/T₂, with T in kelvin. V₁ is on the volume meter and T₁ on the helium thermometer. V₂ is the volume I need.';
    case 'gay-lussac':
      return 'Gay-Lussac’s law: with the volume and the helium fixed, P₁/T₁ = P₂/T₂, with T in kelvin. P₁ is on the balloon gauge and T₁ on the helium thermometer. P₂ is the red line.';
    case 'avogadro':
      return 'Avogadro’s law: with the temperature and the pressure fixed, V₁/n₁ = V₂/n₂. V₁ is on the volume meter and n₁ on the helium counter. V₂ is the volume I need.';
  }
}

/** The calculation from the readings as the instruments show them */
export function worked(g: GasLeg): string[] {
  const r = shown(g);
  const inKelvin = `T₁ = ${fmt(r.celsius, 1)} °C + 273.15 = ${fmt(r.kelvin, 2)} K`;
  const temperature = (t: number) =>
    `T₂ = ${fmt(t, 1)} K (${fmt(t - ZERO_CELSIUS, 1)} °C)`;
  const p2 = Number((airAt(g.leg.to.height).pressure / 1000).toFixed(1));
  switch (g.law) {
    case 'real': {
      const n = (r.p1 * 1000 * g.said) / (Number(R) * r.kelvin);
      const v = g.bank! * 1000; // L
      const room = v - n * Number(VDW_B);
      const push = (n * Number(R_BAR) * r.kelvin) / room;
      const pull = (Number(VDW_A) * n * n) / (v * v);
      return [
        `T = ${fmt(r.celsius, 1)} °C + 273.15 = ${fmt(r.kelvin, 2)} K`,
        `In the balloon: n = ${fmt(r.p1 * 1000)} Pa × ${fmt(g.said)} m³ ÷ (${R} J/(mol·K) × ${fmt(r.kelvin, 2)} K) = ${fmt(n)} mol`,
        `In the bank: V − nb = ${fmt(v)} L − ${fmt(n)} mol × ${VDW_B} L/mol = ${fmt(room, 1)} L`,
        `nRT ÷ (V − nb) = ${fmt(n)} × ${R_BAR} × ${fmt(r.kelvin, 2)} ÷ ${fmt(room, 1)} = ${fmt(push, 1)} bar`,
        `an²/V² = ${VDW_A} × ${fmt(n)}² ÷ ${fmt(v)}² = ${fmt(pull, 2)} bar`,
        `P = ${fmt(push, 1)} − ${fmt(pull, 2)} = ${fmt(push - pull, 1)} bar`,
      ];
    }
    case 'graham': {
      const factor = Math.sqrt(Number(M_AIR) / Number(M_HE));
      const rate = g.leakTest! * Number(factor.toFixed(3));
      const lost = rate * g.said;
      return [
        'Helium leaks √(M(air)/M(He)) times as fast as air:',
        `√(${M_AIR} g/mol ÷ ${M_HE} g/mol) = ${fmt(factor, 3)}`,
        `rate(He) = ${fmt(g.leakTest!, 1)} mol/min × ${fmt(factor, 3)} = ${fmt(rate, 1)} mol/min`,
        `Lost on the way: ${fmt(rate, 1)} mol/min × ${g.said} min = ${fmt(lost)} mol`,
        `n = ${fmt(r.n1)} mol + ${fmt(lost)} mol = ${fmt(r.n1 + lost)} mol`,
      ];
    }
    case 'dalton': {
      const pAir = r.pAir * 1000;
      const p = r.p1 * 1000;
      const nAir = (pAir * r.v1) / (Number(R) * r.kelvin);
      const nAll = (p * g.said) / (Number(R) * r.kelvin);
      return [
        `T = ${fmt(r.celsius, 1)} °C + 273.15 = ${fmt(r.kelvin, 2)} K`,
        'The air, from its partial pressure: n(air) = p(air)·V₁ ÷ RT',
        `n(air) = ${fmt(pAir)} Pa × ${fmt(r.v1)} m³ ÷ (${R} J/(mol·K) × ${fmt(r.kelvin, 2)} K) = ${fmt(nAir)} mol`,
        'All the gas, at the volume I need: n = PV₂ ÷ RT',
        `n = ${fmt(p)} Pa × ${fmt(g.said)} m³ ÷ (${R} J/(mol·K) × ${fmt(r.kelvin, 2)} K) = ${fmt(nAll)} mol`,
        `n(He) = n − n(air) = ${fmt(nAll)} − ${fmt(nAir)} = ${fmt(nAll - nAir)} mol`,
      ];
    }
    case 'ideal': {
      const pa = r.p1 * 1000;
      return [
        'PV = nRT, so n = PV ÷ RT',
        `P = ${fmt(r.p1, 1)} kPa = ${fmt(pa)} Pa`,
        `T = ${fmt(r.celsius, 1)} °C + 273.15 = ${fmt(r.kelvin, 2)} K`,
        `n = ${fmt(pa)} Pa × ${fmt(g.said)} m³ ÷ (${R} J/(mol·K) × ${fmt(r.kelvin, 2)} K)`,
        `n = ${fmt((pa * g.said) / (Number(R) * r.kelvin))} mol`,
      ];
    }
    case 'combined': {
      const t2 = g.said; // K: he says a whole or half °C, so this is exact
      return [
        'P₁V₁/T₁ = P₂V₂/T₂, so V₂ = P₁V₁T₂ ÷ (P₂T₁)',
        inKelvin,
        `T₂ = ${fmt(g.said - ZERO_CELSIUS, 1)} °C + 273.15 = ${fmt(t2, 2)} K`,
        `V₂ = ${fmt(r.p1, 1)} kPa × ${fmt(r.v1)} m³ × ${fmt(t2, 2)} K ÷ (${fmt(p2, 1)} kPa × ${fmt(r.kelvin, 2)} K)`,
        `V₂ = ${fmt((r.p1 * r.v1 * t2) / (p2 * r.kelvin))} m³`,
      ];
    }
    case 'boyle': {
      return [
        'P₁V₁ = P₂V₂, so V₂ = P₁V₁ ÷ P₂',
        `V₂ = ${fmt(r.p1, 1)} kPa × ${fmt(r.v1)} m³ ÷ ${fmt(p2, 1)} kPa`,
        `V₂ = ${fmt((r.p1 * r.v1) / p2)} m³`,
      ];
    }
    case 'charles':
      return [
        'V₁/T₁ = V₂/T₂, so T₂ = T₁ × V₂ ÷ V₁',
        inKelvin,
        `T₂ = ${fmt(r.kelvin, 2)} K × ${fmt(g.said)} m³ ÷ ${fmt(r.v1)} m³`,
        temperature((r.kelvin * g.said) / r.v1),
      ];
    case 'gay-lussac':
      return [
        'P₁/T₁ = P₂/T₂, so T₂ = T₁ × P₂ ÷ P₁',
        inKelvin,
        `T₂ = ${fmt(r.kelvin, 2)} K × ${kPa(g.said)} kPa ÷ ${fmt(r.p1, 1)} kPa`,
        temperature((r.kelvin * g.said) / 1000 / r.p1),
      ];
    case 'avogadro':
      return [
        'V₁/n₁ = V₂/n₂, so n₂ = n₁ × V₂ ÷ V₁',
        `n₂ = ${fmt(r.n1)} mol × ${fmt(g.said)} m³ ÷ ${fmt(r.v1)} m³`,
        `n₂ = ${fmt((r.n1 * g.said) / r.v1)} mol`,
      ];
  }
}

// how each miss went, by law and outcome; {to} and {from} are the platforms
const MISSES: Record<Law, Partial<Record<FlightPlan['outcome'], string>>> = {
  boyle: {
    over: 'Tied off too big: we kept expanding, climbed too high and sailed right over {to}.',
    short:
      'Tied off too small: we stopped expanding too low and couldn’t clear the climb to {to}.',
  },
  combined: {
    over: 'Tied off too big: we kept expanding, climbed too high and sailed right over {to}.',
    short:
      'Tied off too small: we stopped expanding too low and couldn’t clear the climb to {to}.',
  },
  charles: {
    over: 'Too hot: we grew bigger than we needed, had lift to spare, and climbed right over {to}.',
    short:
      'Too cool: we didn’t grow big enough to lift us, so we never left {from}.',
  },
  real: {
    over: 'Filled too full: the bank held more helium than we needed, so we had lift to spare and climbed right over {to}.',
    short:
      'Not filled full enough: packed that tight, helium pushes harder than the ideal gas law says, so the bank held less than we needed and we never left {from}.',
  },
  graham: {
    over: 'Too much helium: even with the leak we had lift to spare, and climbed right over {to}.',
    short:
      'Too little helium: partway across the leak took us below floating, and we sank before {to}.',
  },
  dalton: {
    over: 'Too much helium: we were bigger than we needed, had lift to spare, and climbed right over {to}.',
    short:
      'Too little helium: with the air’s weight on board, we weren’t big enough to lift us, so we never left {from}.',
  },
  ideal: {
    over: 'Too much helium: we filled out bigger than we needed, had lift to spare, and climbed right over {to}.',
    short:
      'Too little helium: we didn’t fill out big enough to lift us, so we never left {from}.',
  },
  avogadro: {
    over: 'Too much helium: we were bigger than we needed, had lift to spare, and climbed right over {to}.',
    short:
      'Too little helium: we weren’t big enough to lift us, so we never left {from}.',
  },
  'gay-lussac': {
    burst:
      'Too hot: the pressure went past the red line before I vented, and the fabric burst. We came down short of {to}.',
    short:
      'Too cool: I vented helium we needed, and when we cooled down over the far side we were too small to float. We came down short of {to}.',
  },
};

export function verdict(plan: FlightPlan, g: GasLeg): string {
  const { from, to } = g.leg;
  if (plan.outcome === 'landed') return `We’re down on ${to.name}!`;
  if (tiesOff(g) && plan.outcome === 'short' && plan.stopAt === from.distance)
    return `We’re already bigger than that, so tied off there we couldn’t expand, and without expanding we couldn’t climb. We never left ${from.name}.`;
  if (
    g.law === 'graham' &&
    plan.outcome === 'short' &&
    plan.stopAt === from.distance
  )
    return `With no more helium than floats us now, the leak had us sinking from the start. We never left ${from.name}.`;
  return (MISSES[g.law][plan.outcome] ?? '')
    .replace('{to}', to.name)
    .replace('{from}', from.name);
}

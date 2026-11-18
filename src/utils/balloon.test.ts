import { airAt } from './atmosphere';
import {
  floatHeight,
  gasInside,
  liftOff,
  step,
  type Balloon,
  type Flight,
} from './balloon';

// a crewed gas balloon, about the size of real ones
const balloon: Balloon = {
  fullVolume: 1000, // m³
  burstOverpressure: 15000, // Pa
  payload: 600, // kg
};
const R = 8.314462618;

// n moles of helium at the air's temperature, sitting on the ground
const flight = (
  moles: number,
  height = 0,
  gasTemperature?: number,
): Flight => ({
  moles,
  gasTemperature: gasTemperature ?? airAt(height).temperature,
  height,
  speed: 0,
});

/** Flies for a while, a step at a time */
function fly(f: Flight, seconds: number, dt = 0.1) {
  for (let t = 0; t < seconds; t += dt) f = step(balloon, f, dt);
  return f;
}

describe('the gas inside', () => {
  it('while slack, matches the air’s pressure and fills V = nRT/P', () => {
    const f = flight(20000);
    const air = airAt(0);
    const gas = gasInside(balloon, f);
    expect(gas.taut).toBe(false);
    expect(gas.pressure).toBeCloseTo(air.pressure, 6);
    expect(gas.volume).toBeCloseTo(
      (20000 * R * f.gasTemperature) / air.pressure,
      6,
    );
  });

  it('expands as it rises into thinner air (Boyle’s law)', () => {
    const t = 280;
    const low = gasInside(balloon, flight(20000, 0, t));
    const high = gasInside(balloon, flight(20000, 1500, t));
    expect(high.volume).toBeGreaterThan(low.volume);
    expect(high.pressure * high.volume).toBeCloseTo(
      low.pressure * low.volume,
      3,
    );
  });

  it('expands when heated (Charles’s law)', () => {
    const cool = gasInside(balloon, flight(20000, 0, 280));
    const warm = gasInside(balloon, flight(20000, 0, 320));
    expect(warm.volume / cool.volume).toBeCloseTo(320 / 280, 9);
  });

  it('once stretched full, heating raises the pressure instead (Gay-Lussac’s law)', () => {
    const moles = 50000; // more than fits slack at sea level
    const cool = gasInside(balloon, flight(moles, 0, 290));
    const warm = gasInside(balloon, flight(moles, 0, 310));
    expect(cool.taut).toBe(true);
    expect(warm.volume).toBe(balloon.fullVolume);
    expect(warm.pressure / cool.pressure).toBeCloseTo(310 / 290, 9);
  });

  it('bursts past its limit', () => {
    expect(gasInside(balloon, flight(42000, 0, 290)).burst).toBe(false);
    expect(gasInside(balloon, flight(60000, 0, 290)).burst).toBe(true);
  });
});

describe('flying', () => {
  it('stays on the ground without enough helium to lift its load', () => {
    expect(liftOff(balloon, flight(5000))).toBe(false);
    const f = fly(flight(5000), 60);
    expect(f.height).toBe(0);
    expect(f.speed).toBe(0);
  });

  it('rises, then settles where the air is thin enough to balance it', () => {
    const start = flight(25000);
    expect(liftOff(balloon, start)).toBe(true);
    const target = floatHeight(balloon, start)!;
    expect(target).toBeGreaterThan(500);

    const f = fly(start, 3600);
    expect(f.height).toBeCloseTo(target, -1); // within 5 m
    expect(Math.abs(f.speed)).toBeLessThan(0.05);
  });

  it('floats where the air’s density equals its mass over its volume', () => {
    const start = flight(25000);
    const h = floatHeight(balloon, start)!;
    const mass = balloon.payload + 25000 * 0.0040026;
    expect(airAt(h).density).toBeCloseTo(mass / balloon.fullVolume, 4);
  });

  it('floats higher with a lighter load (dropping ballast)', () => {
    const light = { ...balloon, payload: 500 };
    expect(floatHeight(light, flight(25000))!).toBeGreaterThan(
      floatHeight(balloon, flight(25000))!,
    );
  });

  it('heating the slack gas can lift a balloon that couldn’t rise cold', () => {
    expect(liftOff(balloon, flight(23000, 0, 288))).toBe(false);
    const hot = fly(flight(23000, 0, 330), 5);
    expect(hot.height).toBeGreaterThan(0);
    expect(hot.speed).toBeGreaterThan(0);
  });

  it('falls when it bursts', () => {
    const f = fly(flight(60000, 0, 290), 10);
    expect(f.burst).toBe(true);
    expect(f.height).toBe(0);
  });
});

describe('air leaked into the envelope (Dalton’s law)', () => {
  const helium = flight(30000, 0);
  const mixed = { ...helium, airMoles: 3000 };

  it('fills space by its moles just like helium: the moles add, as the partial pressures do', () => {
    const { volume } = gasInside(balloon, mixed);
    const air = airAt(0);
    expect(volume).toBeCloseTo(
      (33000 * R * mixed.gasTemperature) / air.pressure,
      6,
    );
  });

  it('weighs far more than helium, so it lifts less than the same moles of helium would', () => {
    const allHelium = flight(33000, 0);
    expect(gasInside(balloon, mixed).volume).toBeCloseTo(
      gasInside(balloon, allHelium).volume,
      6,
    );
    expect(floatHeight(balloon, mixed)!).toBeLessThan(
      floatHeight(balloon, allHelium)!,
    );
  });
});

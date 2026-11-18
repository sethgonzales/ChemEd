import { airAt } from './atmosphere';
import type { Balloon, Flight } from './balloon';
import { ENVELOPE_RADIUS, envelopeRadius, readings } from './balloon-view';

const balloon: Balloon = {
  fullVolume: 1000,
  burstOverpressure: 15000,
  payload: 600,
};
const flight: Flight = {
  moles: 20000,
  gasTemperature: 288.15,
  height: 1500,
  speed: 0,
};

describe('readings (what the instruments show)', () => {
  it('reads the outside air from the standard atmosphere at the balloon’s height', () => {
    const r = readings(balloon, flight);
    const air = airAt(1500);
    expect(r.altitude).toBe(1500);
    expect(r.airPressure).toBeCloseTo(air.pressure / 1000, 9); // kPa
    expect(r.airTemperature).toBeCloseTo(air.temperature - 273.15, 9); // °C
  });

  it('reads the helium: its temperature, pressure, volume and moles', () => {
    const r = readings(balloon, flight);
    expect(r.gasTemperature).toBeCloseTo(15, 9); // °C, as a thermometer reads
    expect(r.gasPressure).toBeCloseTo(r.airPressure, 9); // slack
    expect(r.volume).toBeCloseTo(
      (20000 * 8.314462618 * 288.15) / airAt(1500).pressure,
      6,
    );
    expect(r.moles).toBe(20000);
  });
});

describe('envelopeRadius', () => {
  it('is full size when the balloon is stretched full', () => {
    expect(envelopeRadius(1000, 1000)).toBe(ENVELOPE_RADIUS);
  });

  it('grows with the cube root of the volume, as a sphere does', () => {
    expect(envelopeRadius(125, 1000)).toBeCloseTo(ENVELOPE_RADIUS / 2, 9);
  });

  it('never draws bigger than full', () => {
    expect(envelopeRadius(2000, 1000)).toBe(ENVELOPE_RADIUS);
  });
});

import { airAt } from './atmosphere';
import type { Balloon, Flight } from './balloon';
import {
  ENVELOPE_RADIUS,
  envelopeRadius,
  gaugeArc,
  readings,
  viewSize,
} from './balloon-view';

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

describe('the size of the view', () => {
  it('keeps pixels about the same size, seeing less of the world on a phone', () => {
    const phone = viewSize(375, 800);
    const laptop = viewSize(1200, 900);
    expect(phone.width).toBeLessThan(laptop.width);
    expect(phone.scale).toBeGreaterThan(1.5);
    expect(laptop.scale).toBeGreaterThan(1.5);
  });

  it('fits a laptop’s screen, with room left for the controls', () => {
    const { height, scale } = viewSize(1200, 800);
    expect(height * scale).toBeLessThanOrEqual(800 * 0.66);
  });

  it('stays tall enough for the gauge column on a short screen', () => {
    const { height, scale } = viewSize(1200, 400);
    expect(height * scale).toBeGreaterThanOrEqual(370);
  });
});

describe('gaugeArc', () => {
  const width = 64; // CSS px, a gauge with its readout
  const slots = gaugeArc(4, width);

  it('arcs the gauges over the top, left to right', () => {
    slots.forEach((s) => expect(s.y).toBeLessThan(0));
    for (let i = 1; i < slots.length; i++)
      expect(slots[i].x).toBeGreaterThan(slots[i - 1].x);
  });

  it('bows up in the middle, symmetric about the balloon', () => {
    expect(slots[1].y).toBeLessThan(slots[0].y);
    expect(slots[0].x).toBeCloseTo(-slots[3].x);
    expect(slots[0].y).toBeCloseTo(slots[3].y);
  });

  it('spaces them so neighbours never overlap', () => {
    for (let i = 1; i < slots.length; i++) {
      const apart = Math.hypot(
        slots[i].x - slots[i - 1].x,
        slots[i].y - slots[i - 1].y,
      );
      expect(apart).toBeGreaterThanOrEqual(width);
    }
  });
});

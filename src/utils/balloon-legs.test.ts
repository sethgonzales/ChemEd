import { airAt } from './atmosphere';
import { gasInside } from './balloon';
import {
  BOYLE_LEGS,
  balloonFor,
  boyleLeg,
  startFlight,
  tieOffVolume,
} from './balloon-legs';

const legs = Array.from({ length: BOYLE_LEGS }, (_, i) => boyleLeg(i, 42));

describe('Boyle’s law legs', () => {
  it('flies platform to platform, each leg starting where the last one landed', () => {
    for (let i = 1; i < legs.length; i++)
      expect(legs[i].leg.from).toEqual(legs[i - 1].leg.to);
  });

  it('climbs every leg, so the air thins and the balloon swells', () => {
    for (const { leg } of legs)
      expect(leg.to.height).toBeGreaterThan(leg.from.height);
  });

  it('starts slack on its platform, the helium at the air’s pressure', () => {
    for (const g of legs) {
      const start = startFlight(g);
      expect(start.height).toBe(g.leg.from.height);
      const gas = gasInside(balloonFor(g), start);
      expect(gas.taut).toBe(false);
      expect(gas.pressure).toBeCloseTo(airAt(g.leg.from.height).pressure, 6);
    }
  });

  it('ties off at the volume Boyle’s law gives from the instruments', () => {
    for (const g of legs) {
      const p1 = airAt(g.leg.from.height).pressure; // barometer, or balloon gauge
      const v1 = gasInside(balloonFor(g), startFlight(g)).volume; // volume meter
      const p2 = airAt(g.leg.to.height).pressure; // the next stop's station
      expect(tieOffVolume(g) / ((p1 * v1) / p2)).toBeCloseTo(1, 9);
    }
  });

  it('asks for a volume bigger than now that still fits in the envelope', () => {
    for (const g of legs) {
      const now = gasInside(balloonFor(g), startFlight(g)).volume;
      expect(tieOffVolume(g)).toBeGreaterThan(now);
      expect(tieOffVolume(g)).toBeLessThan(g.envelope);
    }
  });

  it('gives fresh numbers on a retry, and the same ones for the same seed', () => {
    expect(boyleLeg(0, 42)).toEqual(boyleLeg(0, 42));
    expect(boyleLeg(0, 43).moles).not.toBe(boyleLeg(0, 42).moles);
  });

  it('reads helium in whole hundreds of moles, like the counter shows', () => {
    for (const g of legs) expect(g.moles % 100).toBe(0);
  });
});

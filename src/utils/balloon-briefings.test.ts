import { airAt } from './atmosphere';
import { gasInside } from './balloon';
import { briefing, hint, verdict, worked } from './balloon-briefings';
import { planFlight } from './balloon-flight';
import {
  balloonFor,
  boyleLeg,
  startFlight,
  tieOffVolume,
} from './balloon-legs';

const g = boyleLeg(0, 3);

describe('Mr. G’s briefing', () => {
  it('says where we’re going, what’s holding steady, and what to find', () => {
    const text = briefing(g).join(' ');
    expect(text).toMatch(/Red Mesa/);
    expect(text).toMatch(/temperature/);
    expect(text).toMatch(/volume/i);
  });

  it('gives no numbers: every value comes from an instrument', () => {
    expect(briefing(g).join(' ')).not.toMatch(/\d/);
  });

  it('hints at Boyle’s law and where each value is read', () => {
    const text = hint(g);
    expect(text).toMatch(/P₁V₁ = P₂V₂/);
    expect(text).toMatch(/weather station/);
  });
});

describe('the worked answer, after a miss', () => {
  it('uses the readings as the instruments show them, and gets the answer', () => {
    const lines = worked(g);
    const p1 = (airAt(g.leg.from.height).pressure / 1000).toFixed(1);
    const v1 = Math.round(gasInside(balloonFor(g), startFlight(g)).volume);
    const p2 = (airAt(g.leg.to.height).pressure / 1000).toFixed(1);
    expect(lines.join(' ')).toContain(`${p1} kPa × ${v1} m³ ÷ ${p2} kPa`);
    const answer = Number(
      lines
        .at(-1)!
        .match(/= ([\d,.]+) m³/)![1]
        .replace(/,/g, ''),
    );
    expect(answer / tieOffVolume(g)).toBeCloseTo(1, 2);
  });
});

describe('the verdict', () => {
  const after = (answer: number) => verdict(planFlight(g, answer), g);

  it('says what happened at the platform', () => {
    expect(after(tieOffVolume(g))).toMatch(/down on Red Mesa/);
    expect(after(tieOffVolume(g) * 1.1)).toMatch(/sailed right over/);
    // only a little small: on this leg it starts at about 93% of the answer
    expect(after(tieOffVolume(g) * 0.96)).toMatch(/couldn’t clear the climb/);
  });

  it('says so when the balloon was already bigger and never left', () => {
    expect(after(100)).toMatch(/already bigger/);
  });
});

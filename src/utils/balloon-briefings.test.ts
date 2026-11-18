import { airAt } from './atmosphere';
import { gasInside } from './balloon';
import { ask, briefing, hint, verdict, worked } from './balloon-briefings';
import { planFlight } from './balloon-flight';
import {
  avogadroLeg,
  balloonFor,
  boyleLeg,
  charlesLeg,
  combinedLeg,
  daltonLeg,
  idealLeg,
  gayLussacLeg,
  rightAnswer,
  startFlight,
  tieOffVolume,
  type GasLeg,
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

const LEGS = {
  charles: charlesLeg(0, 3),
  'gay-lussac': gayLussacLeg(0, 3),
  avogadro: avogadroLeg(0, 3),
};
const EQUATIONS = {
  charles: 'V₁/T₁ = V₂/T₂',
  'gay-lussac': 'P₁/T₁ = P₂/T₂',
  avogadro: 'V₁/n₁ = V₂/n₂',
};
const lastNumber = (line: string) =>
  Number(line.match(/= ([\d,.]+) (K|mol)/)![1].replace(/,/g, ''));

describe.each(Object.entries(LEGS))('Mr. G on a %s leg', (law, leg) => {
  it('names the next stop, and gives only the one number he must', () => {
    const text = briefing(leg).join(' ');
    expect(text).toMatch(new RegExp(leg.leg.to.name));
    const numbers = text.match(/[\d,.]*\d/g) ?? [];
    expect(numbers).toHaveLength(1);
  });

  it('hints at the law', () => {
    expect(hint(leg)).toContain(EQUATIONS[law as keyof typeof EQUATIONS]);
  });

  it('works the answer from the readings', () => {
    const lines = worked(leg);
    expect(lines[0]).toContain(EQUATIONS[law as keyof typeof EQUATIONS]);
    expect(lastNumber(lines.at(-1)!) / rightAnswer(leg)).toBeCloseTo(1, 2);
  });

  it('asks for the answer in the units the control takes', () => {
    const { units } = ask(leg);
    expect(units).toContain(law === 'avogadro' ? 'mol' : 'K');
  });
});

describe('what Mr. G says when it goes wrong', () => {
  const after = (leg: GasLeg, by: number) =>
    verdict(planFlight(leg, rightAnswer(leg) * by), leg);

  it('on the heater: too hot climbs over, too cool never lifts', () => {
    const leg = LEGS.charles;
    expect(after(leg, 1.1)).toMatch(/hot.*over/);
    expect(after(leg, 0.9)).toMatch(/cool.*never left/);
  });

  it('on the tank: too much climbs over, too little never lifts', () => {
    const leg = LEGS.avogadro;
    expect(after(leg, 1.1)).toMatch(/much.*over/);
    expect(after(leg, 0.9)).toMatch(/little.*never left/);
  });

  it('on the burst line: too hot pops, too cool vents what we needed', () => {
    const leg = LEGS['gay-lussac'];
    expect(after(leg, 1.1)).toMatch(/burst/);
    expect(after(leg, 0.9)).toMatch(/vented/);
  });
});

describe('Mr. G on a combined gas law leg', () => {
  const c = combinedLeg(0, 3);

  it('names the next stop, and gives only the heater’s new setting', () => {
    const text = briefing(c).join(' ');
    expect(text).toMatch(new RegExp(c.leg.to.name));
    const numbers = text.match(/[\d,.]*\d/g) ?? [];
    expect(numbers).toHaveLength(1);
    expect(Number(numbers[0])).toBeCloseTo(c.said - 273.15, 1);
  });

  it('hints at the combined gas law', () => {
    expect(hint(c)).toContain('P₁V₁/T₁ = P₂V₂/T₂');
  });

  it('works the answer from the readings', () => {
    const lines = worked(c);
    expect(lines[0]).toContain('P₁V₁/T₁ = P₂V₂/T₂');
    const last = Number(
      lines
        .at(-1)!
        .match(/= ([\d,.]+) m³/)![1]
        .replace(/,/g, ''),
    );
    expect(last / rightAnswer(c)).toBeCloseTo(1, 2);
  });

  it('asks for a volume to tie off at', () => {
    expect(ask(c).units).toContain('m³');
  });

  it('says what went wrong, and that it lands', () => {
    const right = rightAnswer(c);
    expect(verdict(planFlight(c, right), c)).toMatch(/down on/);
    expect(verdict(planFlight(c, right * 1.1), c)).toMatch(/over/);
    expect(verdict(planFlight(c, right * 0.96), c)).toMatch(/small/);
  });
});

describe('Mr. G on an ideal gas law leg', () => {
  const i = idealLeg(0, 3);

  it('names the next stop, and gives only the volume he needs', () => {
    const text = briefing(i).join(' ');
    expect(text).toMatch(new RegExp(i.leg.to.name));
    const numbers = text.match(/[\d,.]*\d/g) ?? [];
    expect(numbers).toHaveLength(1);
    expect(Number(numbers[0]!.replace(/,/g, ''))).toBe(i.said);
  });

  it('hints at PV = nRT, with R and the units it takes', () => {
    expect(hint(i)).toContain('PV = nRT');
    expect(hint(i)).toContain('8.314');
  });

  it('works the answer from the readings', () => {
    const lines = worked(i);
    expect(lines[0]).toContain('PV = nRT');
    const last = Number(
      lines
        .at(-1)!
        .match(/= ([\d,.]+) mol/)![1]
        .replace(/,/g, ''),
    );
    expect(last / rightAnswer(i)).toBeCloseTo(1, 2);
  });

  it('asks for moles of helium', () => {
    expect(ask(i).units).toContain('mol');
  });

  it('says what went wrong', () => {
    const right = rightAnswer(i);
    expect(verdict(planFlight(i, right * 1.1), i)).toMatch(/over/);
    expect(verdict(planFlight(i, right * 0.9), i)).toMatch(/never left/);
  });
});

describe('Mr. G on a Dalton’s law leg', () => {
  const d = daltonLeg(0, 3);

  it('names the next stop, and gives only the volume he needs', () => {
    const text = briefing(d).join(' ');
    expect(text).toMatch(new RegExp(d.leg.to.name));
    const numbers = text.match(/[\d,.]*\d/g) ?? [];
    expect(numbers).toHaveLength(1);
    expect(Number(numbers[0]!.replace(/,/g, ''))).toBe(d.said);
  });

  it('hints at partial pressures adding up, and where each is read', () => {
    expect(hint(d)).toContain('P = p(He) + p(air)');
    expect(hint(d)).toContain('gas analyser');
  });

  it('works the answer from the readings', () => {
    const lines = worked(d);
    const last = Number(
      lines
        .at(-1)!
        .match(/= ([\d,.]+) mol/)![1]
        .replace(/,/g, ''),
    );
    expect(last / rightAnswer(d)).toBeCloseTo(1, 2);
  });

  it('asks for moles of helium, and says what went wrong', () => {
    expect(ask(d).units).toContain('mol');
    const right = rightAnswer(d);
    expect(verdict(planFlight(d, right * 1.1), d)).toMatch(/over/);
    expect(verdict(planFlight(d, right * 0.9), d)).toMatch(/never left/);
  });
});

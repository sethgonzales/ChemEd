import { SUBSTANCES } from '~/constants/substances';
import { createRng } from './quest';
import {
  heatQuestion,
  phaseQuestion,
  pointQuestion,
  statesQuestion,
  statesRooms,
  goalMet,
} from './quest-states';
import { phaseOf, temperatureRange } from './states-of-matter';

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const substance = (about: string) => SUBSTANCES.find((s) => s.name === about)!;

describe('States of Matter questions', () => {
  it('ask for the phase at a temperature well away from either change', () => {
    const phases = new Set<string>();
    for (const level of [1, 2])
      for (const seed of SEEDS) {
        const q = phaseQuestion(createRng(seed), level);
        const s = substance(q.about);
        if (level === 1) expect(s.id).toBe('water');
        const t = Number(
          /at (−?-?\d+) °C/.exec(q.prompt)![1].replace('−', '-'),
        );
        expect(Math.abs(t - s.meltC)).toBeGreaterThanOrEqual(3);
        expect(Math.abs(t - s.boilC)).toBeGreaterThanOrEqual(3);
        expect(q.choices[q.answer]).toBe(phaseOf(s, t));
        phases.add(phaseOf(s, t));
      }
    expect(phases.size).toBe(3);
  });

  it('ask for a melting or boiling point', () => {
    for (const seed of SEEDS) {
      const q = pointQuestion(createRng(seed), 2);
      const s = substance(q.about);
      const point = q.prompt.includes('boil') ? s.boilC : s.meltC;
      expect(q.choices[q.answer]).toBe(`${String(point).replace('-', '−')} °C`);
    }
  });

  it('work out the heat to melt or boil some moles at the change', () => {
    for (const seed of SEEDS) {
      const q = heatQuestion(createRng(seed), 3);
      const s = substance(q.about);
      const moles = Number(
        /melt|boil/.test(q.prompt) && /([\d.]+) mol/.exec(q.prompt)![1],
      );
      const perMole = q.prompt.includes('melt') ? s.fusionKJ : s.vaporizationKJ;
      expect(q.choices[q.answer]).toBe(`${(moles * perMole).toFixed(2)} kJ`);
    }
  });

  it('only asks about water at level 1', () => {
    for (const seed of SEEDS)
      expect(statesQuestion(createRng(seed), 1).about).toBe('Water');
  });
});

describe('the Wyrm’s rooms', () => {
  it('start each substance in a different phase from the one to reach', () => {
    for (const seed of SEEDS)
      for (const course of ['general', 'ap'] as const)
        for (const room of statesRooms(createRng(seed), course)) {
          const { min, max } = temperatureRange(room.substance);
          expect(room.start).toBeGreaterThanOrEqual(min);
          expect(room.start).toBeLessThanOrEqual(max);
          expect(goalMet(room, room.start)).toBe(false);
        }
  });

  it('ask General Chemistry for phases, and AP for a transition point too', () => {
    for (const seed of SEEDS) {
      const general = statesRooms(createRng(seed), 'general');
      expect(general.map((r) => r.goal.kind)).toEqual(['phase', 'phase']);
      const ap = statesRooms(createRng(seed), 'ap');
      expect(ap.map((r) => r.goal.kind)).toEqual(['phase', 'point']);
      // never the same substance twice
      expect(general[0].substance).not.toBe(general[1].substance);
    }
  });

  it('opens for the right phase, or for the point itself', () => {
    const water = SUBSTANCES.find((x) => x.id === 'water')!;
    const liquid = {
      substance: water,
      start: -10,
      goal: { kind: 'phase', phase: 'Liquid' },
    } as const;
    expect(goalMet(liquid, 25)).toBe(true);
    expect(goalMet(liquid, 105)).toBe(false);
    const boil = {
      substance: water,
      start: 20,
      goal: { kind: 'point', point: 'boiling' },
    } as const;
    expect(goalMet(boil, 100)).toBe(true);
    expect(goalMet(boil, 99)).toBe(false);
  });
});

import { ELEMENTS } from './elements';
import { COUPLES, FARADAY, GAS_CONSTANT } from './electrochemistry';
import { SOURCES } from './sources';

const byId = (id: string) => COUPLES.find((c) => c.id === id)!;

describe('COUPLES', () => {
  it('lists metals from most to least reactive (ascending E°)', () => {
    const e = COUPLES.map((c) => c.eStandard);
    expect(e).toEqual([...e].sort((a, b) => a - b));
  });

  it('uses E° values as tabulated in the cited data page', () => {
    expect(byId('Zn').eStandard).toBe(-0.7618);
    expect(byId('Cu').eStandard).toBe(0.337);
    expect(byId('Ag').eStandard).toBe(0.7996);
    expect(byId('Mg').eStandard).toBe(-2.372);
  });

  it('pairs each metal with its own ion and a soluble nitrate', () => {
    for (const c of COUPLES) {
      expect(ELEMENTS.some((e) => e.symbol === c.id)).toBe(true);
      expect(c.ion.startsWith(c.id)).toBe(true);
      expect(c.solution).toMatch(/NO₃/);
      expect(c.charge).toBeGreaterThanOrEqual(1);
    }
  });

  it('cites a real source', () => {
    for (const c of COUPLES) expect(SOURCES[c.source]).toBeDefined();
  });
});

describe('constants', () => {
  it('uses the exact SI values of F and R', () => {
    expect(FARADAY).toBe(96485.33212);
    expect(GAS_CONSTANT).toBe(8.314462618);
  });
});

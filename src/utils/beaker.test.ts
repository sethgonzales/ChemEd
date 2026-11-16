import { BEAKER_BOX, beaker, type Spot } from './beaker';
import { predict, PREDICT_POOL } from './predict';

const scene = (a: string, b: string) => beaker(predict([a, b]));
const visible = (spots: Spot[]) => spots.filter((s) => !s.hidden);
const names = (spots: Spot[]) =>
  visible(spots)
    .map((s) => `${s.label}${s.charge || ''}`)
    .sort();
const before = (a: string, b: string) => scene(a, b).map((p) => p.before);
const after = (a: string, b: string) => scene(a, b).map((p) => p.after);
const touching = (p: Spot, q: Spot) =>
  Math.hypot(p.x - q.x, p.y - q.y) <= 2 * BEAKER_BOX.radius + 0.5;
const inSolution = (s: Spot) =>
  s.y > BEAKER_BOX.surface && s.y < BEAKER_BOX.floor;
const onFloor = (s: Spot) => s.y >= BEAKER_BOX.floor;

describe('beaker: particles before and after', () => {
  it('dissolves soluble reactants into separate ions', () => {
    const spots = before('AgNO3', 'NaCl');
    expect(names(spots)).toEqual(['Ag1', 'Cl-1', 'NO3-1', 'Na1']);
    expect(spots.every(inSolution)).toBe(true);
  });

  it('counts particles from the balanced equation', () => {
    // 3Ca²⁺ + 6Cl⁻ + 6Na⁺ + 2PO₄³⁻
    const spots = before('Na3PO4', 'CaCl2');
    expect(spots.filter((s) => s.label === 'Ca')).toHaveLength(3);
    expect(spots.filter((s) => s.label === 'PO4')).toHaveLength(2);
    expect(spots).toHaveLength(17);
  });

  it('gathers a precipitate on the floor, its ions touching', () => {
    const spots = after('AgNO3', 'NaCl');
    const ag = spots.find((s) => s.label === 'Ag')!;
    const cl = spots.find((s) => s.label === 'Cl')!;
    expect(onFloor(ag) && onFloor(cl)).toBe(true);
    expect(touching(ag, cl)).toBe(true);
  });

  it('leaves spectators where they were', () => {
    const particles = scene('AgNO3', 'NaCl');
    const spectators = particles.filter((p) => p.spectator);
    expect(spectators.map((p) => p.before.label).sort()).toEqual(['NO3', 'Na']);
    for (const p of spectators) expect(p.after).toEqual(p.before);
    expect(particles.filter((p) => !p.spectator)).toHaveLength(2);
  });

  it('dissolves a more active metal and plates out the other', () => {
    const particles = scene('Zn', 'CuSO4');
    const zn = particles.find((p) => p.before.label === 'Zn')!;
    const cu = particles.find((p) => p.before.label === 'Cu')!;
    expect(zn.before).toMatchObject({ charge: 0 });
    expect(onFloor(zn.before)).toBe(true);
    expect(zn.after).toMatchObject({ charge: 2 });
    expect(inSolution(zn.after)).toBe(true);
    expect(cu.before.charge).toBe(2);
    expect(cu.after).toMatchObject({ charge: 0 });
    expect(onFloor(cu.after)).toBe(true);
  });

  it('pairs hydrogen ions into H₂ that rises to the top', () => {
    const spots = after('Zn', 'HCl');
    const gas = visible(spots).filter((s) => s.label === 'H2');
    expect(gas).toHaveLength(1);
    expect(gas[0].y).toBeLessThan(BEAKER_BOX.surface);
    expect(spots.filter((s) => s.label === 'H2' && s.hidden)).toHaveLength(1);
  });

  it('joins H⁺ and OH⁻ into water', () => {
    expect(names(after('HCl', 'NaOH'))).toEqual(['Cl-1', 'H2O', 'Na1']);
  });

  it('changes nothing when there’s no reaction', () => {
    for (const p of scene('Cu', 'Zn(NO3)2')) expect(p.after).toEqual(p.before);
  });

  it('fits every puzzle without particles overlapping', () => {
    for (const reactants of PREDICT_POOL) {
      const particles = beaker(predict(reactants));
      for (const side of ['before', 'after'] as const) {
        const spots = visible(particles.map((p) => p[side]));
        spots.forEach((s, i) => {
          expect(s.x).toBeGreaterThanOrEqual(BEAKER_BOX.radius);
          expect(s.x).toBeLessThanOrEqual(BEAKER_BOX.width - BEAKER_BOX.radius);
          for (const t of spots.slice(i + 1))
            expect(Math.hypot(s.x - t.x, s.y - t.y)).toBeGreaterThan(
              2 * BEAKER_BOX.radius - 0.5,
            );
        });
      }
    }
  });
});

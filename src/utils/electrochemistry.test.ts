import { COUPLES } from '~/constants/electrochemistry';
import {
  analyzeCell,
  electrolysis,
  halfCellState,
  runCell,
  type HalfCell,
} from './electrochemistry';

const half = (
  electrode: string,
  solution = electrode,
  concentration = 1,
): HalfCell => ({ electrode, solution, concentration });

const daniell = { left: half('Zn'), right: half('Cu'), saltBridge: true };

describe('a working cell (each metal in a solution of its own ions)', () => {
  it('gives the Daniell cell 1.10 V, with zinc as the anode', () => {
    const cell = analyzeCell(daniell);
    expect(cell.status).toBe('working');
    expect(cell.voltage).toBeCloseTo(1.1, 2);
    expect(cell.anode).toBe('left');
  });

  it('picks the same anode whichever side the metal is on', () => {
    const cell = analyzeCell({
      ...daniell,
      left: half('Cu'),
      right: half('Zn'),
    });
    expect(cell.anode).toBe('right');
    expect(cell.voltage).toBeCloseTo(1.1, 2);
  });

  it('gives the biggest voltage for the metals furthest apart, Mg and Ag', () => {
    const metals = COUPLES.map((c) => c.id);
    const best = metals
      .flatMap((a) => metals.map((b) => ({ a, b })))
      .map(({ a, b }) => ({
        pair: [a, b].sort().join('|'),
        v: analyzeCell({ left: half(a), right: half(b), saltBridge: true })
          .voltage,
      }))
      .sort((x, y) => y.v - x.v)[0];
    expect(best.pair).toBe('Ag|Mg');
  });

  // Nernst: E = E° − (0.0592 / n) log Q, with Q = [Zn²⁺] / [Cu²⁺]
  it('reads higher when the anode’s ions are dilute (Nernst equation)', () => {
    const cell = analyzeCell({ ...daniell, left: half('Zn', 'Zn', 0.01) });
    expect(cell.voltage).toBeCloseTo(1.1 + 0.0592, 2);
  });

  it('makes a concentration cell from one metal at two concentrations', () => {
    const cell = analyzeCell({
      left: half('Cu', 'Cu', 0.01),
      right: half('Cu', 'Cu', 1),
      saltBridge: true,
    });
    expect(cell.status).toBe('working');
    expect(cell.voltage).toBeCloseTo(0.0592, 3);
    expect(cell.anode).toBe('left'); // the dilute side
  });
});

describe('cells that don’t work', () => {
  it('reads 0 V with the same half-cell on both sides', () => {
    const cell = analyzeCell({ ...daniell, right: half('Zn') });
    expect(cell.status).toBe('no-difference');
    expect(cell.voltage).toBe(0);
  });

  it('reads 0 V without a salt bridge: the circuit isn’t complete', () => {
    const cell = analyzeCell({ ...daniell, saltBridge: false });
    expect(cell.status).toBe('no-salt-bridge');
    expect(cell.voltage).toBe(0);
  });

  it('reacts in the beaker when a metal sits in ions more easily reduced than its own', () => {
    expect(halfCellState(half('Zn', 'Cu'))).toBe('reacts'); // Cu plates onto the Zn
    const cell = analyzeCell({ ...daniell, left: half('Zn', 'Cu') });
    expect(cell.status).toBe('reacts-in-beaker');
    expect(cell.voltage).toBe(0);
  });

  it('has no defined potential when a metal sits in another metal’s ions that it can’t displace', () => {
    expect(halfCellState(half('Cu', 'Zn'))).toBe('no-own-ions');
    const cell = analyzeCell({ ...daniell, right: half('Cu', 'Zn') });
    expect(cell.status).toBe('mismatched');
  });
});

describe('running a cell down', () => {
  const run = (seconds: number) => {
    let state = { ...daniell };
    const voltages = [analyzeCell(state).voltage];
    for (let t = 0; t < seconds; t += 60) {
      state = runCell(state, 60);
      voltages.push(analyzeCell(state).voltage);
    }
    return { state, voltages };
  };

  it('uses up the cathode’s ions and makes more of the anode’s, mole for mole', () => {
    const { state } = run(3600);
    const made = state.left.concentration - 1;
    const used = 1 - state.right.concentration;
    expect(made).toBeGreaterThan(0);
    expect(made).toBeCloseTo(used, 6); // both ions are 2+
  });

  it('loses voltage as it runs, then goes flat once the Cu²⁺ is used up', () => {
    const { state, voltages } = run(3600 * 1000);
    voltages
      .slice(1)
      .forEach((v, i) => expect(v).toBeLessThanOrEqual(voltages[i] + 1e-12));
    expect(state.right.concentration).toBe(0);
    expect(analyzeCell(state).status).toBe('flat');
    expect(Math.min(...voltages)).toBeGreaterThanOrEqual(0);
  });

  it('runs a concentration cell down to 0 V as the two sides even out', () => {
    let state = {
      left: half('Cu', 'Cu', 0.01),
      right: half('Cu', 'Cu', 1),
      saltBridge: true,
    };
    for (let i = 0; i < 4000; i++) state = runCell(state, 6000);
    expect(analyzeCell(state).voltage).toBeLessThan(0.001);
    expect(state.left.concentration).toBeCloseTo(0.505, 2);
    expect(state.right.concentration).toBeCloseTo(0.505, 2);
  });

  it('stays put when the cell can’t run', () => {
    const stuck = { ...daniell, saltBridge: false };
    expect(runCell(stuck, 600)).toEqual(stuck);
  });
});

describe('electrolysis (Faraday’s law)', () => {
  it('plates 0.318 g of copper with 1 A for 965 s', () => {
    expect(electrolysis('copper-plating', 1, 965).cathode.grams).toBeCloseTo(
      0.3177,
      3,
    );
  });

  it('splits water into twice as much hydrogen as oxygen', () => {
    const { cathode, anode } = electrolysis('water', 2, 600);
    expect(cathode.product).toBe('H₂');
    expect(anode.product).toBe('O₂');
    expect(cathode.litres! / anode.litres!).toBeCloseTo(2, 6);
  });

  it('makes sodium metal and chlorine gas from molten salt', () => {
    const { cathode, anode } = electrolysis('molten-nacl', 1, 96485.33212);
    expect(cathode).toMatchObject({ product: 'Na' });
    expect(cathode.grams).toBeCloseTo(22.99, 2); // 1 mol of electrons → 1 mol Na
    expect(anode.product).toBe('Cl₂');
  });
});

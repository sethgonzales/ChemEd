import { COUPLES } from '~/constants/electrochemistry';
import { analyzeCell, type Cell } from './electrochemistry';
import { createRng } from './quest';
import {
  cellPotentialQuestion,
  electronFlowQuestion,
  reducingQuestion,
} from './quest-electrochemistry';

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const byMetal = (metal: string) => COUPLES.find((c) => c.metal === metal)!;

// a standard cell of two metals, as the simulation builds it
const cell = (a: string, b: string): Cell => ({
  left: { electrode: a, solution: a, concentration: 1 },
  right: { electrode: b, solution: b, concentration: 1 },
  saltBridge: true,
});

describe('Electrochemistry questions', () => {
  it('pick the metal that gives up electrons most easily: the lowest E°', () => {
    for (const seed of SEEDS) {
      const q = reducingQuestion(createRng(seed));
      const e = q.choices.map((m) => byMetal(m).eStandard);
      expect(e[q.answer]).toBe(Math.min(...e));
    }
  });

  it('send electrons from the anode to the cathode, as the simulation does', () => {
    for (const seed of SEEDS) {
      const q = electronFlowQuestion(createRng(seed));
      const [a, b] = q.pair;
      const { anode, cathode } = analyzeCell(cell(a, b));
      const name = (side: 'left' | 'right') =>
        COUPLES.find((c) => c.id === cell(a, b)[side].electrode)!.metal;
      expect(q.choices[q.answer]).toBe(
        `From ${name(anode!)} to ${name(cathode!)}`,
      );
    }
  });

  it('work out E°cell as cathode minus anode, as the simulation does', () => {
    for (const seed of SEEDS) {
      const q = cellPotentialQuestion(createRng(seed));
      const [a, b] = q.pair;
      const { standardVoltage } = analyzeCell(cell(a, b));
      expect(q.choices[q.answer]).toBe(`${standardVoltage!.toFixed(2)} V`);
    }
  });
});

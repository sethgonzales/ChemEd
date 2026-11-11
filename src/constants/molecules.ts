import type { Answer, BondOrder, Molecule, Skeleton } from '~/utils/lewis';

/** A central atom (index 0) bonded to each outer atom */
function star(center: string, outer: string[]): Skeleton {
  return {
    atoms: [center, ...outer].map((symbol) => ({ symbol })),
    bonds: outer.map((_, i) => [0, i + 1]),
  };
}

/** Two atoms bonded to each other */
function pair(a: string, b: string): Skeleton {
  return { atoms: [{ symbol: a }, { symbol: b }], bonds: [[0, 1]] };
}

/**
 * Every resonance form of a star where `doubles` of the outer bonds are
 * double. Outer atoms on a double bond get `lpDouble` lone pairs; the rest
 * get `lpSingle`.
 */
function resonance(
  outer: number,
  doubles: number,
  centerLp: number,
  lpDouble: number,
  lpSingle: number,
): Answer[] {
  const forms: Answer[] = [];
  const choose = (start: number, picked: number[]) => {
    if (picked.length === doubles) {
      const isDouble = (i: number) => picked.includes(i);
      forms.push({
        lonePairs: [
          centerLp,
          ...Array.from({ length: outer }, (_, i) =>
            isDouble(i) ? lpDouble : lpSingle,
          ),
        ],
        orders: Array.from(
          { length: outer },
          (_, i) => (isDouble(i) ? 2 : 1) as BondOrder,
        ),
      });
      return;
    }
    for (let i = start; i < outer; i++) choose(i + 1, [...picked, i]);
  };
  choose(0, []);
  return forms;
}

const singles = (n: number): BondOrder[] => Array(n).fill(1);

export const MOLECULES: Molecule[] = [
  // Level 1: single bonds
  {
    id: 'hydrogen',
    name: 'Hydrogen',
    formula: 'H2',
    charge: 0,
    level: 1,
    skeleton: pair('H', 'H'),
    answers: [{ lonePairs: [0, 0], orders: [1] }],
  },
  {
    id: 'chlorine',
    name: 'Chlorine',
    formula: 'Cl2',
    charge: 0,
    level: 1,
    skeleton: pair('Cl', 'Cl'),
    answers: [{ lonePairs: [3, 3], orders: [1] }],
  },
  {
    id: 'hydrogen-chloride',
    name: 'Hydrogen chloride',
    formula: 'HCl',
    charge: 0,
    level: 1,
    skeleton: pair('Cl', 'H'),
    answers: [{ lonePairs: [3, 0], orders: [1] }],
  },
  {
    id: 'hydrogen-fluoride',
    name: 'Hydrogen fluoride',
    formula: 'HF',
    charge: 0,
    level: 1,
    skeleton: pair('F', 'H'),
    answers: [{ lonePairs: [3, 0], orders: [1] }],
  },
  {
    id: 'water',
    name: 'Water',
    formula: 'H2O',
    charge: 0,
    level: 1,
    skeleton: star('O', ['H', 'H']),
    answers: [{ lonePairs: [2, 0, 0], orders: singles(2) }],
  },
  {
    id: 'ammonia',
    name: 'Ammonia',
    formula: 'NH3',
    charge: 0,
    level: 1,
    skeleton: star('N', ['H', 'H', 'H']),
    answers: [{ lonePairs: [1, 0, 0, 0], orders: singles(3) }],
  },
  {
    id: 'methane',
    name: 'Methane',
    formula: 'CH4',
    charge: 0,
    level: 1,
    skeleton: star('C', ['H', 'H', 'H', 'H']),
    answers: [{ lonePairs: [0, 0, 0, 0, 0], orders: singles(4) }],
  },

  // Level 2: multiple bonds
  {
    id: 'oxygen',
    name: 'Oxygen',
    formula: 'O2',
    charge: 0,
    level: 2,
    skeleton: pair('O', 'O'),
    answers: [{ lonePairs: [2, 2], orders: [2] }],
  },
  {
    id: 'nitrogen',
    name: 'Nitrogen',
    formula: 'N2',
    charge: 0,
    level: 2,
    skeleton: pair('N', 'N'),
    answers: [{ lonePairs: [1, 1], orders: [3] }],
  },
  {
    id: 'carbon-dioxide',
    name: 'Carbon dioxide',
    formula: 'CO2',
    charge: 0,
    level: 2,
    skeleton: star('C', ['O', 'O']),
    answers: [{ lonePairs: [0, 2, 2], orders: [2, 2] }],
  },
  {
    id: 'hydrogen-cyanide',
    name: 'Hydrogen cyanide',
    formula: 'HCN',
    charge: 0,
    level: 2,
    skeleton: star('C', ['H', 'N']),
    answers: [{ lonePairs: [0, 0, 1], orders: [1, 3] }],
  },
  {
    id: 'ethene',
    name: 'Ethene',
    formula: 'C2H4',
    charge: 0,
    level: 2,
    skeleton: {
      atoms: ['C', 'C', 'H', 'H', 'H', 'H'].map((symbol) => ({ symbol })),
      bonds: [
        [0, 1],
        [0, 2],
        [0, 3],
        [1, 4],
        [1, 5],
      ],
    },
    answers: [{ lonePairs: [0, 0, 0, 0, 0, 0], orders: [2, 1, 1, 1, 1] }],
  },
  {
    id: 'formaldehyde',
    name: 'Formaldehyde',
    formula: 'CH2O',
    charge: 0,
    level: 2,
    skeleton: star('C', ['O', 'H', 'H']),
    answers: [{ lonePairs: [0, 2, 0, 0], orders: [2, 1, 1] }],
  },

  // Level 3: ions and formal charge
  {
    id: 'ammonium',
    name: 'Ammonium ion',
    formula: 'NH4',
    charge: 1,
    level: 3,
    skeleton: star('N', ['H', 'H', 'H', 'H']),
    answers: [{ lonePairs: [0, 0, 0, 0, 0], orders: singles(4) }],
  },
  {
    id: 'hydronium',
    name: 'Hydronium ion',
    formula: 'H3O',
    charge: 1,
    level: 3,
    skeleton: star('O', ['H', 'H', 'H']),
    answers: [{ lonePairs: [1, 0, 0, 0], orders: singles(3) }],
  },
  {
    id: 'hydroxide',
    name: 'Hydroxide ion',
    formula: 'OH',
    charge: -1,
    level: 3,
    skeleton: pair('O', 'H'),
    answers: [{ lonePairs: [3, 0], orders: [1] }],
  },
  {
    id: 'cyanide',
    name: 'Cyanide ion',
    formula: 'CN',
    charge: -1,
    level: 3,
    skeleton: pair('C', 'N'),
    answers: [{ lonePairs: [1, 1], orders: [3] }],
  },
  {
    id: 'carbon-monoxide',
    name: 'Carbon monoxide',
    formula: 'CO',
    charge: 0,
    level: 3,
    skeleton: pair('C', 'O'),
    answers: [{ lonePairs: [1, 1], orders: [3] }],
  },

  // Level 4: resonance
  {
    id: 'ozone',
    name: 'Ozone',
    formula: 'O3',
    charge: 0,
    level: 4,
    skeleton: star('O', ['O', 'O']),
    answers: resonance(2, 1, 1, 2, 3),
  },
  {
    id: 'nitrate',
    name: 'Nitrate ion',
    formula: 'NO3',
    charge: -1,
    level: 4,
    skeleton: star('N', ['O', 'O', 'O']),
    answers: resonance(3, 1, 0, 2, 3),
  },
  {
    id: 'carbonate',
    name: 'Carbonate ion',
    formula: 'CO3',
    charge: -2,
    level: 4,
    skeleton: star('C', ['O', 'O', 'O']),
    answers: resonance(3, 1, 0, 2, 3),
  },
  {
    id: 'nitrite',
    name: 'Nitrite ion',
    formula: 'NO2',
    charge: -1,
    level: 4,
    skeleton: star('N', ['O', 'O']),
    answers: resonance(2, 1, 1, 2, 3),
  },
  {
    id: 'sulfur-dioxide',
    name: 'Sulfur dioxide',
    formula: 'SO2',
    charge: 0,
    level: 4,
    skeleton: star('S', ['O', 'O']),
    answers: [{ lonePairs: [1, 2, 2], orders: [2, 2] }],
    alsoAccepted: resonance(2, 1, 1, 2, 3),
    note: 'Correct by the octet rule. Expanding sulfur’s octet to 10 electrons gives every atom a formal charge of 0.',
  },

  // Level 5: exceptions to the octet rule
  {
    id: 'boron-trifluoride',
    name: 'Boron trifluoride',
    formula: 'BF3',
    charge: 0,
    level: 5,
    skeleton: star('B', ['F', 'F', 'F']),
    answers: [{ lonePairs: [0, 3, 3, 3], orders: singles(3) }],
  },
  {
    id: 'beryllium-chloride',
    name: 'Beryllium chloride',
    formula: 'BeCl2',
    charge: 0,
    level: 5,
    skeleton: star('Be', ['Cl', 'Cl']),
    answers: [{ lonePairs: [0, 3, 3], orders: singles(2) }],
  },
  {
    id: 'nitric-oxide',
    name: 'Nitric oxide',
    formula: 'NO',
    charge: 0,
    level: 5,
    skeleton: pair('N', 'O'),
    answers: [{ lonePairs: [1, 2], orders: [2], radicals: [1, 0] }],
  },
  {
    id: 'phosphorus-pentachloride',
    name: 'Phosphorus pentachloride',
    formula: 'PCl5',
    charge: 0,
    level: 5,
    skeleton: star('P', ['Cl', 'Cl', 'Cl', 'Cl', 'Cl']),
    answers: [{ lonePairs: [0, 3, 3, 3, 3, 3], orders: singles(5) }],
  },
  {
    id: 'sulfur-hexafluoride',
    name: 'Sulfur hexafluoride',
    formula: 'SF6',
    charge: 0,
    level: 5,
    skeleton: star('S', ['F', 'F', 'F', 'F', 'F', 'F']),
    answers: [{ lonePairs: [0, 3, 3, 3, 3, 3, 3], orders: singles(6) }],
  },
  {
    id: 'xenon-tetrafluoride',
    name: 'Xenon tetrafluoride',
    formula: 'XeF4',
    charge: 0,
    level: 5,
    skeleton: star('Xe', ['F', 'F', 'F', 'F']),
    answers: [{ lonePairs: [2, 3, 3, 3, 3], orders: singles(4) }],
  },
  {
    id: 'xenon-difluoride',
    name: 'Xenon difluoride',
    formula: 'XeF2',
    charge: 0,
    level: 5,
    skeleton: star('Xe', ['F', 'F']),
    answers: [{ lonePairs: [3, 3, 3], orders: singles(2) }],
  },
  {
    id: 'chlorine-trifluoride',
    name: 'Chlorine trifluoride',
    formula: 'ClF3',
    charge: 0,
    level: 5,
    skeleton: star('Cl', ['F', 'F', 'F']),
    answers: [{ lonePairs: [2, 3, 3, 3], orders: singles(3) }],
  },
  {
    id: 'sulfate',
    name: 'Sulfate ion',
    formula: 'SO4',
    charge: -2,
    level: 5,
    skeleton: star('S', ['O', 'O', 'O', 'O']),
    answers: resonance(4, 2, 0, 2, 3),
    alsoAccepted: [{ lonePairs: [0, 3, 3, 3, 3], orders: singles(4) }],
    note: 'Correct by the octet rule. Two S=O double bonds expand sulfur’s octet and give smaller formal charges.',
  },
  {
    id: 'phosphate',
    name: 'Phosphate ion',
    formula: 'PO4',
    charge: -3,
    level: 5,
    skeleton: star('P', ['O', 'O', 'O', 'O']),
    answers: resonance(4, 1, 0, 2, 3),
    alsoAccepted: [{ lonePairs: [0, 3, 3, 3, 3], orders: singles(4) }],
    note: 'Correct by the octet rule. One P=O double bond expands phosphorus’s octet and gives smaller formal charges.',
  },
];

import { ELEMENTS } from '~/constants/elements';
import { isException } from '~/utils/electron-configurations';

type BuildLevel = {
  name: string;
  symbols: string[];
  upTo: string; // the last subshell row drawn, so the boxes don't give the answer away
};

// elements from..to by atomic number, minus the exceptions (they get their own level)
const range = (from: number, to: number) =>
  ELEMENTS.slice(from - 1, to)
    .filter((e) => !isException(e.atomicNumber))
    .map((e) => e.symbol);

export const BUILD_LEVELS: BuildLevel[] = [
  { name: 'H to Ne', symbols: range(1, 10), upTo: '2p' },
  { name: 'Na to Ar', symbols: range(11, 18), upTo: '3p' },
  { name: 'K to Kr', symbols: range(19, 36), upTo: '4p' },
];

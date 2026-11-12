import { ELEMENTS } from '~/constants/elements';
import {
  SUBSHELL_ORDER,
  groundState,
  isException,
} from '~/utils/electron-configurations';
import { BUILD_LEVELS } from './electron-levels';

const z = (symbol: string) =>
  ELEMENTS.find((e) => e.symbol === symbol)!.atomicNumber;

describe('Build levels', () => {
  it('go H to Ne, Na to Ar, then K to Kr', () => {
    expect(BUILD_LEVELS.map((l) => l.name)).toEqual([
      'H to Ne',
      'Na to Ar',
      'K to Kr',
    ]);
    expect(BUILD_LEVELS[0].symbols).toHaveLength(10);
    expect(BUILD_LEVELS[1].symbols).toHaveLength(8);
  });

  it('leave the exceptions (Cr, Cu) for a later level', () => {
    const symbols = BUILD_LEVELS.flatMap((l) => l.symbols);
    expect(symbols).not.toContain('Cr');
    expect(symbols).not.toContain('Cu');
    for (const s of symbols) expect([s, isException(z(s))]).toEqual([s, false]);
  });

  it('show enough boxes for every element in the level', () => {
    for (const { symbols, upTo } of BUILD_LEVELS) {
      for (const s of symbols) {
        const highest = Math.max(
          ...groundState(z(s)).map((o) => SUBSHELL_ORDER.indexOf(o.subshell)),
        );
        expect(highest).toBeLessThanOrEqual(SUBSHELL_ORDER.indexOf(upTo));
      }
    }
  });
});

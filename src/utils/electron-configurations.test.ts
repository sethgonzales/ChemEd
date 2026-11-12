import { ELEMENTS } from '~/constants/elements';
import {
  SUBSHELL_ORDER,
  aufbauConfiguration,
  electronCount,
  formatConfiguration,
  groundState,
  ionConfiguration,
  isException,
  newArrows,
  orbitalDiagram,
  parseConfiguration,
  shellCounts,
} from './electron-configurations';

const z = (symbol: string) =>
  ELEMENTS.find((e) => e.symbol === symbol)!.atomicNumber;

// written the way a student would type it, for compact expectations
const plain = (symbol: string) =>
  formatConfiguration(groundState(z(symbol)), { superscripts: false });

describe('SUBSHELL_ORDER (the Aufbau, n + l, order)', () => {
  it('fills 4s before 3d, and 6s before 4f and 5d', () => {
    expect(SUBSHELL_ORDER.slice(0, 8)).toEqual([
      '1s',
      '2s',
      '2p',
      '3s',
      '3p',
      '4s',
      '3d',
      '4p',
    ]);
    expect(SUBSHELL_ORDER.slice(11, 15)).toEqual(['6s', '4f', '5d', '6p']);
  });

  it('ends at 7p, enough for all 118 elements', () => {
    expect(SUBSHELL_ORDER.at(-1)).toBe('7p');
    expect(
      SUBSHELL_ORDER.reduce(
        (n, s) => n + { s: 2, p: 6, d: 10, f: 14 }[s[1] as 's'],
        0,
      ),
    ).toBe(118);
  });
});

describe('parseConfiguration', () => {
  it('reads full notation, with or without spaces or superscripts', () => {
    const neon = [
      { subshell: '1s', electrons: 2 },
      { subshell: '2s', electrons: 2 },
      { subshell: '2p', electrons: 6 },
    ];
    expect(parseConfiguration('1s2 2s2 2p6')).toEqual(neon);
    expect(parseConfiguration('1s22s22p6')).toEqual(neon);
    expect(parseConfiguration('1s² 2s² 2p⁶')).toEqual(neon);
  });

  it('reads two-digit counts typed without spaces', () => {
    expect(electronCount(parseConfiguration('[Ar]3d104s24p2')!)).toBe(32);
    expect(electronCount(parseConfiguration('[Xe]4f145d106s2')!)).toBe(80);
  });

  it('expands the noble-gas shorthand', () => {
    expect(electronCount(parseConfiguration('[Ar] 3d5 4s1')!)).toBe(24);
  });

  it('lists subshells in filling order, whatever order they were typed', () => {
    expect(
      parseConfiguration('[Ar] 3d5 4s1')!
        .slice(-2)
        .map((o) => o.subshell),
    ).toEqual(['4s', '3d']);
  });

  it('rejects nonsense, overfull subshells and repeats', () => {
    expect(parseConfiguration('hello')).toBeNull();
    expect(parseConfiguration('1s3')).toBeNull();
    expect(parseConfiguration('2d1')).toBeNull(); // n = 2 has no d
    expect(parseConfiguration('1s2 1s2')).toBeNull();
    expect(parseConfiguration('[Zz] 1s1')).toBeNull();
  });
});

describe('formatConfiguration', () => {
  it('writes full notation with superscripts, in filling order', () => {
    expect(formatConfiguration(groundState(z('Na')))).toBe('1s² 2s² 2p⁶ 3s¹');
    expect(plain('Fe')).toBe('1s2 2s2 2p6 3s2 3p6 4s2 3d6');
  });

  it('shortens with the largest noble-gas core below the element', () => {
    const fe = groundState(z('Fe'));
    expect(formatConfiguration(fe, { shorthand: true })).toBe('[Ar] 4s² 3d⁶');
    // a noble gas uses the one before it, not itself
    expect(formatConfiguration(groundState(z('Ar')), { shorthand: true })).toBe(
      '[Ne] 3s² 3p⁶',
    );
    expect(formatConfiguration(groundState(z('H')), { shorthand: true })).toBe(
      '1s¹',
    );
  });
});

describe('aufbauConfiguration and exceptions', () => {
  it('predicts by filling subshells in order', () => {
    expect(
      formatConfiguration(aufbauConfiguration(z('Cr')), {
        shorthand: true,
        superscripts: false,
      }),
    ).toBe('[Ar] 4s2 3d4');
  });

  it('knows chromium and copper break the pattern, but iron does not', () => {
    expect(isException(z('Cr'))).toBe(true);
    expect(isException(z('Cu'))).toBe(true);
    expect(isException(z('Fe'))).toBe(false);
    expect(isException(z('O'))).toBe(false);
  });
});

describe('element data', () => {
  it('gives every element a configuration with as many electrons as protons', () => {
    for (const el of ELEMENTS) {
      expect([el.symbol, electronCount(groundState(el.atomicNumber))]).toEqual([
        el.symbol,
        el.atomicNumber,
      ]);
    }
  });

  it('only departs from the Aufbau order for the known exceptions', () => {
    // measured ground states (NIST), plus Lr's 7p; heavier ones are predictions
    const known = [
      'Cr',
      'Cu',
      'Nb',
      'Mo',
      'Ru',
      'Rh',
      'Pd',
      'Ag',
      'La',
      'Ce',
      'Gd',
      'Pt',
      'Au',
      'Ac',
      'Th',
      'Pa',
      'U',
      'Np',
      'Cm',
      'Lr',
    ];
    const exceptions = ELEMENTS.filter((e) => isException(e.atomicNumber)).map(
      (e) => e.symbol,
    );
    expect(exceptions).toEqual(known);
  });
});

describe('orbitalDiagram (Hund’s rule)', () => {
  it('half-fills every box with parallel spins before pairing', () => {
    const p = orbitalDiagram(groundState(z('N'))).find(
      (s) => s.subshell === '2p',
    )!;
    expect(p.boxes).toEqual([['up'], ['up'], ['up']]);

    const o = orbitalDiagram(groundState(z('O'))).find(
      (s) => s.subshell === '2p',
    )!;
    expect(o.boxes).toEqual([['up', 'down'], ['up'], ['up']]);
  });

  it('gives each subshell its number of orbitals', () => {
    const boxes = (subshell: string) =>
      orbitalDiagram(groundState(z('U'))).find((s) => s.subshell === subshell)!
        .boxes.length;
    expect([boxes('1s'), boxes('2p'), boxes('3d'), boxes('5f')]).toEqual([
      1, 3, 5, 7,
    ]);
  });
});

describe('shellCounts (the Bohr view)', () => {
  it('counts electrons in each shell n', () => {
    expect(shellCounts(groundState(z('Na')))).toEqual([2, 8, 1]);
    expect(shellCounts(groundState(z('Fe')))).toEqual([2, 8, 14, 2]);
  });
});

describe('ionConfiguration', () => {
  const ion = (symbol: string, charge: number) =>
    formatConfiguration(ionConfiguration(z(symbol), charge)!, {
      shorthand: true,
      superscripts: false,
    });

  it('takes electrons from the outermost shell first, so 4s leaves before 3d', () => {
    expect(ion('Na', 1)).toBe('[He] 2s2 2p6');
    expect(ion('Fe', 2)).toBe('[Ar] 3d6');
    expect(ion('Fe', 3)).toBe('[Ar] 3d5');
    expect(ion('Cu', 2)).toBe('[Ar] 3d9');
  });

  it('takes p before s within a shell', () => {
    expect(ion('Sn', 2)).toBe('[Kr] 5s2 4d10');
  });

  it('adds electrons to anions in filling order', () => {
    expect(ion('Cl', -1)).toBe('[Ne] 3s2 3p6');
    expect(ion('O', -2)).toBe('[He] 2s2 2p6');
  });

  it('refuses to remove more electrons than the atom has', () => {
    expect(ionConfiguration(z('H'), 2)).toBeNull();
  });
});

describe('newArrows (what to animate when stepping to the next element)', () => {
  const step = (from: string, to: string) =>
    newArrows(groundState(z(from)), groundState(z(to)));

  it('finds the one electron the next element adds', () => {
    expect(step('C', 'N')).toEqual(['2p-2-up']);
    expect(step('N', 'O')).toEqual(['2p-0-down']); // the first pairing
  });

  it('finds every arrow that moves in an exception', () => {
    // V 4s² 3d³ → Cr 4s¹ 3d⁵: two 3d electrons appear, 4s loses one
    expect(step('V', 'Cr')).toEqual(['3d-3-up', '3d-4-up']);
  });
});

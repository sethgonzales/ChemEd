import { ELEMENTS } from '~/constants/elements';
import {
  electronCount,
  formatConfiguration,
  groundState,
  ionConfiguration,
  parseConfiguration,
} from './electron-configurations';
import { createRng } from './quest';
import {
  configurationQuestion,
  configurationRooms,
  electronPool,
  ionQuestion,
  unpaired,
  unpairedQuestion,
  valenceQuestion,
} from './quest-electrons';

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const byName = (name: string) => ELEMENTS.find((e) => e.name === name)!;
const named = (prompt: string) =>
  byName(/(?:of|does|has) ([A-Z][a-z]+)/.exec(prompt)![1]);

describe('Electron Configuration questions', () => {
  it('reach heavier elements at higher levels', () => {
    expect(electronPool(1).at(-1)!.atomicNumber).toBe(10);
    expect(electronPool(2).at(-1)!.atomicNumber).toBe(20);
    expect(electronPool(3).at(-1)!.atomicNumber).toBe(36);
  });

  it('count unpaired electrons by Hund’s rule', () => {
    expect(unpaired(groundState(8))).toBe(2); // O: 2p⁴
    expect(unpaired(groundState(7))).toBe(3); // N: 2p³
    expect(unpaired(groundState(24))).toBe(6); // Cr: 4s¹ 3d⁵
    expect(unpaired(groundState(10))).toBe(0);
  });

  it('offer one ground-state configuration among wrong ones', () => {
    for (const level of [1, 2, 3])
      for (const seed of SEEDS) {
        const q = configurationQuestion(createRng(seed), level);
        const e = named(q.prompt);
        const right = formatConfiguration(groundState(e.atomicNumber));
        q.choices.forEach((c, i) => expect(c === right).toBe(i === q.answer));
      }
  });

  it('show the Aufbau guess as a wrong answer for an exception like copper', () => {
    for (const seed of SEEDS) {
      const q = configurationQuestion(createRng(seed), 3);
      if (named(q.prompt).symbol !== 'Cu') continue;
      expect(q.choices).toContain('1s² 2s² 2p⁶ 3s² 3p⁶ 4s² 3d⁹');
    }
  });

  it('count valence electrons of main-group elements from the outer shell', () => {
    for (const seed of SEEDS) {
      const q = valenceQuestion(createRng(seed), 2);
      const e = named(q.prompt);
      expect(['s', 'p']).toContain(e.block);
      const expected =
        e.group! <= 2 ? e.group! : e.symbol === 'He' ? 2 : e.group! - 10;
      expect(q.choices[q.answer]).toBe(String(expected));
    }
  });

  it('ask for unpaired electrons', () => {
    for (const seed of SEEDS) {
      const q = unpairedQuestion(createRng(seed), 3);
      const e = named(q.prompt);
      expect(q.choices[q.answer]).toBe(
        String(unpaired(groundState(e.atomicNumber))),
      );
    }
  });

  it('ask for an ion’s configuration, with the right electron count', () => {
    for (const seed of SEEDS) {
      const q = ionQuestion(createRng(seed));
      const right = parseConfiguration(
        q.choices[q.answer].replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (d) =>
          String('⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(d)),
        ),
      )!;
      const [, symbol, digits, sign] = /^([A-Z][a-z]?)([¹²³]?)([⁺⁻])/.exec(
        q.about,
      )!;
      const e = ELEMENTS.find((x) => x.symbol === symbol)!;
      const size = digits ? '¹²³'.indexOf(digits) + 1 : 1;
      const charge = sign === '⁺' ? size : -size;
      expect(electronCount(right)).toBe(e.atomicNumber - charge);
      expect(q.choices[q.answer]).toBe(
        formatConfiguration(ionConfiguration(e.atomicNumber, charge)!),
      );
    }
  });
});

describe('the Lich’s rooms', () => {
  it('draw a light atom, then a heavier one, for General Chemistry', () => {
    for (const seed of SEEDS) {
      const [a, b] = configurationRooms(createRng(seed), 'general');
      expect(a.charge).toBe(0);
      expect(b.charge).toBe(0);
      expect(a.element.atomicNumber).toBeGreaterThanOrEqual(3);
      expect(a.element.atomicNumber).toBeLessThanOrEqual(10);
      expect(b.element.atomicNumber).toBeGreaterThan(10);
      expect(b.element.atomicNumber).toBeLessThanOrEqual(20);
    }
  });

  it('draw an atom into the d block, then an ion, for AP', () => {
    const ions = new Set<string>();
    for (const seed of SEEDS) {
      const [a, b] = configurationRooms(createRng(seed), 'ap');
      expect(a.charge).toBe(0);
      expect(a.element.atomicNumber).toBeGreaterThan(10);
      expect(a.element.atomicNumber).toBeLessThanOrEqual(30);
      expect(b.charge).not.toBe(0);
      expect(ionConfiguration(b.element.atomicNumber, b.charge)).not.toBeNull();
      ions.add(`${b.element.symbol}${b.charge}`);
    }
    expect(ions.size).toBeGreaterThan(4);
  });
});

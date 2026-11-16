import { SIMULATIONS } from './index';
import { GENERAL_TIPS, PAGE_TIPS, WET_LABS } from './guide-tips';

const PAGES = [
  '/',
  '/periodic-table',
  '/states-of-matter',
  '/lewis-structures',
  '/reaction-balancing',
  '/electron-configurations',
  '/electrochemistry',
  '/chemical-reactions',
];

describe('Mr. G page tips', () => {
  it.each(PAGES)('has a few tips for %s', (page) => {
    expect(PAGE_TIPS[page]?.length).toBeGreaterThanOrEqual(3);
  });

  it('keeps every tip short enough for his bubble', () => {
    const all = [...Object.values(PAGE_TIPS).flat(), ...GENERAL_TIPS];
    for (const tip of all) expect(tip.length).toBeLessThanOrEqual(140);
  });

  it('has general tips for pages without their own', () => {
    expect(GENERAL_TIPS.length).toBeGreaterThan(0);
  });

  it('teaches the reaction types and how to predict them', () => {
    const tips = PAGE_TIPS['/chemical-reactions'].join(' ');
    expect(tips).toMatch(/activity series/i);
    expect(tips).toMatch(/precipitate/i);
    expect(tips).toMatch(/spectator/i);
  });
});

describe('Electron Configurations tips', () => {
  it('explain Build mode as well as Explore', () => {
    const tips = PAGE_TIPS['/electron-configurations'];
    expect(tips.some((t) => /Build/.test(t))).toBe(true);
  });
});

describe('Electron Configurations ion tip', () => {
  it('explains which electrons an ion loses first', () => {
    const tips = PAGE_TIPS['/electron-configurations'];
    expect(tips.some((t) => /4s.*before.*3d/.test(t) && /ion/i.test(t))).toBe(
      true,
    );
  });
});

describe('Electrochemistry tips', () => {
  const tips = () => PAGE_TIPS['/electrochemistry'];

  it('teach An Ox, Red Cat', () => {
    expect(tips().some((t) => /An Ox, Red Cat/.test(t))).toBe(true);
  });

  it('explain why the salt bridge is needed', () => {
    expect(
      tips().some((t) => /salt bridge/i.test(t) && /charge/i.test(t)),
    ).toBe(true);
  });

  it('explain why a cell runs down', () => {
    expect(tips().some((t) => /runs down/i.test(t) && /Nernst/.test(t))).toBe(
      true,
    );
  });

  it('point to the close-up and the Electrolytic tab', () => {
    expect(tips().some((t) => /zoom/i.test(t))).toBe(true);
    expect(tips().some((t) => /Electrolytic/.test(t))).toBe(true);
  });
});

describe('WET_LABS', () => {
  it('lists the simulations with chemicals on the bench', () => {
    expect(WET_LABS).toEqual(['/titrations', '/electrochemistry']);
    for (const page of WET_LABS)
      expect(SIMULATIONS.some((s) => s.path === page)).toBe(true);
  });
});

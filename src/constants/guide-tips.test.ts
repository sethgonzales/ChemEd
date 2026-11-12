import { GENERAL_TIPS, PAGE_TIPS } from './guide-tips';

const PAGES = [
  '/',
  '/periodic-table',
  '/states-of-matter',
  '/lewis-structures',
  '/chemical-reactions',
  '/electron-configurations',
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

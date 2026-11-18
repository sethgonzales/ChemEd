import { loadStars, saveStars, starsFor } from './balloon-progress';

describe('stars', () => {
  beforeEach(() => localStorage.clear());

  it('gives three for a clean flight, fewer for each miss', () => {
    expect(starsFor(0)).toBe(3);
    expect(starsFor(1)).toBe(2);
    expect(starsFor(2)).toBe(2);
    expect(starsFor(3)).toBe(1);
  });

  it('keeps each course’s best, level by level', () => {
    saveStars('general', 'boyle', 2);
    saveStars('general', 'boyle', 1);
    saveStars('ap', 'boyle', 3);
    expect(loadStars()).toEqual({
      general: { boyle: 2 },
      ap: { boyle: 3 },
    });
  });

  it('starts empty when storage is broken', () => {
    localStorage.setItem('chem.balloon.stars', '{oops');
    expect(loadStars()).toEqual({});
  });
});

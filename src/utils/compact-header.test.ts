import { act, renderHook } from '@testing-library/react';
import { nextCompact, useCompactHeader } from './compact-header';

// a long page, with plenty of room to scroll past the header
const page = { room: 2000 };

describe('nextCompact', () => {
  it('stays full size at the top of the page', () => {
    expect(nextCompact(false, { ...page, scrollY: 0 })).toBe(false);
  });

  it('shrinks once the page has scrolled a little way', () => {
    expect(nextCompact(false, { ...page, scrollY: 200 })).toBe(true);
  });

  it('only grows back near the top, so it doesn’t flicker at the turn', () => {
    expect(nextCompact(true, { ...page, scrollY: 30 })).toBe(true);
    expect(nextCompact(true, { ...page, scrollY: 0 })).toBe(false);
  });

  it('stays full size on a page too short to scroll clear of it', () => {
    // shrinking would end the scroll, snapping back to the top and growing again
    expect(nextCompact(false, { room: 20, scrollY: 200 })).toBe(false);
  });
});

describe('useCompactHeader', () => {
  const scrollTo = (y: number) =>
    act(() => {
      Object.assign(window, { scrollY: y });
      window.dispatchEvent(new Event('scroll'));
    });

  beforeEach(() =>
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 5000,
    }),
  );
  afterEach(() => scrollTo(0));

  it('follows the page as it scrolls', () => {
    const { result } = renderHook(() => useCompactHeader());
    expect(result.current[0]).toBe(false);
    scrollTo(300);
    expect(result.current[0]).toBe(true);
    scrollTo(0);
    expect(result.current[0]).toBe(false);
  });
});

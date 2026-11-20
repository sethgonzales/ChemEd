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

  it('waits to shrink until the browser pulling the scroll back by what it shrinks still leaves it past the top', () => {
    // shrinking 58px from 60px scrolled would leave 2px, and grow it again
    expect(nextCompact(false, { ...page, scrollY: 60, shrinkBy: 58 })).toBe(
      false,
    );
    expect(nextCompact(false, { ...page, scrollY: 200, shrinkBy: 58 })).toBe(
      true,
    );
  });

  // The browser keeps the page's content still as the header changes size
  // (scroll anchoring), so shrinking pulls the scroll back by the difference,
  // and growing pushes it on again.
  it.each([58, 112])(
    'settles at every scroll position when shrinking takes %ipx off',
    (shrinkBy) => {
      for (let start = 0; start <= 400; start++) {
        let compact = false;
        let scrollY = start;
        const seen: boolean[] = [];
        for (let i = 0; i < 10; i++) {
          const next = nextCompact(compact, { ...page, scrollY, shrinkBy });
          if (next !== compact) scrollY += next ? -shrinkBy : shrinkBy;
          compact = next;
          seen.push(compact);
        }
        // at most one change, then it holds
        const changes = seen.filter((c, i) => i && c !== seen[i - 1]).length;
        expect({ start, changes }).toEqual({ start, changes: 0 });
      }
    },
  );

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

import { renderHook } from '@testing-library/react';
import { DEV_STORAGE_KEY, devToolsFrom, useDevTools } from './dev-tools';

describe('devToolsFrom', () => {
  it('is on while developing, without asking', () => {
    expect(
      devToolsFrom({ production: false, search: '', stored: null }).on,
    ).toBe(true);
  });

  it('is off in the deployed app until it’s switched on', () => {
    expect(
      devToolsFrom({ production: true, search: '', stored: null }),
    ).toEqual({
      on: false,
      store: null,
    });
  });

  it('switches on with ?dev=on, and remembers it', () => {
    expect(
      devToolsFrom({ production: true, search: '?dev=on', stored: null }),
    ).toEqual({ on: true, store: 'on' });
    expect(
      devToolsFrom({ production: true, search: '', stored: 'on' }).on,
    ).toBe(true);
  });

  it('switches off again with ?dev=off, forgetting it', () => {
    expect(
      devToolsFrom({ production: true, search: '?x=1&dev=off', stored: 'on' }),
    ).toEqual({ on: false, store: 'off' });
  });
});

describe('useDevTools', () => {
  afterEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('reads the switch from the address and keeps it for the next page', () => {
    window.history.replaceState(null, '', '/balloon-riser?dev=on');
    const { result } = renderHook(() => useDevTools({ production: true }));
    expect(result.current).toBe(true);
    expect(localStorage.getItem(DEV_STORAGE_KEY)).toBe('on');

    window.history.replaceState(null, '', '/balloon-riser');
    const again = renderHook(() => useDevTools({ production: true }));
    expect(again.result.current).toBe(true);
  });

  it('stays off in the deployed app for everyone else', () => {
    const { result } = renderHook(() => useDevTools({ production: true }));
    expect(result.current).toBe(false);
  });
});

import { act, renderHook } from '@testing-library/react';
import {
  isMuted,
  resetSounds,
  setMuted,
  useBloop,
  useChimeSound,
  useDamageSound,
  useHitSound,
  useMissSound,
  useDoorSound,
  useMuted,
  useTap,
  useThunk,
  useTick,
  useTreasureSound,
} from './sounds';
import { mockAudioContext } from './test-audio';

// every pitch the oscillators were given
const pitches = (ctx: ReturnType<typeof mockAudioContext>['ctx']) =>
  ctx.createOscillator.mock.results.flatMap(({ value }) =>
    value.frequency.setValueAtTime.mock.calls.map(([hz]: number[]) => hz),
  );

describe.each([['useDoorSound (opening a simulation)', useDoorSound]])(
  '%s',
  (_, useSound) => {
    it('creates one AudioContext lazily and plays a sound each call', () => {
      const { AudioContext, ctx } = mockAudioContext();
      const { result } = renderHook(() => useSound());
      expect(AudioContext).not.toHaveBeenCalled();

      result.current();
      jest.advanceTimersByTime(1000);
      result.current();

      expect(AudioContext).toHaveBeenCalledTimes(1);
      expect(ctx.createOscillator).toHaveBeenCalled();
    });

    it('sounds deep: every tone is low', () => {
      const { ctx } = mockAudioContext();
      const { result } = renderHook(() => useSound());
      // random variants, so play plenty to hear them all
      for (let i = 0; i < 40; i++) {
        result.current();
        jest.advanceTimersByTime(1000);
      }
      expect(Math.max(...pitches(ctx))).toBeLessThanOrEqual(400);
    });

    it('echoes, like a sound in a dungeon', () => {
      const { ctx } = mockAudioContext();
      const { result } = renderHook(() => useSound());
      result.current();
      expect(ctx.createDelay).toHaveBeenCalled();
    });
  },
);

// when each tone starts, in order
const startTimes = (ctx: ReturnType<typeof mockAudioContext>['ctx']) =>
  ctx.createOscillator.mock.results.map(
    ({ value }) => value.start.mock.calls[0][0] as number,
  );

// the page's clock spaces sounds out; tests move it by hand
beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  resetSounds();
});
afterEach(() => jest.useRealTimers());

// each tone's starting volume and how long it rings, in s
const tones = (ctx: ReturnType<typeof mockAudioContext>['ctx']) =>
  ctx.createGain.mock.results
    .map(({ value }) => value)
    .filter((g) => g.gain.exponentialRampToValueAtTime.mock.calls.length)
    .map((g) => ({
      volume: g.gain.setValueAtTime.mock.calls[0][0] as number,
      length: g.gain.exponentialRampToValueAtTime.mock.calls[0][1] as number,
    }));

describe('subtle UI sounds', () => {
  it.each([
    ['useTick (a button or checkbox)', useTick],
    ['useTap (picking an element or box)', useTap],
  ])('%s is short, quiet and dry', (_, useSound) => {
    const { ctx } = mockAudioContext();
    const { result } = renderHook(() => useSound());
    result.current();
    const played = tones(ctx);
    expect(played.length).toBeGreaterThan(0);
    for (const t of played) {
      expect(t.length).toBeLessThanOrEqual(0.06);
      expect(t.volume).toBeLessThanOrEqual(0.05); // a third of the bloop
    }
    expect(ctx.createDelay).not.toHaveBeenCalled(); // no echo to muddy it
  });

  it('taps a little brighter than it ticks', () => {
    const tick = mockAudioContext();
    renderHook(() => useTick()).result.current();
    resetSounds();
    const tap = mockAudioContext();
    renderHook(() => useTap()).result.current();
    expect(Math.min(...pitches(tap.ctx))).toBeGreaterThan(
      Math.max(...pitches(tick.ctx)),
    );
  });
});

describe('useThunk (a wrong answer)', () => {
  it('is a soft, low thunk that falls in pitch', () => {
    const { ctx } = mockAudioContext();
    renderHook(() => useThunk()).result.current();
    const hz = pitches(ctx);
    expect(Math.max(...hz)).toBeLessThanOrEqual(200);
    const osc = ctx.createOscillator.mock.results[0].value;
    const [[to]] = osc.frequency.exponentialRampToValueAtTime.mock.calls;
    expect(to).toBeLessThan(hz[0]);
    for (const t of tones(ctx)) expect(t.volume).toBeLessThan(0.35); // under the door
  });
});

describe('battle sounds', () => {
  const play = (useSound: () => () => void) => {
    resetSounds(); // a fresh AudioContext, so each sound is measured alone
    const { ctx } = mockAudioContext();
    renderHook(() => useSound()).result.current();
    const oscs = ctx.createOscillator.mock.results.map(({ value }) => value);
    return {
      hz: pitches(ctx),
      types: oscs.map((o) => o.type),
      // where each sliding tone ends up, against where it started
      slides: oscs.flatMap((o) => {
        const [[from]] = o.frequency.setValueAtTime.mock.calls;
        const ramp = o.frequency.exponentialRampToValueAtTime.mock.calls[0];
        return ramp ? [ramp[0] / from] : [];
      }),
      loudest: Math.max(...tones(ctx).map((t) => t.volume)),
      longest: Math.max(...tones(ctx).map((t) => t.length)),
    };
  };

  it('a hit on the boss is a quick, bright strike that rings upwards', () => {
    const hit = play(useHitSound);
    expect(Math.max(...hit.hz)).toBeGreaterThanOrEqual(600);
    expect(hit.slides.some((r) => r > 1)).toBe(true);
    expect(hit.longest).toBeLessThanOrEqual(0.35);
  });

  it('a miss is a soft whoosh that falls away', () => {
    const miss = play(useMissSound);
    expect(miss.slides.every((r) => r < 1)).toBe(true);
    expect(miss.loudest).toBeLessThan(play(useHitSound).loudest);
  });

  it('taking damage is a low, harsh crunch', () => {
    const damage = play(useDamageSound);
    expect(Math.max(...damage.hz)).toBeLessThanOrEqual(250);
    expect(damage.types.some((t) => t === 'sawtooth' || t === 'square')).toBe(
      true,
    );
    expect(damage.slides.some((r) => r < 1)).toBe(true);
  });
});

describe('useChimeSound (entering a chamber)', () => {
  it('rings a rising run of bells, softer than the treasure', () => {
    const { ctx } = mockAudioContext();
    renderHook(() => useChimeSound()).result.current();
    const notes = ctx.createOscillator.mock.results.map(({ value }) => value);
    expect(notes.length).toBeGreaterThanOrEqual(3);
    expect(notes.every((n) => n.type === 'sine')).toBe(true);
    const hz = pitches(ctx);
    expect(hz).toEqual([...hz].sort((a, b) => a - b));
    const times = startTimes(ctx);
    expect(times[times.length - 1]).toBeGreaterThan(times[0]);
  });
});

describe('sharing and spacing sounds', () => {
  it('uses one AudioContext for every sound on the page', () => {
    const { AudioContext } = mockAudioContext();
    for (const useSound of [useTick, useTap, useBloop, useThunk]) {
      renderHook(() => useSound()).result.current();
      jest.advanceTimersByTime(1000);
    }
    expect(AudioContext).toHaveBeenCalledTimes(1);
  });

  it('plays a sound once, not in a burst, when it repeats within 40 ms', () => {
    const { ctx } = mockAudioContext();
    const { result } = renderHook(() => useTick());
    result.current();
    const once = ctx.createOscillator.mock.calls.length;
    jest.advanceTimersByTime(20);
    result.current();
    expect(ctx.createOscillator).toHaveBeenCalledTimes(once);
    jest.advanceTimersByTime(50);
    result.current();
    expect(ctx.createOscillator).toHaveBeenCalledTimes(once * 2);
  });

  it('wakes audio the browser suspended, and keeps playing while its clock is frozen', () => {
    const { ctx } = mockAudioContext();
    ctx.state = 'suspended'; // before a first tap, or after the phone sleeps
    const { result } = renderHook(() => useTick());
    result.current();
    expect(ctx.resume).toHaveBeenCalled();
    const once = ctx.createOscillator.mock.calls.length;
    jest.advanceTimersByTime(100); // ctx.currentTime stays 0
    result.current();
    expect(ctx.createOscillator).toHaveBeenCalledTimes(once * 2);
  });

  it('still plays different sounds together: a click and its answer', () => {
    const { ctx } = mockAudioContext();
    renderHook(() => useTick()).result.current();
    const tick = ctx.createOscillator.mock.calls.length;
    renderHook(() => useThunk()).result.current();
    expect(ctx.createOscillator.mock.calls.length).toBeGreaterThan(tick);
  });
});

describe('useTreasureSound (a success)', () => {
  it('plays a rising 8-bit arpeggio', () => {
    const { ctx } = mockAudioContext();
    const { result } = renderHook(() => useTreasureSound());
    result.current();

    const notes = ctx.createOscillator.mock.results.map(({ value }) => value);
    expect(notes.length).toBeGreaterThanOrEqual(3);
    expect(notes.every((n) => n.type === 'square')).toBe(true);
    const hz = pitches(ctx);
    expect(hz).toEqual([...hz].sort((a, b) => a - b));
    expect(hz[hz.length - 1]).toBeGreaterThan(hz[0]);
    const times = startTimes(ctx);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(times[times.length - 1]).toBeGreaterThan(times[0]);
  });
});

describe('useBloop (clicking a header tile)', () => {
  it('plays a short bubbling potion sound', () => {
    const { ctx } = mockAudioContext();
    const { result } = renderHook(() => useBloop());
    result.current();
    expect(ctx.createOscillator).toHaveBeenCalled();
  });
});

describe('muting', () => {
  it('starts unmuted', () => {
    expect(isMuted()).toBe(false);
  });

  it('silences every sound, and is remembered in the browser', () => {
    const { AudioContext } = mockAudioContext();
    setMuted(true);
    expect(localStorage.getItem('chem.sound.muted')).toBe('true');
    for (const useSound of [
      useDoorSound,
      useBloop,
      useTreasureSound,
      useTick,
      useTap,
      useThunk,
    ]) {
      const { result } = renderHook(() => useSound());
      result.current();
    }
    expect(AudioContext).not.toHaveBeenCalled();

    setMuted(false);
    expect(isMuted()).toBe(false);
  });

  it('stays quiet where the browser has no Web Audio', () => {
    Object.assign(globalThis, { AudioContext: undefined });
    const { result } = renderHook(() => useTreasureSound());
    expect(() => result.current()).not.toThrow();
  });
});

describe('useMuted', () => {
  it('reads the remembered setting and toggles it', () => {
    setMuted(true);
    const { result } = renderHook(() => useMuted());
    expect(result.current[0]).toBe(true);

    act(() => result.current[1]());
    expect(result.current[0]).toBe(false);
    expect(isMuted()).toBe(false);
  });
});

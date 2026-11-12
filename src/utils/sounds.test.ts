import { act, renderHook } from '@testing-library/react';
import {
  isMuted,
  setMuted,
  useBloop,
  useDoorSound,
  useMuted,
  useTreasureSound,
} from './sounds';

function mockAudioContext() {
  const param = () => ({
    value: 0,
    setValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
  });
  type AudioNodeMock = {
    type: string;
    frequency: ReturnType<typeof param>;
    gain: ReturnType<typeof param>;
    delayTime: ReturnType<typeof param>;
    connect: jest.Mock;
    start: jest.Mock;
    stop: jest.Mock;
  };
  const node = (): AudioNodeMock => {
    const n: AudioNodeMock = {
      type: '',
      frequency: param(),
      gain: param(),
      delayTime: param(),
      connect: jest.fn(() => n),
      start: jest.fn(),
      stop: jest.fn(),
    };
    return n;
  };
  const ctx = {
    currentTime: 0,
    destination: {},
    createOscillator: jest.fn(node),
    createGain: jest.fn(node),
    createBiquadFilter: jest.fn(node),
    createDelay: jest.fn(node),
  };
  const AudioContext = jest.fn(() => ctx);
  Object.assign(globalThis, { AudioContext });
  return { AudioContext, ctx };
}

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
      result.current();

      expect(AudioContext).toHaveBeenCalledTimes(1);
      expect(ctx.createOscillator).toHaveBeenCalled();
    });

    it('sounds deep: every tone is low', () => {
      const { ctx } = mockAudioContext();
      const { result } = renderHook(() => useSound());
      // random variants, so play plenty to hear them all
      for (let i = 0; i < 40; i++) result.current();
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

beforeEach(() => localStorage.clear());

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
    for (const useSound of [useDoorSound, useBloop, useTreasureSound]) {
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

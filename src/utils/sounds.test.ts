import { renderHook } from '@testing-library/react';
import { useChime, useDoorSound } from './sounds';

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

describe.each([
  ['useChime (hovering a header tile)', useChime],
  ['useDoorSound (opening a simulation)', useDoorSound],
])('%s', (_, useSound) => {
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
});

import { renderHook } from '@testing-library/react';
import { useChime, useKnock } from './use-knock';

function mockAudioContext() {
  const param = () => ({
    setValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
  });
  type AudioNodeMock = {
    type: string;
    frequency: ReturnType<typeof param>;
    gain: ReturnType<typeof param>;
    connect: jest.Mock;
    start: jest.Mock;
    stop: jest.Mock;
  };
  const node = (): AudioNodeMock => {
    const n: AudioNodeMock = {
      type: '',
      frequency: param(),
      gain: param(),
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
  };
  const AudioContext = jest.fn(() => ctx);
  Object.assign(globalThis, { AudioContext });
  return { AudioContext, ctx };
}

describe.each([
  ['useKnock', useKnock],
  ['useChime', useChime],
])('%s', (_, hook) => {
  it('creates one AudioContext lazily and plays a sound each call', () => {
    const { AudioContext, ctx } = mockAudioContext();
    const { result } = renderHook(() => hook());
    expect(AudioContext).not.toHaveBeenCalled();

    result.current();
    result.current();

    expect(AudioContext).toHaveBeenCalledTimes(1);
    expect(ctx.createOscillator).toHaveBeenCalled();
  });
});

// A stand-in Web Audio API for tests, which records every node and call

export function mockAudioContext() {
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
    state: 'running' as AudioContextState,
    resume: jest.fn(() => Promise.resolve()),
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

export type MockAudioContext = ReturnType<typeof mockAudioContext>['ctx'];

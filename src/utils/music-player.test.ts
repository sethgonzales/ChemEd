import { act, renderHook } from '@testing-library/react';
import { THEMES, noteHz, parseVoice } from './music';
import {
  playMusic,
  resetMusic,
  stopMusic,
  useMusicSetting,
} from './music-player';
import { resetSounds, setMuted } from './sounds';
import { mockAudioContext, type MockAudioContext } from './test-audio';

let ctx: MockAudioContext;
beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  resetSounds();
  resetMusic();
  ({ ctx } = mockAudioContext());
});
afterEach(() => {
  stopMusic();
  jest.useRealTimers();
});

// let the page's clock and the scheduler run on
const run = (seconds: number) => {
  ctx.currentTime += seconds;
  act(() => jest.advanceTimersByTime(seconds * 1000));
};
const played = () =>
  ctx.createOscillator.mock.results.flatMap(({ value }) =>
    value.frequency.setValueAtTime.mock.calls.map(([hz]: number[]) =>
      Math.round(hz),
    ),
  );
const opening = (id: string) =>
  Math.round(noteHz(parseVoice(THEMES[id].voices[0].notes)[0].note));

describe('the music player', () => {
  it('plays a track’s notes as the clock runs', () => {
    playMusic('dungeon');
    run(2);
    expect(played()).toContain(opening('dungeon'));
    expect(played().length).toBeGreaterThan(3);
  });

  it('carries on when asked for the track already playing', () => {
    playMusic('dungeon');
    run(1);
    const before = played().length;
    playMusic('dungeon');
    run(0.01);
    expect(played().filter((hz) => hz === opening('dungeon'))).toHaveLength(1);
    expect(played().length).toBeGreaterThanOrEqual(before);
  });

  it('switches to a chamber’s own theme', () => {
    playMusic('dungeon');
    run(1);
    playMusic('states');
    run(1);
    expect(played()).toContain(opening('states'));
  });

  it('starts the theme over, quicker and with a drum, when the fight begins', () => {
    playMusic('lewis');
    run(1);
    const before = ctx.createOscillator.mock.calls.length;
    playMusic('lewis', true);
    run(0.01);
    const kick = ctx.createOscillator.mock.results
      .slice(before)
      .some(({ value }) => value.type === 'sine');
    expect(kick).toBe(true);
    expect(played()).toContain(opening('lewis'));
  });

  it('stops: no more notes', () => {
    playMusic('dungeon');
    run(1);
    stopMusic();
    const before = played().length;
    run(5);
    expect(played()).toHaveLength(before);
  });

  it('stays silent while sounds are muted, and picks up again when they’re not', () => {
    setMuted(true);
    playMusic('dungeon');
    run(2);
    expect(played()).toHaveLength(0);
    act(() => setMuted(false));
    run(2);
    expect(played().length).toBeGreaterThan(0);
  });

  it('stops when sounds are muted mid-tune', () => {
    playMusic('balancing', true);
    run(1);
    act(() => setMuted(true));
    const before = played().length;
    run(3);
    expect(played()).toHaveLength(before);
  });
});

describe('useMusicSetting', () => {
  it('is on to start with, and remembers being turned off', () => {
    const { result, unmount } = renderHook(() => useMusicSetting());
    expect(result.current[0]).toBe(true);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(false);
    unmount();
    expect(renderHook(() => useMusicSetting()).result.current[0]).toBe(false);
  });
});

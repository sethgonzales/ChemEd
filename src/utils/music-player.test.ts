import { act } from '@testing-library/react';
import { THEMES, noteHz, parseVoice } from './music';
import { playMusic, resetMusic, stopMusic } from './music-player';
import { resetSounds, setMuted, setVolume } from './sounds';
import {
  mockAudioContext,
  speakers,
  type MockAudioContext,
} from './test-audio';

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

  it('speeds up for the boss’s last stand without starting the tune over', () => {
    // the finale's first half second, from the top
    playMusic('lewis', 'finale');
    run(0.5);
    const fromTop = played();
    resetMusic();
    ctx.createOscillator.mockClear();

    playMusic('lewis', true);
    run(3);
    const before = played().length;
    playMusic('lewis', 'finale');
    run(0.5);
    const carried = played().slice(before);
    expect(carried.length).toBeGreaterThan(0);
    expect(carried.slice(0, fromTop.length)).not.toEqual(fromTop);
  });

  it('plays the finale quicker than the fight', () => {
    const notesIn = (fight: true | 'finale') => {
      resetMusic();
      ctx.createOscillator.mockClear();
      playMusic('lewis', fight);
      run(4);
      return played().length;
    };
    expect(notesIn('finale')).toBeGreaterThan(notesIn(true));
  });

  it('gives slap bass and blips their wet, sliding pitch', () => {
    playMusic('reactions');
    run(2);
    const slides = ctx.createOscillator.mock.results.filter(
      ({ value }) =>
        value.frequency.exponentialRampToValueAtTime.mock.calls.length,
    );
    expect(slides.length).toBeGreaterThan(0);
  });

  it('can fall silent for a moment before the next theme, then play it', () => {
    playMusic('dungeon');
    run(1);
    const before = played().length;
    playMusic('lewis', false, 1500);
    run(1.2);
    expect(played()).toHaveLength(before); // the pause
    run(1);
    expect(played()).toContain(opening('lewis'));
  });

  it('cancels a pending theme if asked for another meanwhile', () => {
    playMusic('lewis', false, 1500);
    playMusic(null);
    run(3);
    expect(played()).toHaveLength(0);
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

  it('plays through the header’s volume control, like the sounds', () => {
    setVolume(0.5);
    playMusic('dungeon');
    run(1);
    const [volume, ...others] = speakers(ctx);
    expect(others).toEqual([]);
    expect(volume.gain.value).toBeLessThan(0.5);
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

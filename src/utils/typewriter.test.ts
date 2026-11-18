import { briefingAt, typedAt } from './typewriter';

const intro = 'Next stop: Red Mesa, up ahead.';
const body = ['The heater’s holding the helium.', 'Help me find the volume.'];
const lines = [intro, ...body];

describe('typedAt', () => {
  it('types a line out a letter at a time, from nothing to all of it', () => {
    expect(typedAt(intro, 0)).toBe('');
    const part = typedAt(intro, 200);
    expect(part.length).toBeGreaterThan(0);
    expect(part.length).toBeLessThan(intro.length);
    expect(intro.startsWith(part)).toBe(true);
    expect(typedAt(intro, 60_000)).toBe(intro);
  });
});

describe('briefingAt', () => {
  it('types the intro first, with the rest still to come', () => {
    const now = briefingAt(lines, 200);
    expect(now.intro?.text.length).toBeGreaterThan(0);
    expect(now.intro?.fading).toBe(false);
    expect(now.body).toEqual(['', '']);
  });

  it('holds the whole intro a moment, then fades it away', () => {
    const typed = lines[0].length * 50;
    const states = Array.from({ length: 200 }, (_, i) =>
      briefingAt(lines, i * 50),
    );
    const whole = states.findIndex((s) => s.intro?.text === intro);
    const fading = states.findIndex((s) => s.intro?.fading);
    const gone = states.findIndex((s) => s.intro === null);
    expect(whole).toBeGreaterThan(0);
    expect(fading).toBeGreaterThan(whole);
    expect(gone).toBeGreaterThan(fading);
    expect(gone * 50).toBeGreaterThan(Math.min(typed, 1000));
  });

  it('types the important lines once the intro’s gone, one after another, and keeps them', () => {
    const states = Array.from({ length: 400 }, (_, i) =>
      briefingAt(lines, i * 50),
    );
    const gone = states.findIndex((s) => s.intro === null);
    expect(states[gone - 1].body).toEqual(['', '']);
    const firstDone = states.findIndex((s) => s.body[0] === body[0]);
    const secondStarts = states.findIndex((s) => s.body[1].length > 0);
    expect(secondStarts).toBeGreaterThan(firstDone - 1);
    const end = states[states.length - 1];
    expect(end.body).toEqual(body);
    expect(end.done).toBe(true);
  });

  it('shows everything at once when time’s skipped to the end', () => {
    expect(briefingAt(lines, Infinity)).toEqual({
      intro: null,
      body,
      done: true,
    });
  });
});

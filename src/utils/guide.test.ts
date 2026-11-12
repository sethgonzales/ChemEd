import {
  BUBBLE_MAX_MS,
  BUBBLE_MIN_MS,
  WANDER_RANGE_PX,
  bubbleDuration,
  nextWanderX,
  tipsFor,
  withGreeting,
} from './guide';
import { GENERAL_TIPS, PAGE_TIPS } from '~/constants/guide-tips';

describe('bubbleDuration', () => {
  it('gives longer messages longer on screen', () => {
    expect(
      bubbleDuration('A longer message that takes a while to read'),
    ).toBeGreaterThan(bubbleDuration('Hi!'));
  });

  it('stays between the shortest and longest times', () => {
    expect(bubbleDuration('Hi')).toBe(BUBBLE_MIN_MS);
    expect(bubbleDuration('x'.repeat(1000))).toBe(BUBBLE_MAX_MS);
  });
});

describe('nextWanderX', () => {
  it('stays within his patch of the corner', () => {
    for (const r of [0, 0.25, 0.5, 0.99]) {
      const x = nextWanderX(80, () => r);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(WANDER_RANGE_PX);
    }
  });

  it('always moves at least a little, so it looks like a walk', () => {
    for (const r of [0, 0.5, 0.99]) {
      expect(Math.abs(nextWanderX(80, () => r) - 80)).toBeGreaterThanOrEqual(
        24,
      );
    }
  });
});

describe('tipsFor', () => {
  it('gives the tips for that page', () => {
    expect(tipsFor('/lewis-structures')).toBe(PAGE_TIPS['/lewis-structures']);
  });

  it('falls back to general tips', () => {
    expect(tipsFor('/titrations')).toBe(GENERAL_TIPS);
  });
});

describe('withGreeting', () => {
  it('introduces him the first time he speaks', () => {
    expect(withGreeting('Pick a tool.', false)).toBe(
      "Hi, I'm Mr. G! Pick a tool.",
    );
  });

  it('skips the introduction after that', () => {
    expect(withGreeting('Pick a tool.', true)).toBe('Pick a tool.');
  });
});

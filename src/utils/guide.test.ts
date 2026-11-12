import {
  BUBBLE_MAX_MS,
  BUBBLE_MIN_MS,
  WANDER_RANGE_PX,
  bubbleDuration,
  nextWanderX,
  balanceMessage,
  checkMessage,
  phaseMessage,
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

describe('balanceMessage', () => {
  const water = { reactants: ['H2', 'O2'], products: ['H2O'] };

  it('cheers when every element balances in lowest terms', () => {
    expect(balanceMessage(water, [2, 1, 2])).toEqual({
      mood: 'cheer',
      text: expect.stringMatching(/balanced/i),
    });
  });

  it('nudges toward smaller numbers when balanced but not in lowest terms', () => {
    const message = balanceMessage(water, [4, 2, 4]);
    expect(message?.mood).toBe('hint');
    expect(message?.text).toMatch(/smaller/);
    expect(message?.text).toContain('2');
  });

  it('names an element that is off, with both counts', () => {
    const message = balanceMessage(water, [1, 1, 1]);
    expect(message?.mood).toBe('hint');
    expect(message?.text).toMatch(/Oxygen/);
    expect(message?.text).toMatch(/2 .*1 /);
  });

  it('stays quiet while a coefficient is blank', () => {
    expect(balanceMessage(water, [0, 1, 1])).toBeNull();
  });
});

describe('checkMessage', () => {
  it('cheers the best structure', () => {
    expect(checkMessage('best', [])?.mood).toBe('cheer');
  });

  it('cheers an accepted structure too', () => {
    expect(checkMessage('accepted', [])?.mood).toBe('cheer');
  });

  it('passes on the first problem, kindly', () => {
    const message = checkMessage('invalid', [
      { kind: 'octet', message: 'O has 6 electrons around it; it needs 8.' },
      { kind: 'octet', message: 'C has 6 electrons around it; it needs 8.' },
    ]);
    expect(message?.mood).toBe('hint');
    expect(message?.text).toContain('O has 6 electrons around it');
    expect(message?.text).not.toContain('C has 6');
  });

  it('encourages a valid structure that is not the best yet', () => {
    const message = checkMessage('valid', [
      {
        kind: 'formal-charge',
        message: 'Try to get the formal charges closer to zero.',
      },
    ]);
    expect(message?.mood).toBe('hint');
    expect(message?.text).toMatch(/close/i);
    expect(message?.text).toContain('formal charges');
  });
});

describe('phaseMessage', () => {
  it.each([
    ['Solid', 'Liquid', /melting/i],
    ['Liquid', 'Gas', /boiling/i],
    ['Gas', 'Liquid', /condens/i],
    ['Liquid', 'Solid', /freez/i],
    ['Solid', 'Gas', /gas/i],
    ['Gas', 'Solid', /solid/i],
  ] as const)('explains going from %s to %s', (from, to, says) => {
    expect(phaseMessage(from, to)).toMatch(says);
  });
});

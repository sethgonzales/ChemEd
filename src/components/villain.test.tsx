import { act, render, screen } from '@testing-library/react';
import { GOLEM } from '~/constants/villains/golem';
import Villain, { DURATION_MS } from './villain';

const picture = () => screen.getByRole('img', { name: GOLEM.name });
const fills = () =>
  [...picture().querySelectorAll('rect')].map((r) => r.getAttribute('fill'));

function reducedMotion(on: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: on && query.includes('reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  jest.useFakeTimers();
  reducedMotion(false);
});
afterEach(() => jest.useRealTimers());

describe('Villain', () => {
  it('is a picture named for the villain', () => {
    render(<Villain villain={GOLEM} mode="idle" />);
    expect(picture()).toBeInTheDocument();
  });

  it('moves while it waits', () => {
    render(<Villain villain={GOLEM} mode="idle" />);
    const seen = new Set<string>();
    for (let i = 0; i < 10; i++) {
      seen.add(picture().innerHTML);
      act(() => jest.advanceTimersByTime(300));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('holds still with reduced motion', () => {
    reducedMotion(true);
    render(<Villain villain={GOLEM} mode="idle" />);
    const first = picture().innerHTML;
    act(() => jest.advanceTimersByTime(2000));
    expect(picture().innerHTML).toBe(first);
  });

  it('flashes white when hit, then says it’s done', () => {
    const onDone = jest.fn();
    render(<Villain villain={GOLEM} mode="hit" onDone={onDone} />);
    act(() => jest.advanceTimersByTime(50));
    expect(fills()).toContain('#ffffff');
    act(() => jest.advanceTimersByTime(DURATION_MS.hit));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(fills()).not.toContain('#ffffff');
  });

  it('glares when it attacks, then says it’s done', () => {
    const onDone = jest.fn();
    render(<Villain villain={GOLEM} mode="attack" onDone={onDone} />);
    act(() => jest.advanceTimersByTime(200));
    expect(fills()).toContain(GOLEM.palette.e); // red eyes
    act(() => jest.advanceTimersByTime(DURATION_MS.attack));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('breaks up into its dust when beaten, and is gone at the end', () => {
    const onDone = jest.fn();
    render(<Villain villain={GOLEM} mode="defeat" onDone={onDone} />);
    act(() => jest.advanceTimersByTime(DURATION_MS.defeat / 2));
    expect(fills()).toContain(GOLEM.palette.D);
    act(() => jest.advanceTimersByTime(DURATION_MS.defeat));
    expect(fills()).toHaveLength(0);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('is simply gone at the end of a defeat with reduced motion', () => {
    reducedMotion(true);
    const onDone = jest.fn();
    render(<Villain villain={GOLEM} mode="defeat" onDone={onDone} />);
    act(() => jest.advanceTimersByTime(DURATION_MS.defeat + 100));
    expect(fills()).toHaveLength(0);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

import { act, render } from '@testing-library/react';
import { useFlightClock } from './use-flight-clock';

// every t the clock gives, render by render, so a stale frame can't hide
function Clock({ run, seen }: { run: string | null; seen: number[] }) {
  seen.push(useFlightClock(run, 1000, () => {}));
  return null;
}

describe('useFlightClock', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('runs from 0 to 1 over the flight', () => {
    const seen: number[] = [];
    render(<Clock run="a" seen={seen} />);
    act(() => jest.advanceTimersByTime(500));
    expect(seen.at(-1)).toBeCloseTo(0.5, 1);
    act(() => jest.advanceTimersByTime(600));
    expect(seen.at(-1)).toBe(1);
  });

  it('starts a new flight at 0 from its very first frame, not where the last one ended', () => {
    const seen: number[] = [];
    const { rerender } = render(<Clock run="a" seen={seen} />);
    act(() => jest.advanceTimersByTime(1100));
    rerender(<Clock run={null} seen={seen} />);
    seen.length = 0;
    rerender(<Clock run="b" seen={seen} />);
    expect(seen[0]).toBe(0);
  });

  it('calls onDone once, at the end', () => {
    const done = jest.fn();
    function Once() {
      useFlightClock('a', 1000, done);
      return null;
    }
    render(<Once />);
    act(() => jest.advanceTimersByTime(2000));
    expect(done).toHaveBeenCalledTimes(1);
  });
});

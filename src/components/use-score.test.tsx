import { act, renderHook } from '@testing-library/react';
import { useScore } from './use-score';

const playThunk = jest.fn();
jest.mock('~/utils/sounds', () => ({
  useTreasureSound: () => jest.fn(),
  useThunk: () => playThunk,
}));

beforeEach(() => playThunk.mockClear());

describe('useScore', () => {
  it('counts right answers and the streak', () => {
    const { result } = renderHook(() => useScore((n) => `${n} in a row`));
    act(() => result.current.record(true));
    act(() => result.current.record(true));
    act(() => result.current.record(false));
    expect(result.current.score).toEqual({ right: 2, total: 3, streak: 0 });
  });

  it('thunks for a wrong answer, and not for a right one', () => {
    const { result } = renderHook(() => useScore((n) => `${n} in a row`));
    act(() => result.current.record(true));
    expect(playThunk).not.toHaveBeenCalled();
    act(() => result.current.record(false));
    expect(playThunk).toHaveBeenCalledTimes(1);
  });
});

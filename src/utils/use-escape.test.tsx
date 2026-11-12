import { fireEvent, renderHook } from '@testing-library/react';
import { useEscape } from './use-escape';

const pressEscape = (target: Window | Element = window) =>
  fireEvent.keyDown(target, { key: 'Escape' });

describe('useEscape', () => {
  it('runs on Escape while active', () => {
    const onEscape = jest.fn();
    const { rerender } = renderHook(
      ({ active }) => useEscape(onEscape, active),
      {
        initialProps: { active: true },
      },
    );
    pressEscape();
    expect(onEscape).toHaveBeenCalledTimes(1);

    rerender({ active: false });
    pressEscape();
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('ignores other keys', () => {
    const onEscape = jest.fn();
    renderHook(() => useEscape(onEscape));
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onEscape).not.toHaveBeenCalled();
  });

  it('only lets the first of two handlers use one Escape', () => {
    const first = jest.fn();
    const second = jest.fn();
    renderHook(() => {
      useEscape(first);
      useEscape(second);
    });
    pressEscape();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });
});

import { act, render, screen } from '@testing-library/react';
import FadeSwap, { FADE_OUT_MS } from './fade-swap';

describe('FadeSwap', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows the new step at once, and keeps the old one fading out over it, hidden and out of reach', () => {
    const { rerender } = render(
      <FadeSwap step="a">
        <button type="button">Next leg</button>
      </FadeSwap>,
    );
    rerender(
      <FadeSwap step="b">
        <p>Next stop: Red Mesa</p>
      </FadeSwap>,
    );
    expect(screen.getByText('Next stop: Red Mesa')).toBeVisible();
    // still drawn, fading, but not a button anyone can reach
    expect(screen.queryByRole('button', { name: 'Next leg' })).toBeNull();
    expect(screen.getByText('Next leg').closest('[inert]')).not.toBeNull();
    act(() => jest.advanceTimersByTime(FADE_OUT_MS));
    expect(screen.queryByText('Next leg')).toBeNull();
  });

  it('fades out to nothing, when the step has nothing to show', () => {
    const { rerender } = render(
      <FadeSwap step="pad">
        <p>Volume to tie off at</p>
      </FadeSwap>,
    );
    rerender(<FadeSwap step="none">{null}</FadeSwap>);
    expect(
      screen.getByText('Volume to tie off at').closest('[inert]'),
    ).not.toBeNull();
    act(() => jest.advanceTimersByTime(FADE_OUT_MS));
    expect(screen.queryByText('Volume to tie off at')).toBeNull();
  });

  it('keeps a step’s own state while it stays the same step', () => {
    const { rerender } = render(
      <FadeSwap step="a">
        <input aria-label="Answer" defaultValue="" />
      </FadeSwap>,
    );
    const input = screen.getByRole('textbox', { name: 'Answer' });
    rerender(
      <FadeSwap step="a">
        <input aria-label="Answer" defaultValue="" />
      </FadeSwap>,
    );
    expect(screen.getByRole('textbox', { name: 'Answer' })).toBe(input);
  });
});

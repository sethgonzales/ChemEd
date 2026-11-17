import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TypedStory from './typed-story';

const LINES = ['The Golem waits in the dark.', 'Ready?'];
// the letters typed so far; the rest are there but see-through, holding their place
const typed = () =>
  [...document.querySelectorAll('[data-typed]')]
    .map((e) => e.textContent)
    .join('');

describe('TypedStory', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('gives screen readers the whole story at once', () => {
    render(<TypedStory lines={LINES} />);
    expect(screen.getByText(LINES[0])).toBeInTheDocument();
    expect(screen.getByText(LINES[1])).toBeInTheDocument();
  });

  it('types the story out a letter at a time', () => {
    render(<TypedStory lines={LINES} />);
    expect(typed()).toBe('');
    act(() => jest.advanceTimersByTime(300));
    expect(typed()!.length).toBeGreaterThan(0);
    expect(typed()).not.toBe(LINES.join(''));
    act(() => jest.advanceTimersByTime(10000));
    expect(typed()).toBe(LINES.join(''));
  });

  it('shows the rest at once when tapped', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<TypedStory lines={LINES} />);
    await user.click(
      screen.getByRole('button', { name: 'Show the whole story' }),
    );
    expect(typed()).toBe(LINES.join(''));
  });

  it('shows it all straight away when motion is reduced', () => {
    const before = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      ...before(query),
      matches: query.includes('reduce'),
    })) as typeof window.matchMedia;
    render(<TypedStory lines={LINES} />);
    expect(typed()).toBe(LINES.join(''));
    window.matchMedia = before;
  });
});

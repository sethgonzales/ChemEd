import { act, render, screen } from '@testing-library/react';
import { Said, TypedBriefing } from './typed-text';

const intro = 'Next stop: Red Mesa, up ahead.';
const body = ['The heater’s holding the helium.', 'Help me find the volume.'];

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const later = (ms: number) => act(() => jest.advanceTimersByTime(ms));
// what's drawn so far: the words typed out, from the state that draws them
const drawn = (text: string) =>
  screen.getByText(text).nextElementSibling?.getAttribute('data-typed');

describe('Said', () => {
  it('types the line out, with all of it there for a screen reader from the start', () => {
    render(<Said>{intro}</Said>);
    expect(screen.getByText(intro)).toBeInTheDocument();
    expect(drawn(intro)).toBe('');
    later(300);
    expect(drawn(intro)!.length).toBeGreaterThan(0);
    expect(drawn(intro)!.length).toBeLessThan(intro.length);
    later(5000);
    expect(drawn(intro)).toBe(intro);
  });
});

describe('TypedBriefing', () => {
  it('types the intro, fades it away, then types the lines that matter and keeps them', () => {
    render(<TypedBriefing lines={[intro, ...body]} />);
    expect(screen.getByText(intro)).toBeInTheDocument();
    later(400);
    expect(drawn(intro)!.length).toBeGreaterThan(0);
    expect(drawn(body[0])).toBe('');
    later(10_000);
    expect(screen.queryByText(intro)).not.toBeInTheDocument();
    expect(drawn(body[0])).toBe(body[0]);
    expect(drawn(body[1])).toBe(body[1]);
  });

  it('says it all at once with reduced motion', () => {
    const before = window.matchMedia;
    window.matchMedia = (query: string) =>
      ({
        ...before(query),
        matches: query.includes('reduce'),
      }) as MediaQueryList;
    render(<TypedBriefing lines={[intro, ...body]} />);
    expect(screen.queryByText(intro)).not.toBeInTheDocument();
    expect(drawn(body[1])).toBe(body[1]);
    window.matchMedia = before;
  });
});

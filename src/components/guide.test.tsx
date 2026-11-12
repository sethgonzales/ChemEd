import { act, fireEvent, render, screen } from '@testing-library/react';
import { PAGE_TIPS } from '~/constants/guide-tips';
import { bubbleDuration, WELCOME_DELAY_MS } from '~/utils/guide';
import { GuideProvider, useGuide } from './guide';

function mockScreen({ desktop = true, reducedMotion = false } = {}) {
  window.matchMedia = jest.fn((query: string) => ({
    matches: query.includes('min-width')
      ? desktop
      : query.includes('reduce')
        ? reducedMotion
        : false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })) as unknown as typeof window.matchMedia;
}

const HINT = 'Try changing the coefficient in front of O₂.';

function Page() {
  const { say } = useGuide();
  return <button onClick={() => say(HINT, 'hint')}>Get a hint</button>;
}

const mrG = () => screen.queryByRole('button', { name: /^Mr\. G/ });
const bubble = () => screen.queryByRole('status');
const frame = () =>
  document.querySelector('svg[aria-label="Mr. G"]')?.getAttribute('data-frame');
const walker = () => screen.getByTestId('mr-g-walker');

// no page by default, so he only speaks when a test asks him to
function renderGuide(page?: string) {
  return render(
    <GuideProvider page={page}>
      <Page />
    </GuideProvider>,
  );
}

const LEWIS = PAGE_TIPS['/lewis-structures'];
const REACTIONS = PAGE_TIPS['/chemical-reactions'];
const waitForWelcome = () =>
  act(() => jest.advanceTimersByTime(WELCOME_DELAY_MS + 50));
const closeBubble = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Close message' }));

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  sessionStorage.clear();
  mockScreen();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Mr. G guide', () => {
  it('stays off phones', () => {
    mockScreen({ desktop: false });
    renderGuide();
    expect(mrG()).toBeNull();
  });

  it('stands in the corner on desktop', () => {
    renderGuide();
    expect(mrG()).toBeInTheDocument();
    expect(bubble()).toBeNull();
  });

  it('labels his bubble with his name', () => {
    renderGuide();
    fireEvent.click(screen.getByRole('button', { name: 'Get a hint' }));
    expect(bubble()).toHaveTextContent(/^Mr\. G:/);
  });

  it('introduces himself with a tip when clicked', () => {
    renderGuide('/lewis-structures');
    fireEvent.click(mrG()!);
    expect(bubble()).toHaveTextContent("Hi, I'm Mr. G!");
    expect(bubble()).toHaveTextContent(LEWIS[0]);
  });

  it('welcomes you to a page with its first tip', () => {
    renderGuide('/lewis-structures');
    expect(bubble()).toBeNull();
    waitForWelcome();
    expect(bubble()).toHaveTextContent("Hi, I'm Mr. G!");
    expect(bubble()).toHaveTextContent(LEWIS[0]);
  });

  it('welcomes you to each page once a session, introducing himself only once', () => {
    const { rerender } = renderGuide('/lewis-structures');
    waitForWelcome();
    closeBubble();

    rerender(
      <GuideProvider page="/chemical-reactions">
        <Page />
      </GuideProvider>,
    );
    waitForWelcome();
    expect(bubble()).toHaveTextContent(REACTIONS[0]);
    expect(bubble()).not.toHaveTextContent(/Hi, I'm Mr\. G/);
    closeBubble();

    rerender(
      <GuideProvider page="/lewis-structures">
        <Page />
      </GuideProvider>,
    );
    waitForWelcome();
    expect(bubble()).toBeNull();
  });

  it('cycles through the page tips when clicked', () => {
    renderGuide('/lewis-structures');
    waitForWelcome();
    const seen = LEWIS.slice(1).map(() => {
      fireEvent.click(mrG()!);
      return bubble()?.textContent;
    });
    LEWIS.slice(1).forEach((tip, i) => expect(seen[i]).toContain(tip));
    fireEvent.click(mrG()!);
    expect(bubble()).toHaveTextContent(LEWIS[0]);
  });

  it('skips the welcome while hidden', () => {
    localStorage.setItem('chem.guide.hidden', 'true');
    renderGuide('/lewis-structures');
    waitForWelcome();
    fireEvent.click(screen.getByRole('button', { name: 'Show Mr. G' }));
    expect(bubble()).toBeNull();
  });

  it('skips the welcome on phones', () => {
    mockScreen({ desktop: false });
    renderGuide('/lewis-structures');
    waitForWelcome();
    mockScreen();
    expect(bubble()).toBeNull();
  });

  it('says what a page asks him to', () => {
    renderGuide();
    fireEvent.click(screen.getByRole('button', { name: 'Get a hint' }));
    expect(bubble()).toHaveTextContent(HINT);
  });

  it('closes the bubble by itself after a while', () => {
    renderGuide();
    fireEvent.click(screen.getByRole('button', { name: 'Get a hint' }));
    act(() => jest.advanceTimersByTime(bubbleDuration(HINT) + 100));
    expect(bubble()).toBeNull();
  });

  it('closes the bubble with its close button or Escape', () => {
    renderGuide();
    fireEvent.click(screen.getByRole('button', { name: 'Get a hint' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close message' }));
    expect(bubble()).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Get a hint' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(bubble()).toBeNull();
  });

  it('talks while his bubble is open, and blinks while idle', () => {
    renderGuide();
    const seen = new Set<string | null | undefined>();
    for (let i = 0; i < 40; i++) {
      act(() => jest.advanceTimersByTime(250));
      seen.add(frame());
    }
    expect(seen).toContain('blink');
    expect(seen).not.toContain('talk');

    fireEvent.click(screen.getByRole('button', { name: 'Get a hint' }));
    seen.clear();
    for (let i = 0; i < 8; i++) {
      act(() => jest.advanceTimersByTime(250));
      seen.add(frame());
    }
    expect(seen).toContain('talk');
  });

  it('wanders along the bottom now and then', () => {
    renderGuide();
    const start = walker().style.transform;
    act(() => jest.advanceTimersByTime(45000));
    expect(walker().style.transform).not.toBe(start);
  });

  it('stays put when reduced motion is on', () => {
    mockScreen({ reducedMotion: true });
    renderGuide();
    const start = walker().style.transform;
    act(() => jest.advanceTimersByTime(90000));
    expect(walker().style.transform).toBe(start);
  });

  it('can be hidden and brought back, and remembers', () => {
    const { unmount } = renderGuide();
    fireEvent.click(screen.getByRole('button', { name: 'Hide Mr. G' }));
    expect(mrG()).toBeNull();
    unmount();

    renderGuide();
    expect(mrG()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show Mr. G' }));
    expect(mrG()).toBeInTheDocument();
  });

  it('lets pages ask for help even without a guide', () => {
    render(<Page />);
    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: 'Get a hint' })),
    ).not.toThrow();
  });
});

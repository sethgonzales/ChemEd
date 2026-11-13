import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '~/styles/theme-provider';
import StatesOfMatter from '~/pages/states-of-matter';
import { PHASE_SETTLE_MS } from '~/utils/guide';

// record what the page asks Mr. G to say
const mockSay = jest.fn();
jest.mock('~/components/guide', () => ({
  useGuide: () => ({ say: mockSay }),
}));

const ctx = {
  setTransform: jest.fn(),
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  fillText: jest.fn(),
  font: '',
  fillStyle: '',
};

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(
    () => ctx,
  ) as unknown as HTMLCanvasElement['getContext'];

  // report a 400×400 container as soon as it's observed
  global.ResizeObserver = class {
    constructor(private cb: ResizeObserverCallback) {}
    observe() {
      this.cb(
        [{ contentRect: { width: 400, height: 400 } } as ResizeObserverEntry],
        this as unknown as ResizeObserver,
      );
    }
    unobserve() {}
    disconnect() {}
  };
});

beforeEach(() => jest.clearAllMocks());

function renderPage() {
  render(
    <ThemeProvider>
      <StatesOfMatter />
    </ThemeProvider>,
  );
}

const stage = () => screen.getByRole('region', { name: 'Particle model' });
const phase = () => within(stage()).getByTestId('phase');
const setTemperature = (value: number) =>
  fireEvent.change(screen.getByRole('slider', { name: 'Temperature' }), {
    target: { value: String(value) },
  });

describe('States of Matter page', () => {
  it('says what to do in one line', () => {
    renderPage();
    expect(
      screen.getByText(
        'Heat or cool the substance and watch how its particles move.',
      ),
    ).toBeInTheDocument();
  });

  it('starts at 0°C with a −25 to 125°C slider inside the stage', () => {
    renderPage();
    const slider = within(stage()).getByRole('slider', { name: 'Temperature' });
    expect(slider).toHaveValue('0');
    expect(slider).toHaveAttribute('min', '-25');
    expect(slider).toHaveAttribute('max', '125');
  });

  it('shows the temperature in °C and kelvin', () => {
    renderPage();
    expect(within(stage()).getByTestId('temperature')).toHaveTextContent(
      '0 °C',
    );
    expect(within(stage()).getByTestId('temperature')).toHaveTextContent(
      '273 K',
    );
    setTemperature(50);
    expect(within(stage()).getByTestId('temperature')).toHaveTextContent(
      '50 °C',
    );
    expect(within(stage()).getByTestId('temperature')).toHaveTextContent(
      '323 K',
    );
  });

  it('draws 150 particles each frame', async () => {
    renderPage();
    await waitFor(() =>
      expect(ctx.arc.mock.calls.length).toBeGreaterThanOrEqual(150),
    );
  });

  it.each([
    [-20, 'Solid', null],
    [-3, 'Solid', 'Near the melting point'],
    [0, 'Liquid', 'Near the melting point'],
    [50, 'Liquid', null],
    [98, 'Liquid', 'Near the boiling point'],
    [110, 'Gas', null],
  ])('labels %i°C as %s', (temp, name, hint) => {
    renderPage();
    setTemperature(temp);
    expect(phase()).toHaveTextContent(name);
    if (hint) expect(phase()).toHaveTextContent(hint);
    else expect(phase()).not.toHaveTextContent('Near');
  });

  it('leaves the phase off the canvas, where screen readers can’t read it', async () => {
    renderPage();
    await waitFor(() => expect(ctx.arc).toHaveBeenCalled());
    expect(ctx.fillText).not.toHaveBeenCalled();
  });
});

describe('States of Matter page: Mr. G', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const wait = (ms: number) => act(() => jest.advanceTimersByTime(ms));

  it('explains a phase change once the slider settles', () => {
    renderPage();
    setTemperature(110);
    wait(PHASE_SETTLE_MS + 50);
    expect(mockSay).toHaveBeenCalledWith(
      expect.stringMatching(/boiling/),
      'tip',
      { unprompted: true }, // nobody asked, so it's rationed
    );
  });

  it('says nothing when the slider passes through and comes back', () => {
    renderPage();
    setTemperature(110);
    setTemperature(50);
    wait(PHASE_SETTLE_MS * 2);
    expect(mockSay).not.toHaveBeenCalled();
  });

  it('stays quiet while the phase stays the same', () => {
    renderPage();
    setTemperature(60);
    wait(PHASE_SETTLE_MS * 2);
    expect(mockSay).not.toHaveBeenCalled();
  });
});

describe('States of Matter page: accessibility', () => {
  it('describes the particles in words for screen readers', () => {
    renderPage();
    expect(
      screen.getByRole('img', { name: /liquid.*sliding past each other/i }),
    ).toBeInTheDocument();
    setTemperature(110);
    expect(
      screen.getByRole('img', { name: /gas.*spread out/i }),
    ).toBeInTheDocument();
  });

  describe('with reduced motion', () => {
    const realMatchMedia = window.matchMedia;
    beforeEach(() => {
      jest.useFakeTimers();
      window.matchMedia = ((query: string) => ({
        ...realMatchMedia(query),
        matches: query.includes('reduce'),
      })) as typeof window.matchMedia;
    });
    afterEach(() => {
      jest.useRealTimers();
      window.matchMedia = realMatchMedia;
    });

    const frames = () => ctx.clearRect.mock.calls.length;
    const wait = (ms: number) => act(() => jest.advanceTimersByTime(ms));

    it('holds the picture still until the temperature changes', () => {
      renderPage();
      wait(500);
      const drawn = frames();
      expect(drawn).toBeGreaterThan(0); // the first picture is drawn
      wait(1000);
      expect(frames()).toBe(drawn);

      setTemperature(110);
      wait(100);
      expect(frames()).toBeGreaterThan(drawn);
    });

    it('says why the particles are still', () => {
      renderPage();
      expect(screen.getByText(/reduced motion/i)).toBeInTheDocument();
    });
  });
});

describe('States of Matter page: substances', () => {
  const slider = () => screen.getByRole('slider', { name: 'Temperature' });
  const readout = () => within(stage()).getByTestId('temperature');
  const pick = async (name: string) => {
    await userEvent.click(screen.getByRole('button', { name: /^Substance:/ }));
    await userEvent.click(
      screen.getByRole('button', { name: new RegExp(name) }),
    );
  };

  it('starts with water', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: 'Substance: Water (H₂O)' }),
    ).toBeInTheDocument();
  });

  it('melts and boils ethanol at its own temperatures', async () => {
    renderPage();
    await pick('Ethanol');
    expect(slider()).toHaveAttribute('min', '-162');
    expect(slider()).toHaveAttribute('max', '127');
    setTemperature(90);
    expect(phase()).toHaveTextContent('Gas'); // water would still be liquid
    setTemperature(-120);
    expect(phase()).toHaveTextContent('Solid');
  });

  it('keeps the thermometer reading when the substance changes', async () => {
    renderPage();
    setTemperature(20);
    await pick('Mercury');
    expect(readout()).toHaveTextContent('20 °C');
    expect(phase()).toHaveTextContent('Liquid');
  });

  it('pulls the reading into the new range if it falls outside', async () => {
    renderPage();
    await pick('Mercury');
    setTemperature(400);
    await pick('Water');
    expect(readout()).toHaveTextContent('125 °C');
    expect(slider()).toHaveValue('125');
  });
});

describe('States of Matter page: heating curve', () => {
  const curve = () => screen.queryByRole('img', { name: /heating curve/i });

  it('shows the heating curve, with the plateaus and where the substance is now', () => {
    renderPage();
    expect(curve()).toHaveAccessibleName(
      /water.*holds at 0 °C while it melts.*holds at 100 °C while it boils.*0 °C/i,
    );
    setTemperature(50);
    expect(curve()).toHaveAccessibleName(/50 °C/);
  });

  it('follows the chosen substance', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /^Substance:/ }));
    await userEvent.click(screen.getByRole('button', { name: /Mercury/ }));
    expect(curve()).toHaveAccessibleName(/mercury.*356.73 °C while it boils/i);
  });

  it('can be hidden', async () => {
    renderPage();
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Show heating curve' }),
    );
    expect(curve()).not.toBeInTheDocument();
  });
});

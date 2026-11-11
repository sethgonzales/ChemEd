import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { ThemeProvider } from '~/styles/theme-provider';
import StatesOfMatter from '~/pages/states-of-matter';

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

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

describe('States of Matter page', () => {
  it('starts at 0°C with a −25 to 125°C slider', () => {
    renderPage();
    const slider = screen.getByLabelText('Temperature: 0°C');
    expect(slider).toHaveAttribute('min', '-25');
    expect(slider).toHaveAttribute('max', '125');
  });

  it('updates the temperature label when the slider moves', () => {
    renderPage();
    fireEvent.change(screen.getByRole('slider'), { target: { value: '50' } });
    expect(screen.getByLabelText('Temperature: 50°C')).toBeInTheDocument();
  });

  it('draws 150 particles each frame', async () => {
    renderPage();
    await waitFor(() =>
      expect(ctx.arc.mock.calls.length).toBeGreaterThanOrEqual(150),
    );
  });

  it.each([
    [-10, 'Solid'],
    [0, 'Liquid'],
    [50, 'Liquid'],
    [100, 'Gas'],
  ])('labels %i°C as %s', async (temp, phase) => {
    renderPage();
    fireEvent.change(screen.getByRole('slider'), {
      target: { value: String(temp) },
    });
    ctx.fillText.mockClear();
    await waitFor(() =>
      expect(ctx.fillText).toHaveBeenCalledWith(
        phase,
        expect.any(Number),
        expect.any(Number),
      ),
    );
  });
});

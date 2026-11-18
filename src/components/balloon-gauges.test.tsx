import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Gauge from './balloon-gauges';

const barometer = {
  name: 'Barometer',
  reading: '101.3 kPa',
  measures: 'The air pressure outside the balloon.',
  picture: <svg />,
};

const renderGauge = () => render(<Gauge device={barometer} />);
const gauge = () => screen.getByRole('button', { name: /^Barometer/ });

describe('Gauge', () => {
  it('always shows its live reading', () => {
    renderGauge();
    expect(gauge()).toHaveAccessibleName('Barometer: 101.3 kPa');
    expect(screen.getByText('101.3 kPa')).toBeVisible();
    expect(gauge()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/air pressure outside/)).not.toBeInTheDocument();
  });

  it('expands on hover to say what it measures, and shrinks back after', async () => {
    renderGauge();
    await userEvent.hover(gauge());
    expect(gauge()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/air pressure outside/)).toBeVisible();
    await userEvent.unhover(gauge());
    expect(screen.queryByText(/air pressure outside/)).not.toBeInTheDocument();
  });

  it('expands when reached by keyboard, and Escape shrinks it', async () => {
    renderGauge();
    await userEvent.tab();
    expect(gauge()).toHaveFocus();
    expect(screen.getByText(/air pressure outside/)).toBeVisible();
    await userEvent.keyboard('{Escape}');
    expect(gauge()).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands on a tap, for touch screens', async () => {
    renderGauge();
    await userEvent.click(gauge());
    expect(screen.getByText(/air pressure outside/)).toBeVisible();
  });
});

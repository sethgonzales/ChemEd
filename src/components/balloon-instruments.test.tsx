import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BalloonInstruments from './balloon-instruments';

const balloon = { fullVolume: 1000, burstOverpressure: 15000, payload: 600 };
// on the ground at sea level, helium at the air's 15 °C
const flight = { moles: 20000, gasTemperature: 288.15, height: 0, speed: 0 };

const renderPanel = () =>
  render(<BalloonInstruments balloon={balloon} flight={flight} />);

describe('BalloonInstruments', () => {
  it('shows every reading, in the units the instrument reads in', () => {
    renderPanel();
    const reading = (name: string) =>
      screen.getByRole('button', { name: new RegExp(name) });
    expect(reading('Altimeter')).toHaveTextContent('0 m');
    expect(reading('Outside thermometer')).toHaveTextContent('15.0 °C');
    expect(reading('Barometer')).toHaveTextContent('101.3 kPa');
    expect(reading('Helium thermometer')).toHaveTextContent('15.0 °C');
    expect(reading('Balloon gauge')).toHaveTextContent('101.3 kPa');
    expect(reading('Volume')).toHaveTextContent('473 m³');
    expect(reading('Tank meter')).toHaveTextContent('20,000 mol');
  });

  it('opens a close-up saying what an instrument measures', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: /Barometer/ }));
    const closeUp = screen.getByRole('dialog', { name: 'Barometer' });
    expect(within(closeUp).getByText('101.3 kPa')).toBeInTheDocument();
    expect(
      within(closeUp).getByText(/air pressure outside/i),
    ).toBeInTheDocument();
  });

  it('closes the close-up on Escape, back to its instrument', async () => {
    renderPanel();
    const barometer = screen.getByRole('button', { name: /Barometer/ });
    await userEvent.click(barometer);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(barometer).toHaveFocus();
  });

  it('closes with its Close button', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: /Volume/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Platform } from '~/constants/balloon-world';
import { airAt } from '~/utils/atmosphere';
import BalloonInstruments from './balloon-instruments';

const balloon = { fullVolume: 1000, burstOverpressure: 15000, payload: 600 };
// on the ground at sea level, helium at the air's 15 °C
const flight = { moles: 20000, gasTemperature: 288.15, height: 0, speed: 0 };
const mesa: Platform = {
  name: 'Red Mesa',
  kind: 'mesa',
  distance: 5000,
  height: 800,
};

const renderPanel = () =>
  render(
    <BalloonInstruments balloon={balloon} flight={flight} station={mesa} />,
  );

describe('BalloonInstruments', () => {
  it('has the basket’s instruments, each reading in its own unit', () => {
    renderPanel();
    const basket = screen.getByRole('group', { name: 'In the basket' });
    const device = (name: string) =>
      within(basket).getByRole('button', { name: new RegExp(`^${name}`) });
    expect(device('Altimeter')).toHaveAccessibleName('Altimeter: 0 m');
    expect(device('Outside thermometer')).toHaveAccessibleName(
      'Outside thermometer: 15.0 °C',
    );
    expect(device('Barometer')).toHaveAccessibleName('Barometer: 101.3 kPa');
    expect(device('Helium thermometer')).toHaveAccessibleName(
      'Helium thermometer: 15.0 °C',
    );
    expect(device('Balloon gauge')).toHaveAccessibleName(
      'Balloon gauge: 101.3 kPa',
    );
    expect(device('Volume meter')).toHaveAccessibleName('Volume meter: 473 m³');
    expect(device('Helium counter')).toHaveAccessibleName(
      'Helium counter: 20,000 mol',
    );
  });

  it('reads the next stop’s weather station by radio', () => {
    renderPanel();
    const station = screen.getByRole('group', {
      name: 'Red Mesa weather station',
    });
    const air = airAt(800);
    const kPa = (air.pressure / 1000).toFixed(1);
    const celsius = (air.temperature - 273.15).toFixed(1);
    expect(
      within(station).getByRole('button', { name: `Barometer: ${kPa} kPa` }),
    ).toBeInTheDocument();
    expect(
      within(station).getByRole('button', {
        name: `Thermometer: ${celsius} °C`,
      }),
    ).toBeInTheDocument();
  });

  it('opens a close-up saying what an instrument measures', async () => {
    renderPanel();
    const basket = screen.getByRole('group', { name: 'In the basket' });
    await userEvent.click(
      within(basket).getByRole('button', { name: /^Barometer/ }),
    );
    const closeUp = screen.getByRole('dialog', { name: 'Barometer' });
    expect(within(closeUp).getByText('101.3 kPa')).toBeInTheDocument();
    expect(
      within(closeUp).getByText(/air pressure outside/i),
    ).toBeInTheDocument();
  });

  it('closes the close-up on Escape, back to its instrument', async () => {
    renderPanel();
    const altimeter = screen.getByRole('button', { name: /^Altimeter/ });
    await userEvent.click(altimeter);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(altimeter).toHaveFocus();
  });

  it('closes with its Close button', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: /^Volume/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ElectronConfigurations from '~/pages/electron-configurations';

const button = (name: string) => screen.getByRole('button', { name });
const readouts = () =>
  screen.getByRole('region', { name: 'Electron configuration' });

describe('Electron Configurations page', () => {
  it('says what to do in one line', () => {
    render(<ElectronConfigurations />);
    expect(
      screen.getByRole('heading', { name: 'Electron Configurations' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/See how electrons fill an atom’s orbitals/),
    ).toBeInTheDocument();
  });

  it('starts with hydrogen', () => {
    render(<ElectronConfigurations />);
    expect(readouts()).toHaveTextContent('Hydrogen');
    expect(readouts()).toHaveTextContent('1s¹');
  });

  it('shows the configuration of the element picked on the table', async () => {
    render(<ElectronConfigurations />);
    await userEvent.click(button('Oxygen'));
    expect(button('Oxygen')).toHaveAttribute('aria-pressed', 'true');
    expect(readouts()).toHaveTextContent('1s² 2s² 2p⁴');
    expect(readouts()).toHaveTextContent('[He] 2s² 2p⁴');
    expect(readouts()).toHaveTextContent('p-block');
    expect(screen.getByText('2p: 4 electrons')).toBeInTheDocument();
  });

  it('steps through the elements with Previous and Next', async () => {
    render(<ElectronConfigurations />);
    expect(button('Previous element')).toBeDisabled();
    await userEvent.click(button('Next element'));
    expect(readouts()).toHaveTextContent('Helium');
    await userEvent.click(button('Previous element'));
    expect(readouts()).toHaveTextContent('Hydrogen');

    await userEvent.click(button('Oganesson'));
    expect(button('Next element')).toBeDisabled();
  });

  it('drops in the new electron on Next, but not when picking from the table', async () => {
    render(<ElectronConfigurations />);
    const fresh = () =>
      screen
        .getByRole('list', { name: 'Orbital diagram' })
        .querySelectorAll('[data-new]');
    await userEvent.click(button('Next element'));
    expect(fresh()).toHaveLength(1);
    await userEvent.click(button('Iron'));
    expect(fresh()).toHaveLength(0);
  });

  it('switches between the orbital diagram and the Bohr shells', async () => {
    render(<ElectronConfigurations />);
    await userEvent.click(button('Sodium'));
    await userEvent.click(screen.getByRole('tab', { name: 'Shells' }));
    expect(
      screen.getByRole('img', { name: /^Bohr model of Na: 2 electrons/ }),
    ).toBeVisible();
    expect(
      screen.getByRole('list', { name: 'Orbital diagram', hidden: true }),
    ).not.toBeVisible();

    await userEvent.click(screen.getByRole('tab', { name: 'Orbitals' }));
    expect(screen.getByRole('list', { name: 'Orbital diagram' })).toBeVisible();
  });

  it('counts valence electrons for main-group elements', async () => {
    render(<ElectronConfigurations />);
    await userEvent.click(button('Sodium'));
    expect(readouts()).toHaveTextContent('Valence electrons1');
  });

  it('counts the outer shell for transition metals', async () => {
    render(<ElectronConfigurations />);
    await userEvent.click(button('Iron'));
    expect(readouts()).toHaveTextContent('Outer shell (n = 4)2 electrons');
  });

  it('says "electron" for a single outer electron', async () => {
    render(<ElectronConfigurations />);
    await userEvent.click(button('Chromium'));
    expect(readouts()).toHaveTextContent('Outer shell (n = 4)1 electron');
    expect(readouts()).not.toHaveTextContent('1 electrons');
  });

  it('explains an exception to the Aufbau order', async () => {
    render(<ElectronConfigurations />);
    await userEvent.click(button('Chromium'));
    expect(screen.getByText(/Chromium is an exception/)).toHaveTextContent(
      '[Ar] 4s² 3d⁴',
    );
    await userEvent.click(button('Iron'));
    expect(screen.queryByText(/is an exception/)).toBeNull();
  });
});

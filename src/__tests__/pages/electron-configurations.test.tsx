import { render, screen, within } from '@testing-library/react';
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
      within(readouts()).getByRole('list', {
        name: 'Orbital diagram',
        hidden: true,
      }),
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

describe('Electron Configurations page: Build', () => {
  const box = (name: string) => screen.getByRole('button', { name });
  const notation = () => screen.getByRole('textbox', { name: 'Notation' });

  async function startBuild(element = 'Carbon') {
    render(<ElectronConfigurations />);
    await userEvent.click(screen.getByRole('tab', { name: 'Build' }));
    await userEvent.click(button(`Choose an element (now Hydrogen)`));
    await userEvent.click(button(element));
  }

  async function place(
    tool: 'Up arrow' | 'Down arrow' | 'Erase',
    boxName: string,
  ) {
    await userEvent.click(button(tool));
    await userEvent.click(box(boxName));
  }

  // carbon's 1s and 2s, paired
  async function fillCore() {
    await place('Up arrow', '1s box 1: empty');
    await place('Down arrow', '1s box 1: up');
    await place('Up arrow', '2s box 1: empty');
    await place('Down arrow', '2s box 1: up');
  }

  it('builds carbon with the arrow tools and the notation', async () => {
    await startBuild();
    expect(screen.getByText('Draw Carbon: 6 electrons')).toBeInTheDocument();
    await fillCore();
    await place('Up arrow', '2p box 1: empty');
    await userEvent.click(box('2p box 2: empty'));
    await userEvent.type(notation(), '1s2 2s2 2p2');
    expect(screen.getByText('1s² 2s² 2p²')).toBeInTheDocument();

    await userEvent.click(button('Check'));
    expect(screen.getByRole('status')).toHaveTextContent(/^Correct!/);
  });

  it('explains a mistake and marks its row', async () => {
    await startBuild();
    await fillCore();
    await place('Up arrow', '2p box 1: empty');
    await place('Down arrow', '2p box 1: up');
    await userEvent.type(notation(), '1s2 2s2 2p2');
    await userEvent.click(button('Check'));

    expect(screen.getByRole('status')).toHaveTextContent(
      'In 2p, put one electron in each box before pairing.',
    );
    const row = screen
      .getAllByRole('listitem')
      .find(
        (li) => li.dataset.subshell === '2p' && li.closest('[hidden]') === null,
      )!;
    expect(row).toHaveAttribute('data-problem');
  });

  it('erases an arrow', async () => {
    await startBuild();
    await place('Up arrow', '1s box 1: empty');
    await place('Erase', '1s box 1: up');
    expect(box('1s box 1: empty')).toBeInTheDocument();
  });

  it('shows the answer, and clears it', async () => {
    await startBuild();
    await userEvent.click(button('Show answer'));
    expect(box('2p box 2: up')).toBeInTheDocument();
    expect(notation()).toHaveValue('1s2 2s2 2p2');

    await userEvent.click(button('Clear'));
    expect(box('2p box 2: empty')).toBeInTheDocument();
    expect(notation()).toHaveValue('');
  });

  it('gives each level its own elements and enough boxes', async () => {
    await startBuild();
    await userEvent.click(button('Choose a level (now Level 1: H to Ne)'));
    await userEvent.click(button('Level 2: Na to Ar'));
    expect(screen.getByText('Draw Sodium: 11 electrons')).toBeInTheDocument();
    expect(box('3p box 3: empty')).toBeInTheDocument();
  });
});

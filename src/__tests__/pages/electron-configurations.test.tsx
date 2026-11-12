import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ElectronConfigurations from '~/pages/electron-configurations';
import { CONFIGURATION_NUDGE, NUDGE_AFTER_MS } from '~/utils/guide';

const mockSay = jest.fn();
let mockGuideVisible = false;
jest.mock('~/components/guide', () => ({
  useGuide: () => ({ say: mockSay, visible: mockGuideVisible }),
}));

beforeEach(() => {
  mockSay.mockClear();
  mockGuideVisible = false;
});
afterEach(() => jest.useRealTimers());

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
  const tap = (name: string) => userEvent.click(box(name));
  const notation = () => screen.getByRole('textbox', { name: 'Notation' });
  const status = () => screen.getByRole('status');

  async function startBuild() {
    render(<ElectronConfigurations />);
    await userEvent.click(screen.getByRole('tab', { name: 'Build' }));
  }

  // carbon, drawn by Hund's rule: two taps pair a box
  async function drawCarbon() {
    for (const b of ['1s box 1: empty', '1s box 1: up']) await tap(b);
    for (const b of ['2s box 1: empty', '2s box 1: up']) await tap(b);
    await tap('2p box 1: empty');
    await tap('2p box 2: empty');
    await userEvent.type(notation(), '1s2 2s2 2p2');
  }

  it('picks the element on the periodic table, then builds it', async () => {
    await startBuild();
    await userEvent.click(button('Carbon'));
    expect(screen.getByText('Draw Carbon: 6 electrons')).toBeInTheDocument();
    await drawCarbon();
    expect(screen.getByText('1s² 2s² 2p²')).toBeInTheDocument();

    await userEvent.click(button('Check'));
    expect(status()).toHaveTextContent(/^Correct!/);
  });

  it('lets students draw first, then pick the element before checking', async () => {
    await startBuild();
    await drawCarbon();
    await userEvent.click(button('Check'));
    expect(status()).toHaveTextContent(
      'Pick the element you drew on the periodic table first.',
    );

    // picking keeps the drawing
    await userEvent.click(button('Carbon'));
    expect(box('2p box 2: up')).toBeInTheDocument();
    await userEvent.click(button('Check'));
    expect(status()).toHaveTextContent(/^Correct!/);
  });

  it('unpicks the element when it is clicked again, keeping the drawing', async () => {
    await startBuild();
    await userEvent.click(button('Carbon'));
    await tap('1s box 1: empty');
    await userEvent.click(button('Carbon'));
    expect(button('Carbon')).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByText('Pick an element, or start drawing'),
    ).toBeInTheDocument();
    expect(box('1s box 1: up')).toBeInTheDocument();
    expect(button('Show answer')).toBeDisabled();
  });
  it('cycles a box: up, then up and down, then empty', async () => {
    await startBuild();
    await tap('1s box 1: empty');
    await tap('1s box 1: up');
    await tap('1s box 1: up and down');
    expect(box('1s box 1: empty')).toBeInTheDocument();
  });

  it('shows rows up to 5s, adding more above as the drawing grows', async () => {
    await startBuild();
    expect(box('5s box 1: empty')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^4d box/ })).toBeNull();
    await tap('5s box 1: empty');
    expect(box('4d box 1: empty')).toBeInTheDocument();
    expect(box('5p box 1: empty')).toBeInTheDocument();
  });

  it('explains a mistake and marks its row', async () => {
    await startBuild();
    await userEvent.click(button('Carbon'));
    for (const b of ['1s box 1: empty', '1s box 1: up']) await tap(b);
    for (const b of ['2s box 1: empty', '2s box 1: up']) await tap(b);
    await tap('2p box 1: empty');
    await tap('2p box 1: up');
    await userEvent.type(notation(), '1s2 2s2 2p2');
    await userEvent.click(button('Check'));

    expect(status()).toHaveTextContent(
      'In 2p, put one electron in each box before pairing.',
    );
    const row = screen
      .getAllByRole('listitem')
      .find(
        (li) => li.dataset.subshell === '2p' && li.closest('[hidden]') === null,
      )!;
    expect(row).toHaveAttribute('data-problem');
  });

  it('keeps the feedback short while Mr. G is on screen to explain', async () => {
    mockGuideVisible = true;
    await startBuild();
    await userEvent.click(button('Carbon'));
    for (const b of ['1s box 1: empty', '1s box 1: up']) await tap(b);
    for (const b of ['2s box 1: empty', '2s box 1: up']) await tap(b);
    await tap('2p box 1: empty');
    await tap('2p box 1: up');
    await userEvent.click(button('Check'));

    // the row problem goes to Mr. G; the box keeps the rest and points at the red row
    expect(status()).not.toHaveTextContent('In 2p, put one electron');
    expect(status()).toHaveTextContent('Type the notation too');
    expect(status()).toHaveTextContent('Look again at the red row.');
  });

  it('shows the answer once an element is picked, and clears it', async () => {
    await startBuild();
    expect(button('Show answer')).toBeDisabled();
    await userEvent.click(button('Carbon'));
    await userEvent.click(button('Show answer'));
    expect(box('2p box 2: up')).toBeInTheDocument();
    expect(notation()).toHaveValue('1s2 2s2 2p2');

    await userEvent.click(button('Clear'));
    expect(box('2p box 2: empty')).toBeInTheDocument();
    expect(notation()).toHaveValue('');
  });

  it('has Mr. G cheer a correct answer and hint at a wrong one', async () => {
    await startBuild();
    await userEvent.click(button('Carbon'));
    await drawCarbon();
    await userEvent.click(button('Check'));
    expect(mockSay).toHaveBeenLastCalledWith(
      'That’s Carbon, electron for electron. Great work!',
      'cheer',
    );

    await tap('2p box 2: up'); // pairs it: one electron too many
    await userEvent.click(button('Check'));
    expect(mockSay).toHaveBeenLastCalledWith(
      'Not quite yet. Carbon has 6 electrons; you’ve placed 7.',
      'hint',
    );
  });

  it('has Mr. G nudge once after a minute of drawing without checking', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<ElectronConfigurations />);
    await user.click(screen.getByRole('tab', { name: 'Build' }));
    await user.click(box('1s box 1: empty'));
    act(() => jest.advanceTimersByTime(NUDGE_AFTER_MS + 100));
    expect(mockSay).toHaveBeenCalledWith(CONFIGURATION_NUDGE, 'nudge', {
      unprompted: true,
    });
    jest.useRealTimers();
  });
  it('accepts an exception drawn the real way', async () => {
    await startBuild();
    await userEvent.click(button('Chromium'));
    await userEvent.click(button('Show answer'));
    await userEvent.click(button('Check'));
    expect(status()).toHaveTextContent(/^Correct!/);
  });
});

describe('Electron Configurations page: Build with ions', () => {
  const status = () => screen.getByRole('status');
  const notation = () => screen.getByRole('textbox', { name: 'Notation' });

  async function pickIron() {
    render(<ElectronConfigurations />);
    await userEvent.click(screen.getByRole('tab', { name: 'Build' }));
    await userEvent.click(button('Iron'));
  }

  it('waits for an element before the charge can change', async () => {
    render(<ElectronConfigurations />);
    await userEvent.click(screen.getByRole('tab', { name: 'Build' }));
    expect(button('Raise the charge')).toBeDisabled();
    expect(button('Lower the charge')).toBeDisabled();
  });

  it('builds Fe²⁺, which loses its 4s electrons before 3d', async () => {
    await pickIron();
    await userEvent.click(button('Raise the charge'));
    await userEvent.click(button('Raise the charge'));
    expect(screen.getByText('Draw Fe²⁺: 24 electrons')).toBeInTheDocument();

    await userEvent.click(button('Show answer'));
    expect(notation()).toHaveValue('1s2 2s2 2p6 3s2 3p6 3d6');
    await userEvent.click(button('Check'));
    expect(status()).toHaveTextContent('Correct! That’s Fe²⁺’s configuration.');
  });

  it('marks a neutral iron drawing wrong for Fe²⁺', async () => {
    await pickIron();
    await userEvent.click(button('Show answer'));
    await userEvent.click(button('Raise the charge'));
    await userEvent.click(button('Raise the charge'));
    await userEvent.click(button('Check'));
    expect(status()).toHaveTextContent(
      'Fe²⁺ has 24 electrons; you’ve placed 26.',
    );
  });

  it('makes anions like nitride, and stops at ±3', async () => {
    render(<ElectronConfigurations />);
    await userEvent.click(screen.getByRole('tab', { name: 'Build' }));
    await userEvent.click(button('Nitrogen'));
    for (let i = 0; i < 3; i++)
      await userEvent.click(button('Lower the charge'));
    expect(screen.getByText('Draw N³⁻: 10 electrons')).toBeInTheDocument();
    expect(button('Lower the charge')).toBeDisabled();
    for (let i = 0; i < 6; i++)
      await userEvent.click(button('Raise the charge'));
    expect(screen.getByText('Draw N³⁺: 4 electrons')).toBeInTheDocument();
    expect(button('Raise the charge')).toBeDisabled();
  });

  it('goes back to a neutral atom when another element is picked', async () => {
    await pickIron();
    await userEvent.click(button('Raise the charge'));
    await userEvent.click(button('Sodium'));
    expect(screen.getByText('Draw Sodium: 11 electrons')).toBeInTheDocument();
  });

  it('never removes more electrons than hydrogen has', async () => {
    render(<ElectronConfigurations />);
    await userEvent.click(screen.getByRole('tab', { name: 'Build' }));
    await userEvent.click(button('Hydrogen'));
    expect(button('Raise the charge')).toBeDisabled();
  });
});

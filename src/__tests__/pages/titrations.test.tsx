import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Titrations from '~/pages/titrations';

const button = (name: string | RegExp) => screen.getByRole('button', { name });
const ph = () => screen.getByTestId('ph');
const volume = () => screen.getByTestId('volume');
const pick = async (menu: RegExp, option: RegExp) => {
  await userEvent.click(button(menu));
  await userEvent.click(button(option));
};

describe('Titrations page: Lab', () => {
  it('says what to do in one line', () => {
    render(<Titrations />);
    expect(
      screen.getByRole('heading', { name: 'Titrations' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Add titrant from the burette/),
    ).toBeInTheDocument();
  });

  it('starts with HCl, phenolphthalein and 0.100 M NaOH in the burette', () => {
    render(<Titrations />);
    expect(button('Analyte: Hydrochloric acid (HCl)')).toBeInTheDocument();
    expect(button('Indicator: Phenolphthalein')).toBeInTheDocument();
    expect(screen.getByText('Titrant: 0.100 M NaOH')).toBeInTheDocument();
    expect(ph()).toHaveTextContent('pH 1.00');
    expect(volume()).toHaveTextContent('0.00 mL');
  });

  it('adds a drop or a millilitre at a time', async () => {
    render(<Titrations />);
    await userEvent.click(button('Add drop'));
    expect(volume()).toHaveTextContent('0.05 mL');
    await userEvent.click(button('Add 1 mL'));
    expect(volume()).toHaveTextContent('1.05 mL');
  });

  it('turns phenolphthalein pink past the equivalence point', async () => {
    render(<Titrations />);
    const flask = () => screen.getByRole('img', { name: /flask/i });
    expect(flask()).toHaveAccessibleName(/colourless/);
    for (let i = 0; i < 26; i++) await userEvent.click(button('Add 1 mL'));
    expect(flask()).toHaveAccessibleName(/pink/);
    expect(Number(ph().textContent!.match(/[\d.]+/)![0])).toBeGreaterThan(11);
  });

  it('starts over on Reset', async () => {
    render(<Titrations />);
    await userEvent.click(button('Add 1 mL'));
    await userEvent.click(button('Reset'));
    expect(volume()).toHaveTextContent('0.00 mL');
    expect(ph()).toHaveTextContent('pH 1.00');
  });

  it('titrates a base with HCl, starting afresh', async () => {
    render(<Titrations />);
    await userEvent.click(button('Add 1 mL'));
    await pick(/^Analyte:/, /Ammonia/);
    expect(screen.getByText('Titrant: 0.100 M HCl')).toBeInTheDocument();
    expect(volume()).toHaveTextContent('0.00 mL');
    expect(ph()).toHaveTextContent('pH 11.12');
  });

  it('changes the indicator without emptying the flask', async () => {
    render(<Titrations />);
    await userEvent.click(button('Add 1 mL'));
    await pick(/^Indicator:/, /Methyl orange/);
    expect(volume()).toHaveTextContent('1.00 mL');
    expect(screen.getByRole('img', { name: /flask/i })).toHaveAccessibleName(
      /red/,
    );
  });

  it('stops when the burette is empty', async () => {
    render(<Titrations />);
    for (let i = 0; i < 51; i++) fireEvent.click(button('Add 1 mL'));
    expect(volume()).toHaveTextContent('50.00 mL');
    expect(button('Add drop')).toBeDisabled();
    expect(button('Pour')).toBeDisabled();
    expect(screen.getByText(/burette is empty/i)).toBeInTheDocument();
  });
});

describe('Titrations page: pouring', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  const wait = (ms: number) => act(() => jest.advanceTimersByTime(ms));

  it('pours while Pour is held down', () => {
    render(<Titrations />);
    fireEvent.pointerDown(button('Pour'));
    wait(1000);
    fireEvent.pointerUp(button('Pour'));
    expect(volume()).toHaveTextContent('1.50 mL'); // 1.5 mL/s
    wait(1000);
    expect(volume()).toHaveTextContent('1.50 mL');
  });

  it('stops pouring if the finger slides off', () => {
    render(<Titrations />);
    fireEvent.pointerDown(button('Pour'));
    wait(500);
    fireEvent.pointerLeave(button('Pour'));
    wait(1000);
    expect(volume()).toHaveTextContent('0.75 mL');
  });

  it('pours while Space is held on Pour', () => {
    render(<Titrations />);
    const pour = button('Pour');
    pour.focus();
    fireEvent.keyDown(pour, { key: ' ' });
    fireEvent.keyDown(pour, { key: ' ', repeat: true }); // auto-repeat: no restart
    wait(1000);
    fireEvent.keyUp(pour, { key: ' ' });
    wait(1000);
    expect(volume()).toHaveTextContent('1.50 mL');
  });
});

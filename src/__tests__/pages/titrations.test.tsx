import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Titrations from '~/pages/titrations';

// both tabs stay mounted, so look inside the one showing
const panel = () => screen.getByRole('tabpanel');
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const ph = () => within(panel()).getByTestId('ph');
const volume = () => within(panel()).getByTestId('volume');
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

describe('Titrations page: pH curve', () => {
  const curve = () => screen.queryByRole('img', { name: /pH curve/i });

  it('plots the curve as titrant goes in', async () => {
    render(<Titrations />);
    expect(curve()).toHaveAccessibleName(/pH 1.00 after 0.00 mL/);
    await userEvent.click(button('Add 1 mL'));
    // 2.4 mmol of HCl left in 26 mL
    expect(curve()).toHaveAccessibleName(/pH 1.03 after 1.00 mL/);
  });

  it('shades the indicator’s colour change on the curve', async () => {
    render(<Titrations />);
    expect(curve()).toHaveAccessibleName(
      /phenolphthalein changes colour from pH 8.3 to 10/i,
    );
    await pick(/^Indicator:/, /Methyl orange/);
    expect(curve()).toHaveAccessibleName(
      /methyl orange changes colour from pH 3.1 to 4.4/i,
    );
  });

  it('can mark the equivalence and half-equivalence points', async () => {
    render(<Titrations />);
    await pick(/^Analyte:/, /Acetic acid/);
    expect(curve()).not.toHaveAccessibleName(/equivalence/i);
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Mark equivalence points' }),
    );
    expect(curve()).toHaveAccessibleName(/equivalence point at 25.00 mL/i);
    expect(curve()).toHaveAccessibleName(/pH = pKa = 4.76 at 12.50 mL/);
  });

  it('marks both of phosphoric acid’s jumps, but not the third proton', async () => {
    render(<Titrations />);
    await pick(/^Analyte:/, /Phosphoric acid/);
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Mark equivalence points' }),
    );
    expect(curve()).toHaveAccessibleName(
      /equivalence points at 12.50 and 25.00 mL/i,
    );
    expect(curve()).not.toHaveAccessibleName(/37.50/);
  });

  it('can be hidden', async () => {
    render(<Titrations />);
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Show pH curve' }),
    );
    expect(curve()).not.toBeInTheDocument();
  });
});

describe('Titrations page: Unknown', () => {
  // the unknown: acetic acid at 0.0870 M, equivalence at 21.75 mL
  beforeEach(() => {
    const rolls = [0.3, 0.37];
    jest
      .spyOn(Math, 'random')
      .mockImplementation(() => (rolls.length ? rolls.shift()! : 0.5));
  });
  afterEach(() => jest.restoreAllMocks());

  const openUnknown = async () => {
    render(<Titrations />);
    await userEvent.click(screen.getByRole('tab', { name: 'Unknown' }));
  };
  const answer = () =>
    screen.getByRole('textbox', { name: 'Concentration (M)' });
  const titrateTo = (mL: number) => {
    for (let i = 0; i < Math.floor(mL); i++)
      fireEvent.click(button('Add 1 mL'));
    const drops = Math.round((mL - Math.floor(mL)) / 0.05);
    for (let i = 0; i < drops; i++) fireEvent.click(button('Add drop'));
  };

  it('starts in the Lab, with an Unknown tab beside it', () => {
    render(<Titrations />);
    expect(screen.getByRole('tab', { name: 'Lab' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Unknown' })).toBeInTheDocument();
  });

  it('names the analyte but hides its concentration, the pH meter and the curve', async () => {
    await openUnknown();
    expect(
      within(panel()).getByText(/25.00 mL of acetic acid \(CH₃COOH\)/i),
    ).toBeInTheDocument();
    expect(
      within(panel()).getByText(/concentration unknown/i),
    ).toBeInTheDocument();
    expect(within(panel()).queryByTestId('ph')).not.toBeInTheDocument();
    expect(
      within(panel()).queryByRole('img', { name: /pH curve/i }),
    ).not.toBeInTheDocument();
  });

  it('accepts a concentration worked out from a good endpoint', async () => {
    await openUnknown();
    titrateTo(21.75);
    await userEvent.type(answer(), '0.087');
    await userEvent.click(button('Check'));
    expect(within(panel()).getByText(/correct/i)).toBeInTheDocument();
    // then reveals the curve, with the true equivalence point marked
    expect(
      within(panel()).getByRole('img', { name: /pH curve/i }),
    ).toHaveAccessibleName(/equivalence point at 21.75 mL/i);
  });

  it('says the endpoint came too early when the maths fits the reading', async () => {
    await openUnknown();
    titrateTo(15);
    await userEvent.type(answer(), '0.06');
    await userEvent.click(button('Check'));
    expect(within(panel()).getByText(/too early/i)).toBeInTheDocument();
    expect(within(panel()).getByText(/0.0870 M/)).toBeInTheDocument();
  });

  it('points to the calculation when the answer doesn’t fit the reading', async () => {
    await openUnknown();
    titrateTo(21.75);
    await userEvent.type(answer(), '0.5');
    await userEvent.click(button('Check'));
    expect(
      within(panel()).getByText(/check your calculation/i),
    ).toBeInTheDocument();
  });

  it('ends the round on Check, until a new unknown', async () => {
    await openUnknown();
    titrateTo(21.75);
    await userEvent.type(answer(), '0.087');
    await userEvent.click(button('Check'));
    expect(button('Add 1 mL')).toBeDisabled();
    expect(answer()).toBeDisabled();

    await userEvent.click(button('New unknown'));
    expect(volume()).toHaveTextContent('0.00 mL');
    expect(answer()).toHaveValue('');
    expect(button('Add 1 mL')).toBeEnabled();
  });

  it('needs an answer before Check', async () => {
    await openUnknown();
    expect(button('Check')).toBeDisabled();
  });
});

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Titrations from '~/pages/titrations';

// record what the page asks Mr. G to say
const mockSay = jest.fn();
jest.mock('~/components/guide', () => ({
  useGuide: () => ({ say: mockSay, visible: false }),
}));
beforeEach(() => mockSay.mockClear());

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

  it('names the analyte but hides its concentration and the pH meter', async () => {
    await openUnknown();
    expect(
      within(panel()).getByText(/25.00 mL of acetic acid \(CH₃COOH\)/i),
    ).toBeInTheDocument();
    expect(
      within(panel()).getByText(/concentration unknown/i),
    ).toBeInTheDocument();
    expect(within(panel()).queryByTestId('ph')).not.toBeInTheDocument();
  });

  it('draws the curve while titrating, without giving away the equivalence point', async () => {
    await openUnknown();
    titrateTo(10);
    const curve = within(panel()).getByRole('img', { name: /pH curve/i });
    expect(curve).toHaveAccessibleName(/after 10.00 mL/);
    expect(curve).not.toHaveAccessibleName(/equivalence/i);
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
    expect(
      within(panel()).getByRole('img', { name: /flask/ }),
    ).toHaveAccessibleName(/burette reads 0.00 mL/i);
    expect(answer()).toHaveValue('');
    expect(button('Add 1 mL')).toBeEnabled();
  });

  it('hides the volume readout until Check, so students read the burette', async () => {
    await openUnknown();
    titrateTo(21.75);
    expect(within(panel()).queryByTestId('volume')).not.toBeInTheDocument();
    await userEvent.type(answer(), '0.087');
    await userEvent.click(button('Check'));
    expect(volume()).toHaveTextContent('21.75 mL');
  });

  it('needs an answer before Check', async () => {
    await openUnknown();
    expect(button('Check')).toBeDisabled();
  });
});

describe('Titrations page: drips and pouring', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  const wait = (ms: number) => act(() => jest.advanceTimersByTime(ms));
  const drops = () => within(panel()).queryAllByTestId('drop');
  const stream = () => within(panel()).queryByTestId('stream');

  it('lets a drop fall from the burette, then clears it', () => {
    render(<Titrations />);
    expect(drops()).toHaveLength(0);
    fireEvent.click(button('Add drop'));
    expect(drops()).toHaveLength(1);
    wait(2000);
    expect(drops()).toHaveLength(0);
  });

  it('runs a burst of drops for a millilitre', () => {
    render(<Titrations />);
    fireEvent.click(button('Add 1 mL'));
    expect(drops().length).toBeGreaterThan(1);
  });

  it('shows a stream only while Pour is held', () => {
    render(<Titrations />);
    expect(stream()).not.toBeInTheDocument();
    fireEvent.pointerDown(button('Pour'));
    wait(100);
    expect(stream()).toBeInTheDocument();
    fireEvent.pointerUp(button('Pour'));
    expect(stream()).not.toBeInTheDocument();
  });
});

describe('Titrations page: Mr. G', () => {
  it('points out the endpoint at the first colour change', async () => {
    render(<Titrations />);
    // at 25 mL the pH is 7.00, still colourless for phenolphthalein
    for (let i = 0; i < 25; i++) fireEvent.click(button('Add 1 mL'));
    expect(mockSay).not.toHaveBeenCalled();
    fireEvent.click(button('Add 1 mL')); // 26 mL: pink
    expect(mockSay).toHaveBeenCalledWith(
      expect.stringMatching(/endpoint/),
      'tip',
      { unprompted: true },
    );
    fireEvent.click(button('Add 1 mL'));
    expect(mockSay).toHaveBeenCalledTimes(1); // once per flask
  });

  describe('in the Unknown', () => {
    beforeEach(() => {
      const rolls = [0.3, 0.37]; // acetic acid, 0.0870 M
      jest
        .spyOn(Math, 'random')
        .mockImplementation(() => (rolls.length ? rolls.shift()! : 0.5));
    });
    afterEach(() => jest.restoreAllMocks());

    const submit = async (value: string) => {
      render(<Titrations />);
      await userEvent.click(screen.getByRole('tab', { name: 'Unknown' }));
      for (let i = 0; i < 21; i++) fireEvent.click(button('Add 1 mL'));
      for (let i = 0; i < 15; i++) fireEvent.click(button('Add drop'));
      mockSay.mockClear();
      await userEvent.type(
        screen.getByRole('textbox', { name: 'Concentration (M)' }),
        value,
      );
      await userEvent.click(button('Check'));
    };

    it('cheers a correct answer (which plays the treasure sound)', async () => {
      await submit('0.087');
      expect(mockSay).toHaveBeenCalledWith(
        expect.stringMatching(/correct/i),
        'cheer',
      );
    });

    it('gives a hint for a wrong one', async () => {
      await submit('0.5');
      expect(mockSay).toHaveBeenCalledWith(
        expect.stringMatching(/moles/i),
        'hint',
      );
    });
  });
});

describe('Titrations page: colour swirls', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  const wait = (ms: number) => act(() => jest.advanceTimersByTime(ms));
  const swirls = () => within(panel()).queryAllByTestId('swirl');

  it('makes no swirl far from the endpoint', () => {
    render(<Titrations />);
    for (let i = 0; i < 10; i++) fireEvent.click(button('Add 1 mL'));
    wait(5000);
    fireEvent.click(button('Add drop'));
    expect(swirls()).toHaveLength(0);
  });

  it('swirls pink where a drop lands near the endpoint, then fades it', () => {
    render(<Titrations />);
    for (let i = 0; i < 24; i++) fireEvent.click(button('Add 1 mL'));
    wait(5000);
    fireEvent.click(button('Add drop'));
    expect(swirls()).toHaveLength(1);
    wait(5000);
    expect(swirls()).toHaveLength(0);
  });

  it('swirls under the stream while pouring near the endpoint', () => {
    render(<Titrations />);
    for (let i = 0; i < 24; i++) fireEvent.click(button('Add 1 mL'));
    wait(5000);
    fireEvent.pointerDown(button('Pour'));
    wait(100);
    expect(swirls()).toHaveLength(1);
    fireEvent.pointerUp(button('Pour'));
  });
});

describe('Titrations page: burette close-up', () => {
  const zoom = () =>
    within(panel()).getByRole('button', { name: 'Zoom in on the burette' });
  const closeUp = () =>
    within(panel()).queryByRole('img', { name: /close-up of the burette/i });

  it('opens a close-up of the scale around the reading when the burette is clicked', () => {
    render(<Titrations />);
    for (let i = 0; i < 24; i++) fireEvent.click(button('Add 1 mL'));
    expect(closeUp()).toBeNull();
    fireEvent.click(zoom());
    expect(zoom()).toHaveAttribute('aria-expanded', 'true');
    expect(closeUp()).toHaveAccessibleName(
      'Close-up of the burette from 23.00 to 25.00 mL. Read the bottom of the meniscus.',
    );
  });

  it('follows the level as titrant goes in', () => {
    render(<Titrations />);
    fireEvent.click(zoom());
    for (let i = 0; i < 10; i++) fireEvent.click(button('Add 1 mL'));
    expect(closeUp()).toHaveAccessibleName(/from 9.00 to 11.00 mL/);
  });

  it('closes with the burette again or with Escape', () => {
    render(<Titrations />);
    fireEvent.click(zoom());
    fireEvent.click(zoom());
    expect(closeUp()).toBeNull();
    fireEvent.click(zoom());
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(closeUp()).toBeNull();
    expect(zoom()).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('Titrations page: stirring', () => {
  it('stirs the flask on a magnetic stirrer, as titrations should be', () => {
    render(<Titrations />);
    expect(
      within(panel()).getByRole('img', { name: /flask/ }),
    ).toHaveAccessibleName(/stirred by a stir bar/);
    expect(within(panel()).getByTestId('stir-bar')).toBeInTheDocument();
  });
});

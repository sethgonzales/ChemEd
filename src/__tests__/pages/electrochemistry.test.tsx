import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Electrochemistry from '~/pages/electrochemistry';

// record what the page asks Mr. G to say
const mockSay = jest.fn();
jest.mock('~/components/guide', () => ({
  useGuide: () => ({ say: mockSay, visible: false }),
}));
beforeEach(() => mockSay.mockClear());

const button = (name: string | RegExp) => screen.getByRole('button', { name });
const voltage = () => screen.getByTestId('voltage');
const status = () => screen.getByRole('status');
const cellPicture = () => screen.getByRole('img', { name: /cell/i });
const pick = async (menu: RegExp, option: RegExp) => {
  await userEvent.click(button(menu));
  await userEvent.click(button(option));
};
const volts = () => Number(voltage().textContent!.match(/[\d.]+/)![0]);
const grams = (id: string) =>
  Number(screen.getByTestId(id).textContent!.match(/[\d.]+/)![0]);

describe('Electrochemistry page: Voltaic cell', () => {
  it('calls it a voltaic cell, as AP Chemistry does', () => {
    render(<Electrochemistry />);
    expect(screen.getByRole('tab', { name: 'Voltaic' })).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Voltaic cell' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /^Voltaic cell:/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/galvanic/i)).toBeNull();
  });

  it('says what to do in one line', () => {
    render(<Electrochemistry />);
    expect(
      screen.getByRole('heading', { name: 'Electrochemistry' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Build a cell from two half-cells/)).toBeVisible();
  });

  it('starts as an open Daniell cell: zinc and copper, nothing flowing', () => {
    render(<Electrochemistry />);
    expect(button('Left electrode: Zinc (Zn)')).toBeInTheDocument();
    expect(button('Left solution: Zn(NO₃)₂')).toBeInTheDocument();
    expect(button('Right electrode: Copper (Cu)')).toBeInTheDocument();
    expect(button('Right solution: Cu(NO₃)₂')).toBeInTheDocument();
    expect(voltage()).toHaveTextContent('0.00 V');
    expect(status()).toHaveTextContent(/press Connect/i);
    expect(button('Connect')).toHaveAttribute('aria-pressed', 'false');
  });

  it('reads 1.10 V once connected, with zinc oxidised at the anode', async () => {
    render(<Electrochemistry />);
    await userEvent.click(button('Connect'));
    expect(button('Connect')).toHaveAttribute('aria-pressed', 'true');
    expect(voltage()).toHaveTextContent('1.10 V');
    expect(status()).toHaveTextContent(
      /zinc is oxidised at the anode.*Cu²⁺ is reduced at the cathode/i,
    );
    expect(cellPicture()).toHaveAccessibleName(
      /electrons flow through the wire from the zinc on the left to the copper on the right/i,
    );
  });

  it('keeps zinc as the anode when the metals swap sides', async () => {
    render(<Electrochemistry />);
    await pick(/^Left electrode/, /^Copper/);
    await pick(/^Left solution/, /^Cu\(NO₃\)₂/);
    await pick(/^Right electrode/, /^Zinc/);
    await pick(/^Right solution/, /^Zn\(NO₃\)₂/);
    await userEvent.click(button('Connect'));
    expect(voltage()).toHaveTextContent('1.10 V');
    expect(cellPicture()).toHaveAccessibleName(
      /from the zinc on the right to the copper on the left/i,
    );
  });

  it('shows the half-equations and the Nernst equation worked out', async () => {
    render(<Electrochemistry />);
    await userEvent.click(button('Connect'));
    expect(screen.getByText('Zn → Zn²⁺ + 2e⁻')).toBeInTheDocument();
    expect(screen.getByText('Cu²⁺ + 2e⁻ → Cu')).toBeInTheDocument();
    expect(screen.getByText('Zn + Cu²⁺ → Zn²⁺ + Cu')).toBeInTheDocument();
    expect(screen.getByTestId('nernst')).toHaveTextContent(
      /E°cell = 0\.34 − \(−0\.76\) = 1\.10 V/,
    );
    expect(screen.getByTestId('nernst')).toHaveTextContent(
      /Q = \[Zn²⁺\] \/ \[Cu²⁺\] = 1/,
    );
    expect(screen.getByTestId('nernst')).toHaveTextContent(
      /E = E°cell − \(RT \/ nF\) ln Q = 1\.10 − \(0\.0257 \/ 2\) ln 1 = 1\.10 V/,
    );

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Show half-equations' }),
    );
    expect(screen.queryByText('Zn → Zn²⁺ + 2e⁻')).not.toBeInTheDocument();
  });

  it('works with E° rounded to two places, as on the AP table, so the sums add up', async () => {
    render(<Electrochemistry />);
    await pick(/^Left electrode/, /^Nickel/);
    await pick(/^Left solution/, /^Ni\(NO₃\)₂/);
    await userEvent.click(button('Connect'));
    // 0.337 − (−0.257) is 0.594 V, but from the rounded values it's 0.60 V
    expect(screen.getByTestId('nernst')).toHaveTextContent(
      /E°cell = 0\.34 − \(−0\.26\) = 0\.60 V/,
    );
  });

  it('lists the E° table to two decimal places', async () => {
    render(<Electrochemistry />);
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Show E° table' }),
    );
    const table = within(screen.getByRole('table'));
    expect(table.getByText('−0.76')).toBeInTheDocument(); // Zn, −0.7618
    expect(table.getByText('+0.80')).toBeInTheDocument(); // Ag, 0.7996
    expect(table.getByText('−0.44')).toBeInTheDocument(); // Fe
  });

  it('stops without a salt bridge, and says why', async () => {
    render(<Electrochemistry />);
    await userEvent.click(button('Connect'));
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Salt bridge' }),
    );
    expect(voltage()).toHaveTextContent('0.00 V');
    expect(status()).toHaveTextContent(/salt bridge/i);
  });

  it('explains when zinc sits in copper ions: they react in the beaker', async () => {
    render(<Electrochemistry />);
    await pick(/^Left solution/, /^Cu\(NO₃\)₂/);
    await userEvent.click(button('Connect'));
    expect(voltage()).toHaveTextContent('0.00 V');
    expect(status()).toHaveTextContent(/copper plates straight onto the zinc/i);
  });

  it('reads 0 V with the same half-cell on both sides', async () => {
    render(<Electrochemistry />);
    await pick(/^Right electrode/, /^Zinc/);
    await pick(/^Right solution/, /^Zn\(NO₃\)₂/);
    await userEvent.click(button('Connect'));
    expect(voltage()).toHaveTextContent('0.00 V');
    expect(status()).toHaveTextContent(/no difference/i);
  });

  it('reads higher when the anode’s ions are dilute (Nernst)', async () => {
    render(<Electrochemistry />);
    const left = screen.getByRole('slider', { name: /Left concentration/ });
    fireEvent.change(left, { target: { value: '1' } }); // 0.01 M
    expect(left).toHaveAccessibleName('Left concentration: 0.01 M');
    await userEvent.click(button('Connect'));
    expect(voltage()).toHaveTextContent('1.16 V');
  });
});

describe('Electrochemistry page: running the cell', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  const wait = (ms: number) => act(() => jest.advanceTimersByTime(ms));

  it('runs down: time passes, the voltage falls, the zinc thins and copper plates', () => {
    render(<Electrochemistry />);
    fireEvent.click(button('Connect'));
    wait(10_000);
    expect(screen.getByTestId('time')).not.toHaveTextContent(/^0 h 0 min$/);
    expect(volts()).toBeLessThan(1.1);
    expect(volts()).toBeGreaterThan(1);
    // equal moles of Zn and Cu, so the masses go as the molar masses
    const zinc = grams('left-mass');
    const copper = grams('right-mass');
    expect(screen.getByTestId('left-mass')).toHaveTextContent('−');
    expect(screen.getByTestId('right-mass')).toHaveTextContent('+');
    expect(zinc / copper).toBeCloseTo(65.38 / 63.546, 2);
  });

  it('goes flat once the Cu²⁺ is used up, faster with Run faster', () => {
    render(<Electrochemistry />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Run faster' }));
    fireEvent.click(button('Connect'));
    wait(10_000);
    expect(voltage()).toHaveTextContent('0.00 V');
    expect(status()).toHaveTextContent(/flat/i);
  });

  it('pauses when disconnected', () => {
    render(<Electrochemistry />);
    fireEvent.click(button('Connect'));
    wait(5_000);
    fireEvent.click(button('Connect'));
    const time = screen.getByTestId('time').textContent;
    wait(5_000);
    expect(screen.getByTestId('time')).toHaveTextContent(time!);
  });

  it('starts over on Reset with fresh electrodes and solutions', () => {
    render(<Electrochemistry />);
    fireEvent.click(button('Connect'));
    wait(10_000);
    fireEvent.click(button('Reset'));
    expect(screen.getByTestId('time')).toHaveTextContent(/^0 h 0 min$/);
    expect(voltage()).toHaveTextContent('0.00 V');
    expect(button('Connect')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button('Connect'));
    expect(voltage()).toHaveTextContent('1.10 V');
  });
});

describe('Electrochemistry page: the particle lens', () => {
  const lensPicture = () => screen.getByRole('img', { name: /close-up/i });
  const zoom = (name: RegExp) => button(name);

  it('zooms in on the zinc anode: atoms leave as ions, electrons stay in the metal', async () => {
    render(<Electrochemistry />);
    await userEvent.click(button('Connect'));
    expect(screen.queryByRole('img', { name: /close-up/i })).toBeNull();
    await userEvent.click(zoom(/zoom in on the left electrode/i));
    expect(zoom(/zoom in on the left electrode/i)).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(lensPicture()).toHaveAccessibleName(
      /close-up of the zinc anode.*zinc atoms lose 2 electrons each.*Zn²⁺ ions/i,
    );
  });

  it('zooms in on the copper cathode: ions take electrons and become metal', async () => {
    render(<Electrochemistry />);
    await userEvent.click(button('Connect'));
    await userEvent.click(zoom(/zoom in on the right electrode/i));
    expect(lensPicture()).toHaveAccessibleName(
      /close-up of the copper cathode.*Cu²⁺ ions gain 2 electrons each.*copper atoms/i,
    );
  });

  it('writes the half-equation under each electrode’s close-up', async () => {
    render(<Electrochemistry />);
    await userEvent.click(button('Connect'));
    await userEvent.click(zoom(/zoom in on the right electrode/i));
    expect(
      within(screen.getByRole('figure')).getByText('Cu²⁺ + 2e⁻ → Cu'),
    ).toBeInTheDocument();
    await userEvent.click(zoom(/zoom in on the left electrode/i));
    expect(
      within(screen.getByRole('figure')).getByText('Zn → Zn²⁺ + 2e⁻'),
    ).toBeInTheDocument();
  });

  it('zooms in on the salt bridge: K⁺ towards the cathode, NO₃⁻ towards the anode', async () => {
    render(<Electrochemistry />);
    await userEvent.click(button('Connect'));
    await userEvent.click(zoom(/zoom in on the salt bridge/i));
    expect(lensPicture()).toHaveAccessibleName(
      /K⁺ ions drift right, towards the cathode.*NO₃⁻ ions drift left, towards the anode/i,
    );
  });

  it('shows nothing reacting while the circuit is open', async () => {
    render(<Electrochemistry />);
    await userEvent.click(zoom(/zoom in on the left electrode/i));
    expect(lensPicture()).toHaveAccessibleName(/no current.*nothing reacts/i);
  });

  it('closes on a second tap, or with Escape', async () => {
    render(<Electrochemistry />);
    const left = zoom(/zoom in on the left electrode/i);
    await userEvent.click(left);
    await userEvent.click(left);
    expect(screen.queryByRole('img', { name: /close-up/i })).toBeNull();
    await userEvent.click(left);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('img', { name: /close-up/i })).toBeNull();
  });

  it('has no salt bridge to zoom in on when it’s taken out', async () => {
    render(<Electrochemistry />);
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Salt bridge' }),
    );
    expect(
      screen.queryByRole('button', { name: /zoom in on the salt bridge/i }),
    ).toBeNull();
  });

  it('keeps no running count of atoms: the close-up is a picture, not to scale', async () => {
    render(<Electrochemistry />);
    await userEvent.click(button('Connect'));
    await userEvent.click(zoom(/zoom in on the left electrode/i));
    expect(screen.queryByText(/oxidised:|reduced:/i)).toBeNull();
    expect(screen.queryByTestId('lens-count')).toBeNull();
  });
});

describe('Electrochemistry page: Electrolytic', () => {
  const open = () =>
    fireEvent.click(screen.getByRole('tab', { name: 'Electrolytic' }));
  const supply = () => screen.getByRole('slider', { name: /Supply voltage/ });
  const setVolts = (v: number) =>
    fireEvent.change(supply(), {
      target: { value: String(Math.round(v * 10)) },
    });
  const amount = (id: string) =>
    Number(screen.getByTestId(id).textContent!.match(/[\d.]+(?= (mL|g))/)![0]);
  const power = () => button('Power on');

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  // a second at a time, so the page renders between ticks as a browser would
  const wait = (seconds: number) => {
    for (let i = 0; i < seconds; i++) act(() => jest.advanceTimersByTime(1000));
  };

  it('starts with water, 3.00 V on the supply and the power off', () => {
    render(<Electrochemistry />);
    open();
    expect(button(/^Setup: Electrolysis of water/)).toBeInTheDocument();
    expect(supply()).toHaveAccessibleName('Supply voltage: 3.00 V');
    expect(power()).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('supply-current')).toHaveTextContent('0.000 A');
  });

  it('drives no current below the minimum voltage, and says what it is', () => {
    render(<Electrochemistry />);
    open();
    setVolts(1);
    fireEvent.click(power());
    expect(screen.getByTestId('supply-current')).toHaveTextContent('0.000 A');
    expect(screen.getByRole('status')).toHaveTextContent(
      /1\.00 V is below the minimum of 1\.23 V/i,
    );
  });

  it('splits water into twice as much hydrogen as oxygen', () => {
    render(<Electrochemistry />);
    open();
    fireEvent.click(power());
    expect(screen.getByRole('status')).toHaveTextContent(
      /hydrogen.*cathode.*oxygen.*anode/i,
    );
    wait(10);
    const h2 = amount('cathode-amount');
    expect(h2).toBeGreaterThan(0);
    expect(h2 / amount('anode-amount')).toBeCloseTo(2, 1);
    expect(screen.getByTestId('cathode-amount')).toHaveTextContent(/H₂/);
    expect(screen.getByTestId('anode-amount')).toHaveTextContent(/O₂/);
  });

  it('works through Faraday’s law: Q = I·t, then moles of electrons', () => {
    render(<Electrochemistry />);
    open();
    fireEvent.click(power());
    wait(5);
    expect(screen.getByTestId('faraday')).toHaveTextContent(
      /Q = I·t = 0\.88[56] A × 300 s = 266 C/, // (3 − 1.229) / 2 Ω, a rounding tie,
    );
    expect(screen.getByTestId('faraday')).toHaveTextContent(
      /n\(e⁻\) = Q \/ F = 0\.00275 mol/,
    );
  });

  it('plates as much copper on the cathode as dissolves from the anode', () => {
    render(<Electrochemistry />);
    open();
    fireEvent.click(button(/^Setup:/));
    fireEvent.click(button(/^Copper plating/));
    setVolts(0.5);
    fireEvent.click(power());
    wait(10);
    const plated = amount('cathode-amount');
    expect(plated).toBeGreaterThan(0);
    expect(amount('anode-amount')).toBeCloseTo(plated, 3);
  });

  it('needs over 4 V for molten salt, an estimate from 25 °C values', () => {
    render(<Electrochemistry />);
    open();
    fireEvent.click(button(/^Setup:/));
    fireEvent.click(button(/^Molten sodium chloride/));
    setVolts(4);
    fireEvent.click(power());
    expect(screen.getByTestId('supply-current')).toHaveTextContent('0.000 A');
    expect(screen.getByRole('status')).toHaveTextContent(/4\.07 V/);
    expect(
      screen.getByText(/estimated from 25 °C values/i),
    ).toBeInTheDocument();
    setVolts(6);
    expect(screen.getByRole('status')).toHaveTextContent(
      /sodium.*cathode.*chlorine.*anode/i,
    );
  });

  it('turns off when the hydrogen tube is full', () => {
    render(<Electrochemistry />);
    open();
    setVolts(6);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Run faster' }));
    fireEvent.click(power());
    wait(30);
    expect(power()).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('status')).toHaveTextContent(/tube is full/i);
  });

  it('starts over on Reset', () => {
    render(<Electrochemistry />);
    open();
    fireEvent.click(power());
    wait(5);
    fireEvent.click(button('Reset'));
    expect(screen.getByTestId('electrolysis-time')).toHaveTextContent(
      /^0 h 0 min$/,
    );
    expect(power()).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('Electrochemistry page: Predict mode', () => {
  // 0.3 picks zinc, then iron from the metals left: a Zn | Fe cell, 0.32 V
  beforeEach(() => jest.spyOn(Math, 'random').mockReturnValue(0.3));
  afterEach(() => jest.restoreAllMocks());

  const predict = () =>
    userEvent.click(
      screen.getByRole('checkbox', { name: 'Predict before connecting' }),
    );
  const answer = async (metal: RegExp, volts: string) => {
    await userEvent.click(screen.getByRole('radio', { name: metal }));
    await userEvent.type(
      screen.getByRole('textbox', { name: /Cell voltage/ }),
      volts,
    );
    await userEvent.click(button('Check'));
  };

  it('sets a challenge, has Mr. G name it, and hides the answer until checked', async () => {
    render(<Electrochemistry />);
    await predict();
    expect(button('Left electrode: Zinc (Zn)')).toBeInTheDocument();
    expect(button('Right electrode: Iron (Fe)')).toBeInTheDocument();
    expect(mockSay).toHaveBeenCalledWith(
      expect.stringMatching(/zinc on the left, iron on the right/i),
      'tip',
    );
    expect(button('Connect')).toBeDisabled();
    expect(screen.queryByTestId('nernst')).toBeNull();
  });

  it('cheers a right prediction, then connects to show it', async () => {
    render(<Electrochemistry />);
    await predict();
    await answer(/Zinc \(left\)/, '0.32');
    expect(screen.getByText(/Right: zinc is the anode/)).toBeInTheDocument();
    expect(mockSay).toHaveBeenCalledWith(expect.any(String), 'cheer');
    expect(voltage()).toHaveTextContent('0.32 V');
    expect(screen.getByTestId('nernst')).toBeInTheDocument();
  });

  it('works a wrong voltage out, with a hint from Mr. G', async () => {
    render(<Electrochemistry />);
    await predict();
    await answer(/Zinc \(left\)/, '1.2');
    expect(
      screen.getByText(/Right anode, but check the voltage/),
    ).toHaveTextContent(/−0\.44 − \(−0\.76\) = 0\.32 V/);
    expect(mockSay).toHaveBeenCalledWith(expect.any(String), 'hint');
  });

  it('starts afresh on New challenge', async () => {
    render(<Electrochemistry />);
    await predict();
    await answer(/Iron \(right\)/, '0.32');
    expect(screen.getByText(/wrong anode/i)).toBeInTheDocument();
    await userEvent.click(button('New challenge'));
    expect(screen.queryByText(/wrong anode/i)).toBeNull();
    expect(button('Connect')).toBeDisabled();
  });

  it('frees Connect again when Predict is turned off', async () => {
    render(<Electrochemistry />);
    await predict();
    await predict();
    expect(button('Connect')).toBeEnabled();
  });
});

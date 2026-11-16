import { act, fireEvent, render, screen, within } from '@testing-library/react';
import ChemicalReactions from '~/pages/chemical-reactions';

const mockSay = jest.fn();
jest.mock('~/components/guide', () => ({
  useGuide: () => ({ say: mockSay, visible: false }),
}));

const stage = () => screen.getByRole('region', { name: 'Reaction' });
const picture = () => within(stage()).getByRole('img');
const atoms = () => picture().querySelectorAll('[data-atom]');
const choose = (picker: RegExp, option: string | RegExp) => {
  fireEvent.click(screen.getByRole('button', { name: picker }));
  fireEvent.click(screen.getByRole('button', { name: option }));
};
const react = () => {
  fireEvent.click(screen.getByRole('button', { name: 'React' }));
  act(() => jest.advanceTimersByTime(5000));
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('Chemical Reactions: Explore', () => {
  it('opens on a synthesis, with its pattern and balanced equation', () => {
    render(<ChemicalReactions />);
    expect(
      screen.getByRole('heading', { name: 'Chemical Reactions' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Explore' })).toBeInTheDocument();
    expect(within(stage()).getByText('A + B → AB')).toBeInTheDocument();
    expect(within(stage()).getByText('2H₂ + O₂ → 2H₂O')).toBeInTheDocument();
  });

  it('shows the reactant molecules before the reaction', () => {
    render(<ChemicalReactions />);
    expect(picture()).toHaveAccessibleName(
      'Before the reaction: 2 H₂ and 1 O₂, 6 atoms',
    );
    expect(atoms()).toHaveLength(6);
  });

  it('regroups the same atoms into the products when it reacts', () => {
    render(<ChemicalReactions />);
    react();
    expect(picture()).toHaveAccessibleName(
      'After the reaction: 2 H₂O, 6 atoms',
    );
    expect(atoms()).toHaveLength(6); // none made or lost
    expect(
      within(stage()).getByText(/same atoms, regrouped/i),
    ).toBeInTheDocument();
  });

  it('goes back to the reactants on Reset', () => {
    render(<ChemicalReactions />);
    react();
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    act(() => jest.advanceTimersByTime(100));
    expect(picture()).toHaveAccessibleName(/^Before the reaction/);
  });

  it('switches to another type and lists its examples', () => {
    render(<ChemicalReactions />);
    choose(/choose a type/i, 'Combustion');
    expect(
      within(stage()).getByText('CₓHᵧ + O₂ → CO₂ + H₂O'),
    ).toBeInTheDocument();
    expect(
      within(stage()).getByText('CH₄ + 2O₂ → CO₂ + 2H₂O'),
    ).toBeInTheDocument();
    choose(/choose a reaction/i, /propane/i);
    expect(
      within(stage()).getByText('C₃H₈ + 5O₂ → 3CO₂ + 4H₂O'),
    ).toBeInTheDocument();
  });

  it('starts a new example from its reactants', () => {
    render(<ChemicalReactions />);
    react();
    choose(/choose a type/i, 'Decomposition');
    expect(picture()).toHaveAccessibleName(/^Before the reaction/);
  });

  it('tags the AP categories that fit', () => {
    render(<ChemicalReactions />);
    expect(within(stage()).getByText('Redox')).toBeInTheDocument();
    choose(/choose a type/i, 'Double replacement');
    choose(/choose a reaction/i, /neutrali/i);
    expect(within(stage()).getByText('Acid–base')).toBeInTheDocument();
    expect(within(stage()).queryByText('Redox')).toBeNull();
  });

  it('shows ions with their charges, and the metal they become without', () => {
    render(<ChemicalReactions />);
    choose(/choose a type/i, 'Single replacement');
    choose(/choose a reaction/i, /copper sulfate/i);
    expect(within(picture()).getAllByText('Cu²⁺')).toHaveLength(3);
    expect(within(picture()).getAllByText('SO₄²⁻')).toHaveLength(3);
    react();
    expect(within(picture()).queryByText('Cu²⁺')).toBeNull();
    expect(within(picture()).getAllByText('Al³⁺')).toHaveLength(2);
    expect(within(picture()).getAllByText('Cu')).toHaveLength(3);
  });

  it('cites where its facts come from', () => {
    render(<ChemicalReactions />);
    for (const title of [
      /Chemistry 2e, section 2\.6/, // ion charges
      /Chemistry 2e, section 4\.2/, // solubility and strong acids
      /Chemistry 2e, section 14\.3/, // strong bases
      /Standard electrode potential/, // the activity series
      /Computational Chemistry Comparison/, // bond angles
    ])
      expect(screen.getByText(title)).toBeInTheDocument();
  });

  // old bookmarks to this page used to open balancing
  it('points the way to Reaction Balancing', () => {
    render(<ChemicalReactions />);
    expect(
      screen.getByRole('link', { name: /Reaction Balancing/ }),
    ).toHaveAttribute('href', '/reaction-balancing');
  });
});

describe('Chemical Reactions: Sort', () => {
  const sorter = () => screen.getByRole('region', { name: 'Sort' });
  const answer = (type: string) =>
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Reaction type' })).getByRole(
        'button',
        { name: type },
      ),
    );
  const open = () => {
    render(<ChemicalReactions />);
    fireEvent.click(screen.getByRole('tab', { name: 'Sort' }));
  };

  beforeEach(() => {
    mockSay.mockClear();
    jest.spyOn(Math, 'random').mockReturnValue(0); // deals the first equation
  });
  afterEach(() => jest.restoreAllMocks());

  it('deals a balanced equation to sort', () => {
    open();
    expect(within(sorter()).getByText('2H₂ + O₂ → 2H₂O')).toBeInTheDocument();
  });

  it('says why a right answer is right, and scores it', () => {
    open();
    answer('Synthesis');
    expect(within(sorter()).getByRole('status')).toHaveTextContent(
      /Correct.*H₂ and O₂ combine into one product, H₂O/,
    );
    expect(within(sorter()).getByTestId('sort-score')).toHaveTextContent(
      '1 of 1',
    );
  });

  it('gives the right type and the reason after a wrong answer', () => {
    open();
    answer('Decomposition');
    expect(within(sorter()).getByRole('status')).toHaveTextContent(
      /Not quite: it’s a synthesis\. .*combine into one product/,
    );
    expect(within(sorter()).getByTestId('sort-score')).toHaveTextContent(
      '0 of 1',
    );
    expect(
      within(screen.getByRole('group', { name: 'Reaction type' })).getByRole(
        'button',
        { name: 'Combustion' },
      ),
    ).toBeDisabled();
  });

  it('deals a different equation on Next', () => {
    open();
    answer('Synthesis');
    fireEvent.click(screen.getByRole('button', { name: 'Next equation' }));
    expect(within(sorter()).getByText('N₂ + 3H₂ → 2NH₃')).toBeInTheDocument();
    expect(within(sorter()).getByRole('status')).toHaveTextContent('');
    expect(
      within(screen.getByRole('group', { name: 'Reaction type' })).getByRole(
        'button',
        { name: 'Synthesis' },
      ),
    ).toBeEnabled();
  });

  it('has Mr. G cheer a streak of five', () => {
    open();
    for (let i = 0; i < 5; i++) {
      answer('Synthesis'); // water and ammonia, dealt in turn
      fireEvent.click(screen.getByRole('button', { name: 'Next equation' }));
    }
    expect(mockSay).toHaveBeenCalledWith(
      expect.stringMatching(/5 in a row/),
      'cheer',
    );
    expect(within(sorter()).getByTestId('sort-score')).toHaveTextContent(
      'Streak: 5',
    );
  });
});

describe('Chemical Reactions: Predict', () => {
  const predictor = () => screen.getByRole('region', { name: 'Predict' });
  const press = (name: string) =>
    fireEvent.click(screen.getByRole('button', { name }));
  const blank = (n: number) =>
    within(predictor()).getByRole('textbox', { name: `Product ${n}` });
  const write = (n: number, text: string, state?: string) => {
    fireEvent.change(blank(n), { target: { value: text } });
    if (state) {
      fireEvent.click(
        within(predictor()).getByRole('button', {
          name: new RegExp(`^Product ${n} state`),
        }),
      );
      fireEvent.click(
        within(predictor()).getByRole('button', {
          name: new RegExp(`^\\(${state}\\)`),
        }),
      );
    }
  };
  const open = () => {
    render(<ChemicalReactions />);
    fireEvent.click(screen.getByRole('tab', { name: 'Predict' }));
  };
  const coefficient = (name: string, value: string) =>
    fireEvent.change(
      within(predictor()).getByRole('textbox', {
        name: `Coefficient for ${name}`,
      }),
      { target: { value } },
    );
  const equation = () =>
    within(predictor()).getByRole('group', { name: 'Equation' });
  // 3Mg(s) + 2Al(NO₃)₃(aq) → 3Mg(NO₃)₂(aq) + 2Al(s)
  const writeProducts = () => {
    write(1, 'Mg(NO3)2', 'aq');
    write(2, 'Al', 's');
  };
  const writeRight = () => {
    writeProducts();
    coefficient('Mg', '3');
    coefficient('Al(NO₃)₃', '2');
    coefficient('product 1', '3');
    coefficient('product 2', '2');
  };
  const status = () => within(predictor()).getByRole('status');
  const picture = () =>
    within(predictor()).getByRole('img', { name: /beaker/i });

  beforeEach(() => {
    mockSay.mockClear();
    jest.spyOn(Math, 'random').mockReturnValue(0); // deals the first puzzle
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('deals reactants to predict, with the beaker as it starts', () => {
    open();
    expect(equation()).toHaveTextContent(/^Mg\(s\) \+ Al\(NO₃\)₃\(aq\) →/);
    expect(picture()).toHaveAccessibleName(
      /before: 3 Mg \(solid\).*Al³⁺.*NO₃⁻/,
    );
  });

  it('keeps the products on the reactants’ line, after the arrow', () => {
    open();
    expect(equation()).toHaveTextContent(/Mg\(s\) \+ Al\(NO₃\)₃\(aq\) →.*\+/);
    expect(
      within(equation()).getAllByRole('textbox', { name: /^Product/ }),
    ).toHaveLength(2);
  });

  it('gives every reactant and product a coefficient box', () => {
    open();
    expect(
      within(equation()).getAllByRole('textbox', { name: /^Coefficient for/ }),
    ).toHaveLength(4);
  });

  it('uses the readable font for the state pickers', () => {
    open();
    expect(
      within(predictor()).getByRole('button', {
        name: 'Product 1 state: not chosen',
      }),
    ).not.toHaveClass('font-pixel');
  });

  it('includes balancing by default, behind a setting', () => {
    open();
    const setting = screen.getByRole('checkbox', {
      name: 'Balance the equation too',
    });
    expect(setting).toBeChecked();
    fireEvent.click(setting);
    expect(
      within(equation()).queryAllByRole('textbox', {
        name: /^Coefficient for/,
      }),
    ).toHaveLength(0);
    writeProducts(); // right products, no coefficients
    press('Check');
    expect(status()).toHaveTextContent(/Correct/);
  });

  it('asks for balancing once the products are right', () => {
    open();
    writeProducts();
    press('Check');
    expect(status()).toHaveTextContent(/balance/i);
    expect(status()).toHaveTextContent(
      /Count the N: 3 on the left, 2 on the right/,
    );
    expect(within(predictor()).getByTestId('predict-score')).toHaveTextContent(
      '0 of 1',
    );
  });

  it('shows a faded (aq) in each state picker until a state is chosen', () => {
    open();
    const picker = within(predictor()).getByRole('button', {
      name: 'Product 1 state: not chosen',
    });
    expect(picker).toHaveTextContent('(aq)');
    write(1, 'Mg(NO3)2', 's');
    expect(
      within(predictor()).getByRole('button', { name: 'Product 1 state: (s)' }),
    ).toBeInTheDocument();
  });

  it('turns typed numbers into subscripts', () => {
    open();
    write(1, 'Mg(NO3)2');
    expect(blank(1)).toHaveValue('Mg(NO₃)₂');
  });

  it('only checks once both products have a formula and a state', () => {
    open();
    write(1, 'Mg(NO3)2', 'aq');
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled();
    write(2, 'Al', 's');
    expect(screen.getByRole('button', { name: 'Check' })).toBeEnabled();
  });

  it('marks it correct, crossing out the spectators to leave the net ionic equation', () => {
    open();
    writeRight();
    press('Check');
    expect(status()).toHaveTextContent(/Correct/);
    expect(status()).toHaveTextContent(/6NO₃⁻\(aq\) \(spectator\)/);
    expect(status()).toHaveTextContent(
      '3Mg(s) + 2Al³⁺(aq) → 3Mg²⁺(aq) + 2Al(s)',
    );
    expect(within(predictor()).getByTestId('predict-score')).toHaveTextContent(
      '1 of 1',
    );
  });

  it('shows the products forming in the beaker after Check', () => {
    jest.useFakeTimers();
    open();
    writeRight();
    press('Check');
    act(() => jest.advanceTimersByTime(5000));
    expect(picture()).toHaveAccessibleName(/after: 3 Mg²⁺.*Al \(solid\)/);
  });

  it('hints at what’s wrong with a typed formula', () => {
    open();
    write(1, 'MgNO3', 'aq');
    write(2, 'Al', 's');
    press('Check');
    expect(status()).toHaveTextContent(/Not quite/);
    expect(within(predictor()).getByText(/MgNO₃ isn’t neutral/)).toBeVisible();
  });

  it('says when only a state is wrong', () => {
    open();
    write(1, 'Mg(NO3)2', 's');
    write(2, 'Al', 's');
    press('Check');
    expect(status()).toHaveTextContent(/states/i);
    expect(within(predictor()).getByText(/check its state/i)).toBeVisible();
  });

  it('says there is a reaction after a wrong No reaction', () => {
    open();
    press('No reaction');
    expect(status()).toHaveTextContent(/There is a reaction/);
    expect(status()).toHaveTextContent(/Mg is above Al/);
  });

  it('clears the blanks for the next reactants', () => {
    open();
    writeRight();
    press('Check');
    press('Next reactants');
    expect(equation()).toHaveTextContent(/^Mg\(s\) \+ Zn\(NO₃\)₂\(aq\) →/);
    expect(blank(1)).toHaveValue('');
    expect(
      within(predictor()).getByRole('textbox', { name: 'Coefficient for Mg' }),
    ).toHaveValue('');
    expect(status()).toHaveTextContent('');
  });
});

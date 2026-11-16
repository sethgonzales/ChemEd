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

import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChemicalReactions from '~/pages/chemical-reactions';

const panel = () => screen.getByRole('tabpanel');
const coefficient = (formula: string, index = 0) =>
  within(panel()).getAllByRole('textbox', {
    name: `Coefficient for ${formula}`,
  })[index];
const increase = (formula: string) =>
  userEvent.click(
    within(panel()).getByRole('button', { name: `More ${formula}` }),
  );
const tallyRow = (element: string) =>
  within(within(panel()).getByRole('table', { name: 'Atom count' }))
    .getAllByRole('row')
    .find((row) => within(row).queryByRole('rowheader', { name: element }))!;
const status = () => within(panel()).getByTestId('balance-status');
const seesaw = () => within(panel()).getByRole('img', { name: /^Seesaw/ });

async function choose(picker: RegExp, option: string) {
  await userEvent.click(within(panel()).getByRole('button', { name: picker }));
  await userEvent.click(within(panel()).getByRole('button', { name: option }));
}

describe('Chemical Reactions page: balancing practice', () => {
  it('starts with an unbalanced equation and every coefficient at 1', () => {
    render(<ChemicalReactions />);
    expect(
      screen.getByRole('heading', { name: 'Chemical Reactions' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Practice' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(within(panel()).getByTestId('equation')).toHaveTextContent(
      'H₂ + O₂ → H₂O',
    );
    for (const f of ['H₂', 'O₂', 'H₂O']) {
      expect(coefficient(f)).toHaveValue('1');
    }
  });

  it('tallies each element on both sides', () => {
    render(<ChemicalReactions />);
    expect(tallyRow('H')).toHaveTextContent('2');
    expect(tallyRow('H')).toHaveTextContent('Balanced');
    expect(tallyRow('O')).toHaveTextContent('Not balanced');
  });

  it('lists the atom count under the seesaw, mirroring its sides', () => {
    render(<ChemicalReactions />);
    // seesaw and counts share one card
    const card = within(panel()).getByTestId('balance-card');
    expect(
      within(card).getByRole('img', { name: /^Seesaw/ }),
    ).toBeInTheDocument();
    const table = within(card).getByRole('table', { name: 'Atom count' });
    // reactant counts on the left, elements in the middle, product counts on the right
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(headers.slice(0, 3)).toEqual(['Reactants', 'Element', 'Products']);
    const [left, right] = within(tallyRow('O')).getAllByRole('cell');
    const element = within(tallyRow('O')).getByRole('rowheader');
    expect(left).toHaveTextContent('2');
    expect(element).toHaveTextContent('O');
    expect(right).toHaveTextContent('1');
  });

  it('tips the seesaw toward the side with more atoms', () => {
    render(<ChemicalReactions />);
    // 1 H₂ + 1 O₂ (4 atoms) against 1 H₂O (3 atoms)
    expect(seesaw()).toHaveAccessibleName(
      'Seesaw tips toward the reactants: 4 atoms on the reactant side, 3 on the product side',
    );
  });

  it('puts one chip on the seesaw for every molecule', async () => {
    render(<ChemicalReactions />);
    const molecules = (formula: string) =>
      within(seesaw()).getAllByText(formula, { selector: '[data-molecule]' });
    expect(molecules('H₂')).toHaveLength(1);
    await increase('H₂');
    expect(molecules('H₂')).toHaveLength(2);
  });

  it('says balanced once every element matches, and levels the scale', async () => {
    render(<ChemicalReactions />);
    await increase('H₂');
    await increase('H₂O');
    expect(status()).toHaveTextContent('Balanced!');
    expect(seesaw()).toHaveAccessibleName(/^Seesaw is level/);
    expect(tallyRow('O')).toHaveTextContent('Balanced');
  });

  it('nudges toward the smallest whole numbers', async () => {
    render(<ChemicalReactions />);
    for (const [f, n] of [
      ['H₂', '4'],
      ['O₂', '2'],
      ['H₂O', '4'],
    ]) {
      await userEvent.clear(coefficient(f));
      await userEvent.type(coefficient(f), n);
    }
    expect(status()).toHaveTextContent(
      'Balanced! Can you use smaller whole numbers? Every coefficient divides by 2.',
    );
  });

  it('never lets a coefficient go below 1', async () => {
    render(<ChemicalReactions />);
    await userEvent.click(
      within(panel()).getByRole('button', { name: 'Fewer H₂' }),
    );
    expect(coefficient('H₂')).toHaveValue('1');
  });

  it('shows the answer, and resets', async () => {
    render(<ChemicalReactions />);
    await userEvent.click(
      within(panel()).getByRole('button', { name: 'Show answer' }),
    );
    expect(coefficient('H₂')).toHaveValue('2');
    expect(coefficient('O₂')).toHaveValue('1');
    expect(coefficient('H₂O')).toHaveValue('2');
    expect(status()).toHaveTextContent('Answer shown');

    await userEvent.click(
      within(panel()).getByRole('button', { name: 'Reset' }),
    );
    expect(coefficient('H₂')).toHaveValue('1');
  });

  it('switches reactions from the level and reaction menus', async () => {
    render(<ChemicalReactions />);
    await choose(/^Choose a level/, 'Level 2: Combustion');
    await choose(/^Choose a reaction/, 'Burning propane');
    expect(within(panel()).getByTestId('equation')).toHaveTextContent(
      'C₃H₈ + O₂ → CO₂ + H₂O',
    );
  });
});

describe('Chemical Reactions page: your own equation', () => {
  function ownEquation() {
    render(<ChemicalReactions />);
    fireEvent.click(screen.getByRole('tab', { name: 'Your own equation' }));
  }

  it('balances an equation the student types', async () => {
    ownEquation();
    await userEvent.type(
      within(panel()).getByRole('textbox', { name: 'Equation' }),
      'C3H8 + O2 -> CO2 + H2O',
    );
    await userEvent.click(
      within(panel()).getByRole('button', { name: 'Balance this' }),
    );
    expect(within(panel()).getByTestId('equation')).toHaveTextContent(
      'C₃H₈ + O₂ → CO₂ + H₂O',
    );
    await userEvent.click(
      within(panel()).getByRole('button', { name: 'Show answer' }),
    );
    expect(coefficient('O₂')).toHaveValue('5');
  });

  it('explains equations it can’t read', async () => {
    ownEquation();
    await userEvent.type(
      within(panel()).getByRole('textbox', { name: 'Equation' }),
      'H2 + O2',
    );
    await userEvent.click(
      within(panel()).getByRole('button', { name: 'Balance this' }),
    );
    expect(within(panel()).getByRole('alert')).toHaveTextContent(
      'Use an arrow (->) between reactants and products.',
    );
  });

  it('says when an equation can’t be balanced', async () => {
    ownEquation();
    await userEvent.type(
      within(panel()).getByRole('textbox', { name: 'Equation' }),
      'H2 -> O2',
    );
    await userEvent.click(
      within(panel()).getByRole('button', { name: 'Balance this' }),
    );
    expect(within(panel()).getByRole('alert')).toHaveTextContent(
      "This equation can't be balanced",
    );
  });
});

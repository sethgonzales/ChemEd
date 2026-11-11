import { render, screen, within } from '@testing-library/react';
import { parseEquation } from '~/utils/reactions';
import Seesaw from './seesaw';

const water = parseEquation('H2 + O2 -> H2O');
const plank = () => screen.getByTestId('plank');
const chips = (formula: string) =>
  within(screen.getByRole('img')).queryAllByText(formula, {
    selector: '[data-molecule]',
  });

describe('Seesaw', () => {
  it('tips toward the side with more atoms', () => {
    render(<Seesaw reaction={water} coefficients={[1, 1, 1]} />);
    expect(Number(plank().dataset.angle)).toBeLessThan(0);
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Seesaw tips toward the reactants: 4 atoms on the reactant side, 3 on the product side',
    );
  });

  it('sits level once the equation balances', () => {
    render(<Seesaw reaction={water} coefficients={[2, 1, 2]} />);
    expect(Number(plank().dataset.angle)).toBe(0);
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Seesaw is level: 6 atoms on each side',
    );
  });

  it('shows one chip per molecule, on the right side', () => {
    render(<Seesaw reaction={water} coefficients={[2, 1, 2]} />);
    expect(chips('H₂')).toHaveLength(2);
    expect(chips('O₂')).toHaveLength(1);
    expect(chips('H₂O')).toHaveLength(2);
    const [reactants, products] = screen.getAllByTestId('seesaw-side');
    expect(within(reactants).queryAllByText('H₂O')).toHaveLength(0);
    expect(within(products).getAllByText('H₂O')).toHaveLength(2);
  });

  it('stacks each kind of molecule in its own pile', () => {
    render(<Seesaw reaction={water} coefficients={[3, 2, 1]} />);
    const [reactants] = screen.getAllByTestId('seesaw-side');
    const stacks = within(reactants).getAllByTestId('molecule-stack');
    // one pile for H₂ and one for O₂, each holding only its own molecules
    expect(stacks).toHaveLength(2);
    expect(within(stacks[0]).getAllByText('H₂')).toHaveLength(3);
    expect(within(stacks[0]).queryAllByText('O₂')).toHaveLength(0);
    expect(within(stacks[1]).getAllByText('O₂')).toHaveLength(2);
  });

  it('builds each pile upward from the plank', () => {
    render(<Seesaw reaction={water} coefficients={[3, 1, 1]} />);
    const [h2] = screen.getAllByTestId('molecule-stack');
    expect(h2).toHaveClass('flex-col-reverse');
  });

  it('caps a big pile of molecules with a count', () => {
    render(<Seesaw reaction={water} coefficients={[20, 10, 20]} />);
    expect(chips('H₂').length).toBeLessThan(20);
    expect(screen.getAllByText(/^\+\d+ more$/).length).toBeGreaterThan(0);
  });

  it('leaves totals to the screen-reader label, not on screen', () => {
    render(<Seesaw reaction={water} coefficients={[1, 1, 1]} />);
    expect(screen.queryByText(/atoms$/)).toBeNull();
  });
});

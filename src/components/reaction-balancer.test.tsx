import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReactionBalancer from './reaction-balancer';
import { parseEquation } from '~/utils/reactions';

const water = parseEquation('H2 + O2 -> H2O'); // 2, 1, 2

describe('ReactionBalancer as a puzzle', () => {
  it('says when it’s solved, in lowest terms', async () => {
    const onSolve = jest.fn();
    render(
      <ReactionBalancer reaction={water} answer={null} onSolve={onSolve} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'More H₂' }));
    await userEvent.click(screen.getByRole('button', { name: 'More H₂O' }));
    expect(onSolve).toHaveBeenCalledTimes(1);
  });

  it('isn’t solved by a balanced equation that isn’t in lowest terms', async () => {
    const onSolve = jest.fn();
    render(
      <ReactionBalancer reaction={water} answer={null} onSolve={onSolve} />,
    );
    const more = (name: string, times: number) =>
      Array.from({ length: times }).reduce<Promise<void>>(
        (p) =>
          p.then(() => userEvent.click(screen.getByRole('button', { name }))),
        Promise.resolve(),
      );
    // 4, 2, 4 balances but divides by 2; going up through 2, 1, 2 is avoided
    await more('More O₂', 1);
    await more('More H₂', 3);
    await more('More H₂O', 3);
    expect(onSolve).not.toHaveBeenCalled();
  });

  it('can leave out Show answer', () => {
    render(
      <ReactionBalancer reaction={water} answer={null} canReveal={false} />,
    );
    expect(
      screen.queryByRole('button', { name: 'Show answer' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });
});

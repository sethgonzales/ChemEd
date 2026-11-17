import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PREDICT_POOL, predict } from '~/utils/predict';
import ReactionPredict from './reaction-predict';

const NONE = PREDICT_POOL.findIndex((r) => predict(r).products === null);
const SOME = PREDICT_POOL.findIndex((r) => predict(r).products !== null);

describe('ReactionPredict, dealt a set pair', () => {
  it('reports a right call', async () => {
    const onCorrect = jest.fn();
    render(
      <ReactionPredict first={NONE} balance={false} onCorrect={onCorrect} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'No reaction' }));
    expect(onCorrect).toHaveBeenCalled();
  });

  it('doesn’t report a wrong one', async () => {
    const onCorrect = jest.fn();
    render(
      <ReactionPredict first={SOME} balance={false} onCorrect={onCorrect} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'No reaction' }));
    expect(onCorrect).not.toHaveBeenCalled();
  });

  it('deals the next pair its own way, and fixes whether to balance', async () => {
    const deal = jest.fn(() => NONE);
    render(<ReactionPredict first={SOME} balance deal={deal} />);
    expect(screen.queryByRole('checkbox', { name: /Balance/ })).toBeNull();
    await userEvent.click(
      screen.getByRole('button', { name: 'Next reactants' }),
    );
    expect(deal).toHaveBeenCalledWith(SOME);
  });
});

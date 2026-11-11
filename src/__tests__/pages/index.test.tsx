import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SIMULATIONS } from '~/constants';
import Home from '~/pages/index';

const push = jest.fn();
jest.mock('next/router', () => ({ useRouter: () => ({ push }) }));
jest.mock('~/utils/use-knock', () => ({ useKnock: () => jest.fn() }));

beforeEach(() => {
  push.mockClear();
  global.fetch = jest
    .fn()
    .mockResolvedValue({ text: () => Promise.resolve('') });
});

describe('Home page', () => {
  it('shows a card for every simulation', () => {
    render(<Home />);
    for (const { title } of SIMULATIONS) {
      expect(screen.getByRole('button', { name: title })).toBeInTheDocument();
    }
  });

  it('navigates to the simulation page when a card is clicked', async () => {
    render(<Home />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Periodic Table' }),
    );
    expect(push).toHaveBeenCalledWith('/periodic-table');
  });
});

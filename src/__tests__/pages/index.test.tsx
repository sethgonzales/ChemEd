import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SIMULATIONS } from '~/constants';
import Home from '~/pages/index';

const push = jest.fn();
jest.mock('next/router', () => ({ useRouter: () => ({ push }) }));
jest.mock('~/utils/sounds', () => ({ useDoorSound: () => jest.fn() }));

beforeEach(() => push.mockClear());

describe('Home page', () => {
  it('shows a card for every simulation', () => {
    render(<Home />);
    for (const { title, ready } of SIMULATIONS) {
      const name = ready ? title : `${title} (coming soon)`;
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('navigates to the simulation page when a card is clicked', async () => {
    render(<Home />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Periodic Table' }),
    );
    expect(push).toHaveBeenCalledWith('/periodic-table');
  });

  // sealed doors are covered in card.test.tsx
  it('opens the Titrations door now it’s built', async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole('button', { name: 'Titrations' }));
    expect(push).toHaveBeenCalledWith('/titrations');
  });
});

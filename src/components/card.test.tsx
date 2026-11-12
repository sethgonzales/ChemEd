import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Card from './card';

const mockDoorSound = jest.fn();
jest.mock('~/utils/sounds', () => ({ useDoorSound: () => mockDoorSound }));

beforeEach(() => mockDoorSound.mockClear());

const door = {
  title: 'Lewis Structures',
  color: '#3b82f6',
  art: 'lewis' as const,
};

describe('Card (a chamber door)', () => {
  it('opens when clicked', async () => {
    const onClick = jest.fn();
    render(<Card {...door} ready onClick={onClick} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Lewis Structures' }),
    );
    expect(onClick).toHaveBeenCalled();
    expect(mockDoorSound).toHaveBeenCalled();
  });

  it('shows the simulation’s art', () => {
    render(<Card {...door} ready onClick={jest.fn()} />);
    expect(
      screen
        .getByRole('button', { name: 'Lewis Structures' })
        .querySelector('svg rect'),
    ).not.toBeNull();
  });

  it('is sealed, saying coming soon, when the simulation isn’t built', async () => {
    const onClick = jest.fn();
    render(<Card {...door} ready={false} onClick={onClick} />);
    const sealed = screen.getByRole('button', {
      name: 'Lewis Structures (coming soon)',
    });
    expect(sealed).toHaveAttribute('aria-disabled', 'true');
    expect(sealed).toHaveTextContent('Coming soon');
    await userEvent.click(sealed);
    expect(onClick).not.toHaveBeenCalled();
    expect(mockDoorSound).not.toHaveBeenCalled();
  });
});

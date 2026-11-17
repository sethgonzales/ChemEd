import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DURATION_MS } from '~/components/villain';
import DungeonQuest from '~/pages/dungeon-quest';

const golem = () => screen.getByRole('img', { name: 'The Unbalanced Golem' });
const user = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('Dungeon Quest preview', () => {
  it('is titled, with the Golem waiting in its dark chamber', () => {
    render(<DungeonQuest />);
    expect(
      screen.getByRole('heading', { name: 'Dungeon Quest' }),
    ).toBeInTheDocument();
    const chamber = screen.getByRole('region', {
      name: 'The Unbalanced Golem’s chamber',
    });
    expect(chamber).toContainElement(golem());
    expect(golem()).toHaveAttribute('data-frame', 'idle');
  });

  it('shows the Golem being hit by a right answer, then waiting again', async () => {
    render(<DungeonQuest />);
    await user().click(screen.getByRole('button', { name: 'Right answer' }));
    expect(golem()).toHaveAttribute('data-frame', 'hit');
    act(() => jest.advanceTimersByTime(DURATION_MS.hit + 200));
    expect(golem()).toHaveAttribute('data-frame', 'idle');
  });

  it('shows the Golem attacking after a wrong answer', async () => {
    render(<DungeonQuest />);
    await user().click(screen.getByRole('button', { name: 'Wrong answer' }));
    expect(golem()).toHaveAttribute('data-frame', 'attack');
  });

  it('shows the Golem beaten, then reforming for another look', async () => {
    render(<DungeonQuest />);
    await user().click(screen.getByRole('button', { name: 'Defeat' }));
    expect(golem()).toHaveAttribute('data-frame', 'defeat');
    act(() => jest.advanceTimersByTime(DURATION_MS.defeat + 200)); // beaten
    expect(golem()).toHaveAttribute('data-frame', 'defeat');
    act(() => jest.advanceTimersByTime(1500)); // and back
    expect(golem()).toHaveAttribute('data-frame', 'idle');
  });
});

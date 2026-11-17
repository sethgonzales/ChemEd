import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CHAMBERS, CHAMBER_IDS } from '~/constants/quest-chambers';
import QuestGate from './quest-gate';

function setup(topics = CHAMBER_IDS, course: 'general' | 'ap' = 'general') {
  const onEnter = jest.fn();
  render(<QuestGate initial={{ topics, course }} onEnter={onEnter} />);
  return onEnter;
}

const enter = () => screen.getByRole('button', { name: 'Enter the dungeon' });

describe('QuestGate', () => {
  it('lists every chamber’s topic, ticked as the setup says', () => {
    setup();
    for (const c of CHAMBERS)
      expect(screen.getByRole('checkbox', { name: c.topic })).toBeChecked();
  });

  it('enters with the chosen topics and course', async () => {
    const onEnter = setup();
    await userEvent.click(screen.getByRole('button', { name: 'AP Chemistry' }));
    expect(
      screen.getByRole('button', { name: 'AP Chemistry' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(enter());
    expect(onEnter).toHaveBeenCalledWith({ topics: CHAMBER_IDS, course: 'ap' });
  });

  it('needs at least one topic ticked', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'None' }));
    expect(enter()).toBeDisabled();
    expect(screen.getByText('Tick at least one topic.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(enter()).toBeEnabled();
  });

  it('gives a link to share the setup with a class', () => {
    setup(CHAMBER_IDS, 'ap');
    expect(
      screen.getByRole('textbox', { name: 'Link for your class' }),
    ).toHaveValue(
      `http://localhost/dungeon-quest?topics=${CHAMBER_IDS.join('%2C')}&course=ap`,
    );
  });
});

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CHAMBER_IDS } from '~/constants/quest-chambers';
import type { Progress } from '~/utils/quest';
import QuestMap from './quest-map';

function setup(progress: Progress = {}, course: 'general' | 'ap' = 'general') {
  const onPick = jest.fn();
  const onChange = jest.fn();
  render(
    <QuestMap
      setup={{ topics: CHAMBER_IDS, course }}
      progress={progress}
      onPick={onPick}
      onChange={onChange}
    />,
  );
  return { onPick, onChange };
}

describe('QuestMap', () => {
  it('sums up the setup, with a way to change it', async () => {
    const { onChange } = setup();
    expect(
      screen.getByText(`${CHAMBER_IDS.length} topics · General Chemistry`),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Change' }));
    expect(onChange).toHaveBeenCalled();
  });

  it('opens a chamber’s door, named with its boss and stars', async () => {
    const { onPick } = setup();
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Reaction Balancing: The Unbalanced Golem, not cleared yet',
      }),
    );
    expect(onPick).toHaveBeenCalledWith('balancing');
  });

  it('shows the best stars for this course only', () => {
    setup({ general: { balancing: 1 }, ap: { balancing: 3 } }, 'ap');
    expect(
      screen.getByRole('button', {
        name: 'Reaction Balancing: The Unbalanced Golem, beaten, 3 of 3 stars',
      }),
    ).toBeInTheDocument();
  });

  it('shows a beaten boss defeated, and one still waiting standing', () => {
    setup({ general: { balancing: 2 } });
    const beaten = screen.getByRole('button', {
      name: 'Reaction Balancing: The Unbalanced Golem, beaten, 2 of 3 stars',
    });
    const picture = within(beaten).getByRole('img', {
      name: 'The Unbalanced Golem, defeated',
    });
    // standing as it was, crossed out
    expect(picture.querySelector('[data-cross]')).not.toBeNull();
    const waiting = screen.getByRole('button', {
      name: /^Periodic Table: .*not cleared yet$/,
    });
    expect(within(waiting).queryByRole('img', { name: /defeated/ })).toBeNull();
  });

  it('asks before replaying a beaten chamber', async () => {
    const { onPick } = setup({ general: { balancing: 2 } });
    await userEvent.click(
      screen.getByRole('button', { name: /^Reaction Balancing: .*beaten/ }),
    );
    expect(onPick).not.toHaveBeenCalled();
    const ask = screen.getByRole('alertdialog', {
      name: 'Replay this chamber?',
    });
    expect(ask).toHaveTextContent(
      'You’ve already beaten The Unbalanced Golem, with 2 of 3 stars',
    );

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    await userEvent.click(
      screen.getByRole('button', { name: /^Reaction Balancing: .*beaten/ }),
    );
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Not now',
      }),
    );
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(onPick).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole('button', { name: /^Reaction Balancing: .*beaten/ }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Restart the chamber' }),
    );
    expect(onPick).toHaveBeenCalledWith('balancing');
  });
});

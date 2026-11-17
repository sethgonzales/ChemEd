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

describe('the Alchemist’s gate on the map', () => {
  function chooseTwo(progress: Progress) {
    const onPick = jest.fn();
    render(
      <QuestMap
        setup={{ topics: ['balancing', 'lewis'], course: 'general' }}
        progress={progress}
        onPick={onPick}
        onChange={jest.fn()}
      />,
    );
    return onPick;
  }

  it('stays sealed until every chosen chamber is cleared, saying how many are', () => {
    chooseTwo({ general: { balancing: 2 } });
    expect(
      screen.getByText(
        'The Alchemist’s gate is sealed. Clear every chamber to open it: 1 of 2 cleared.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /The Alchemist/ })).toBeNull();
  });

  it('opens once they all are', async () => {
    const onPick = chooseTwo({ general: { balancing: 2, lewis: 1 } });
    await userEvent.click(
      screen.getByRole('button', {
        name: 'The Final Chamber: The Alchemist, not cleared yet',
      }),
    );
    expect(onPick).toHaveBeenCalledWith('alchemist');
  });
});
describe('the map’s layout', () => {
  it('floats its doors across the map, with no trail between them', () => {
    const { container } = render(
      <QuestMap
        setup={{ topics: ['periodic', 'lewis', 'states'], course: 'general' }}
        progress={{}}
        onPick={jest.fn()}
        onChange={jest.fn()}
      />,
    );
    expect(container.querySelectorAll('[data-trail]')).toHaveLength(0);
    const across = [...container.querySelectorAll<HTMLElement>('[data-x]')].map(
      (el) => Number(el.dataset.x),
    );
    expect(across).toHaveLength(4);
    expect(new Set(across).size).toBeGreaterThan(2);
  });

  it('floats in space, with every open door glowing', () => {
    const { container } = render(
      <QuestMap
        setup={{ topics: ['periodic', 'lewis'], course: 'general' }}
        progress={{ general: { periodic: 2 } }}
        onPick={jest.fn()}
        onChange={jest.fn()}
      />,
    );
    expect(container.querySelector('[data-decor="stars"]')).not.toBeNull();
    expect(container.querySelector('[data-decor="wall"]')).toBeNull();
    expect(container.querySelector('[data-decor="torch"]')).toBeNull();
    // both chambers glow; the sealed gate doesn't
    expect(container.querySelectorAll('[data-glow]')).toHaveLength(2);
  });

  it('shows the replay question above every door, not under them', async () => {
    const { container } = render(
      <QuestMap
        setup={{ topics: ['periodic', 'lewis'], course: 'general' }}
        progress={{ general: { periodic: 2 } }}
        onPick={jest.fn()}
        onChange={jest.fn()}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Periodic Table: .*2 of 3 stars/ }),
    );
    const z = (el: Element) =>
      Number(el.className.match(/\bz-(\d+)/)?.[1] ?? 0);
    const prompt = screen.getByRole('alertdialog');
    for (const door of container.querySelectorAll('[data-x]'))
      expect(z(prompt)).toBeGreaterThan(z(door.firstElementChild!));
  });
});

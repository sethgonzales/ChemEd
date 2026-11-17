import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DOOR_MS } from '~/components/quest-chamber';
import { DURATION_MS } from '~/components/villain';
import { findChamber } from '~/constants/quest-chambers';
import { SOURCES } from '~/constants/sources';
import DungeonQuest from '~/pages/dungeon-quest';
import { formatFormula } from '~/utils/lewis';
import {
  answer,
  begin,
  createRng,
  solveRoom,
  startChamber,
  type QuestState,
  type QuickQuestion,
} from '~/utils/quest';
import { balancingRooms } from '~/utils/quest-balancing';
import {
  loadProgress,
  loadSetup,
  saveProgress,
  saveSetup,
} from '~/utils/quest-storage';
import { parseEquation } from '~/utils/reactions';

const music: (string | null)[] = [];
const pauses: number[] = [];
jest.mock('~/utils/music-player', () => ({
  ...jest.requireActual('~/utils/music-player'),
  useMusic: (place: string | null, fight?: boolean | 'finale', pause = 0) => {
    music.push(
      place &&
        (fight === 'finale'
          ? `${place} finale`
          : fight
            ? `${place} fight`
            : place),
    );
    pauses.push(pause);
  },
}));
const chime = jest.fn();
jest.mock('~/utils/sounds', () => ({
  ...jest.requireActual('~/utils/sounds'),
  useChimeSound: () => chime,
}));
const nowPlaying = () => music.at(-1);

const chamber = findChamber('balancing')!;
const RANDOM = 0.25; // Math.random, so the page's seed is known
const SEED = Math.floor(RANDOM * 2 ** 32);

const user = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

function visit(query = '') {
  window.history.pushState({}, '', `/dungeon-quest${query}`);
  render(<DungeonQuest />);
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(Math, 'random').mockReturnValue(RANDOM);
  localStorage.clear();
  music.length = 0;
  pauses.length = 0;
  chime.mockClear();
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const storyWall = () =>
  screen.getByRole('region', { name: 'Reaction Balancing: the story' });
const door = (stars: string) =>
  screen.getByRole('button', {
    name: `Reaction Balancing: The Unbalanced Golem, ${stars}`,
  });

describe('Dungeon Quest', () => {
  it('is titled', () => {
    visit();
    expect(
      screen.getByRole('heading', { name: 'Dungeon Quest' }),
    ).toBeInTheDocument();
  });

  it('asks for the topics and course at the gate on a first visit, then remembers them', async () => {
    visit();
    await user().click(screen.getByRole('button', { name: 'AP Chemistry' }));
    await user().click(
      screen.getByRole('button', { name: 'Enter the dungeon' }),
    );
    expect(
      screen.getByRole('region', { name: 'The dungeon map' }),
    ).toBeInTheDocument();
    expect(loadSetup(['balancing'])).toEqual({
      topics: ['balancing'],
      course: 'ap',
    });
  });

  it('goes straight to the map with a saved setup, and opens a chamber’s story', async () => {
    saveSetup({ topics: ['balancing'], course: 'general' });
    visit();
    await user().click(door('not cleared yet'));
    expect(storyWall()).toBeInTheDocument();
  });

  it('fills in the gate from a teacher’s setup link', () => {
    saveSetup({ topics: ['balancing'], course: 'general' });
    visit('?topics=balancing&course=ap');
    expect(
      screen.getByRole('button', { name: 'AP Chemistry' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('has one way out of a chamber: the header’s back arrow, as Leave the chamber', async () => {
    saveSetup({ topics: ['balancing'], course: 'general' });
    visit('?chamber=balancing&course=general');
    expect(
      screen.queryByRole('link', { name: 'Back to simulations' }),
    ).toBeNull();
    const leave = screen.getAllByRole('button', { name: 'Leave the chamber' });
    expect(leave).toHaveLength(1);
    await user().click(leave[0]);
    expect(door('not cleared yet')).toBeInTheDocument();
  });

  it('starts each chamber at the top of the page', async () => {
    const scrollTo = jest
      .spyOn(window, 'scrollTo')
      .mockImplementation(() => {});
    saveSetup({ topics: ['balancing'], course: 'general' });
    visit();
    scrollTo.mockClear();
    await user().click(door('not cleared yet'));
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  });

  it('fades each screen in', async () => {
    saveSetup({ topics: ['balancing'], course: 'general' });
    visit();
    const map = document.querySelector('[data-fade]');
    expect(map).not.toBeNull();
    await user().click(door('not cleared yet'));
    expect(document.querySelector('[data-fade]')).not.toBe(map);
  });

  it('writes its description in the stylized font', () => {
    visit();
    expect(screen.getByText(/Fight through the chambers/)).toHaveClass(
      'font-pixel',
    );
  });

  it('opens one chamber’s story straight from a chamber link', () => {
    visit('?chamber=balancing&course=ap');
    expect(storyWall()).toBeInTheDocument();
  });

  it('keeps the stars from a cleared chamber, and shows them on the map, with each place’s music', async () => {
    saveSetup({ topics: ['balancing'], course: 'general' });
    visit();
    await user().click(door('not cleared yet'));
    await user().click(screen.getByRole('button', { name: 'Begin' }));

    const rooms = balancingRooms(createRng(SEED), 'general', chamber.rooms);
    for (const [room, r] of rooms.entries()) {
      const eq = parseEquation(r.equation);
      for (const [i, f] of [...eq.reactants, ...eq.products].entries()) {
        const input = screen.getByRole('textbox', {
          name: `Coefficient for ${formatFormula(f)}`,
        });
        await user().clear(input);
        await user().type(input, String(r.answer[i]));
      }
      await user().click(
        screen.getByRole('button', {
          name: room === 0 ? 'Next door' : 'Face the boss',
        }),
      );
    }
    expect(nowPlaying()).toBeNull(); // a hush as the boss's door opens
    act(() => jest.advanceTimersByTime(DOOR_MS));

    expect(nowPlaying()).toBe('balancing fight'); // the theme, quickened
    let s: QuestState<QuickQuestion> = solveRoom(
      solveRoom(begin(startChamber(chamber, 'general', SEED)), chamber),
      chamber,
    );
    while (s.stage === 'boss') {
      const q = s.question!;
      await user().click(
        within(screen.getByRole('group', { name: q.prompt })).getByRole(
          'button',
          { name: q.choices[q.answer] },
        ),
      );
      act(() => jest.advanceTimersByTime(DURATION_MS.defeat + 200));
      s = answer(s, chamber, true);
      // quicker still as the boss's last hit point is reached
      if (s.stage === 'boss')
        expect(nowPlaying()).toBe(
          s.bossHp === 1 ? 'balancing finale' : 'balancing fight',
        );
    }

    expect(loadProgress()).toEqual({ general: { balancing: 3 } });
    expect(nowPlaying()).toBe('balancing'); // calm again over the loot
    await user().click(screen.getByRole('button', { name: 'Back to the map' }));
    expect(door('beaten, 3 of 3 stars')).toBeInTheDocument();
    expect(nowPlaying()).toBe('dungeon');
  });

  it('cites where the chosen chambers’ facts come from', () => {
    saveSetup({ topics: ['periodic'], course: 'general' });
    visit();
    const sources = screen.getByRole('region', { name: 'Sources' });
    expect(sources).toHaveTextContent(SOURCES.paulingEN.title);
  });

  it('opens the Alchemist’s chamber once every chosen one is cleared, citing them all', async () => {
    saveSetup({ topics: ['periodic', 'balancing'], course: 'general' });
    saveProgress({ general: { periodic: 2, balancing: 1 } });
    visit();
    await user().click(
      screen.getByRole('button', {
        name: 'The Final Chamber: The Alchemist, not cleared yet',
      }),
    );
    expect(
      screen.getByRole('region', { name: 'The Final Chamber: the story' }),
    ).toBeInTheDocument();
    const sources = screen.getByRole('region', { name: 'Sources' });
    expect(sources).toHaveTextContent(SOURCES.paulingEN.title);
  });

  it('plays the dungeon theme, with a Music setting to turn it off', async () => {
    saveSetup({ topics: ['balancing'], course: 'general' });
    visit();
    expect(nowPlaying()).toBe('dungeon');
    await user().click(screen.getByRole('checkbox', { name: 'Music' }));
    expect(nowPlaying()).toBeNull();
  });

  it('enters a chamber with a pause in the music, a chime, then its theme', async () => {
    saveSetup({ topics: ['balancing'], course: 'general' });
    visit();
    await user().click(door('not cleared yet'));
    expect(chime).toHaveBeenCalledTimes(1);
    expect(nowPlaying()).toBe('balancing');
    expect(pauses.at(-1)).toBeGreaterThan(0);
  });

  it('plays a chamber’s own theme, not the dungeon’s', async () => {
    saveSetup({ topics: ['balancing'], course: 'general' });
    visit('?chamber=balancing&course=general');
    expect(nowPlaying()).toBe('balancing');
    await user().click(screen.getByRole('button', { name: 'Begin' }));
    expect(nowPlaying()).toBe('balancing');
  });
});

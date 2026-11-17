import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
jest.mock('~/utils/music-player', () => ({
  ...jest.requireActual('~/utils/music-player'),
  useMusic: (id: string | null) => music.push(id),
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

  it('opens one chamber’s story straight from a chamber link', () => {
    visit('?chamber=balancing&course=ap');
    expect(storyWall()).toBeInTheDocument();
  });

  it('keeps the stars from a cleared chamber, and shows them on the map', async () => {
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
    }

    expect(loadProgress()).toEqual({ general: { balancing: 3 } });
    await user().click(screen.getByRole('button', { name: 'Back to the map' }));
    expect(door('beaten, 3 of 3 stars')).toBeInTheDocument();
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
});

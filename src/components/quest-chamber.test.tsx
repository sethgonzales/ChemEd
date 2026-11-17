import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DURATION_MS } from '~/components/villain';
import { findChamber } from '~/constants/quest-chambers';
import { alchemistChamber } from '~/constants/quest-final';
import { formatFormula } from '~/utils/lewis';
import {
  MAX_HEARTS,
  answer,
  begin,
  solveRoom,
  startChamber,
  type Course,
  type QuestState,
  type QuickQuestion,
} from '~/utils/quest';
import { balancingRooms } from '~/utils/quest-balancing';
import { createRng } from '~/utils/quest';
import { parseEquation } from '~/utils/reactions';
import QuestChamber from './quest-chamber';

const sounds = {
  hit: jest.fn(),
  miss: jest.fn(),
  damage: jest.fn(),
  treasure: jest.fn(),
};
jest.mock('~/utils/sounds', () => ({
  ...jest.requireActual('~/utils/sounds'),
  useHitSound: () => sounds.hit,
  useMissSound: () => sounds.miss,
  useDamageSound: () => sounds.damage,
  useTreasureSound: () => sounds.treasure,
}));
beforeEach(() => Object.values(sounds).forEach((f) => f.mockClear()));

// Mr. G in the corner: on screen on wide screens, away on phones
const guide = { say: jest.fn(), visible: false };
jest.mock('~/components/guide', () => ({
  ...jest.requireActual('~/components/guide'),
  useGuide: () => guide,
}));
beforeEach(() => {
  guide.say.mockClear();
  guide.visible = false;
});

const chamber = findChamber('balancing')!;
const SEED = 7;

const user = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

function setup(course: Course = 'general') {
  const onClear = jest.fn();
  const onExit = jest.fn();
  const onReplay = jest.fn();
  render(
    <QuestChamber
      chamber={chamber}
      course={course}
      seed={SEED}
      onClear={onClear}
      onExit={onExit}
      onReplay={onReplay}
    />,
  );
  return { onClear, onExit, onReplay };
}

// Types the room's balanced coefficients into the balancer
async function solve(room: number, course: Course = 'general') {
  const r = balancingRooms(createRng(SEED), course, chamber.rooms)[room];
  const eq = parseEquation(r.equation);
  const formulas = [...eq.reactants, ...eq.products];
  for (const [i, f] of formulas.entries()) {
    const input = screen.getByRole('textbox', {
      name: `Coefficient for ${formatFormula(f)}`,
    });
    await user().clear(input);
    await user().type(input, String(r.answer[i]));
  }
}

// The same chamber played alongside, so the test knows each right answer
function atBoss(course: Course = 'general') {
  let s = begin(startChamber(chamber, course, SEED));
  s = solveRoom(s, chamber);
  return solveRoom(s, chamber);
}

async function walkToBoss() {
  await user().click(screen.getByRole('button', { name: 'Begin' }));
  await solve(0);
  await user().click(screen.getByRole('button', { name: 'Next door' }));
  await solve(1);
  await user().click(screen.getByRole('button', { name: 'Face the boss' }));
}

const choice = (q: QuickQuestion, i: number) =>
  within(screen.getByRole('group', { name: q.prompt })).getByRole('button', {
    name: q.choices[i],
  });

async function pickAnswer(s: QuestState<QuickQuestion>, right: boolean) {
  const q = s.question!;
  const i = right ? q.answer : (q.answer + 1) % q.choices.length;
  await user().click(choice(q, i));
  act(() => jest.advanceTimersByTime(DURATION_MS.attack + 200));
  return answer(s, chamber, right);
}

const hp = () =>
  screen.getByRole('meter', { name: 'The Unbalanced Golem’s HP' });
const hearts = () => screen.getByLabelText(/hearts left/);

describe('a quest chamber', () => {
  it('opens on Mr. G’s story wall', () => {
    setup();
    expect(screen.getByText(chamber.story[0])).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Begin' })).toBeInTheDocument();
  });

  it('leads through each room, opening the next door once it’s balanced', async () => {
    setup();
    await user().click(screen.getByRole('button', { name: 'Begin' }));
    expect(
      screen.getByRole('heading', { name: 'Room 1 of 2: The bridge' }),
    ).toBeInTheDocument();
    expect(screen.getByText(chamber.doors[0].story)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Next door' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Show answer' }),
    ).not.toBeInTheDocument();

    await solve(0);
    await user().click(screen.getByRole('button', { name: 'Next door' }));
    expect(
      screen.getByRole('heading', { name: 'Room 2 of 2: The door seal' }),
    ).toBeInTheDocument();

    await solve(1);
    await user().click(screen.getByRole('button', { name: 'Face the boss' }));
    expect(
      screen.getByRole('img', { name: 'The Unbalanced Golem' }),
    ).toBeInTheDocument();
  });

  it('sets each room’s puzzle inside the chamber’s scene, not in a box below it', async () => {
    setup();
    await user().click(screen.getByRole('button', { name: 'Begin' }));
    const scene = screen.getByRole('region', { name: 'Room 1 of 2' });
    expect(within(scene).getAllByRole('textbox').length).toBeGreaterThan(0);
  });

  it('asks the boss’s question, with its HP and the student’s hearts', async () => {
    setup();
    await walkToBoss();
    const s = atBoss();
    expect(
      screen.getByRole('group', { name: s.question!.prompt }),
    ).toBeInTheDocument();
    expect(hp()).toHaveAttribute('aria-valuenow', String(chamber.bossHp));
    expect(hearts()).toHaveAccessibleName(
      `${MAX_HEARTS} of ${MAX_HEARTS} hearts left`,
    );
  });

  it('hits the boss for a right answer, and asks the next question', async () => {
    setup();
    await walkToBoss();
    const next = await pickAnswer(atBoss(), true);
    expect(hp()).toHaveAttribute('aria-valuenow', String(chamber.bossHp - 1));
    expect(screen.getByRole('status')).toHaveTextContent('Hit!');
    expect(
      screen.getByRole('group', { name: next.question!.prompt }),
    ).toBeInTheDocument();
  });

  it('costs a heart for a wrong answer, and Mr. G explains it in his speech bubble, not in the scene', async () => {
    guide.visible = true;
    setup();
    await walkToBoss();
    const s = atBoss();
    await pickAnswer(s, false);
    expect(hearts()).toHaveAccessibleName(
      `${MAX_HEARTS - 1} of ${MAX_HEARTS} hearts left`,
    );
    expect(guide.say).toHaveBeenCalledWith(s.question!.explain, 'tip');
    const scene = screen.getByRole('region', { name: /chamber/ });
    expect(scene).not.toHaveTextContent(s.question!.explain);
  });

  it('on a phone, where Mr. G isn’t in the corner, has him explain beside his own small sprite', async () => {
    setup();
    await walkToBoss();
    const s = atBoss();
    await pickAnswer(s, false);
    expect(screen.getByRole('note', { name: 'Mr. G' })).toHaveTextContent(
      s.question!.explain,
    );
    expect(screen.getByRole('status')).not.toHaveTextContent(
      s.question!.explain,
    );
  });

  it('leads into each question with what it’s about, before asking it', async () => {
    setup();
    await walkToBoss();
    const q = atBoss().question!;
    const about = screen.getByText(q.about);
    const prompt = screen.getByText(q.prompt);
    expect(
      about.compareDocumentPosition(prompt) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  describe('losing the last heart', () => {
    async function knockedOut() {
      const props = setup();
      await walkToBoss();
      let s = atBoss();
      s = await pickAnswer(s, true);
      for (let i = 0; i < MAX_HEARTS; i++) s = await pickAnswer(s, false);
      return props;
    }

    it('is game over: no more questions, and the hearts don’t come back by themselves', async () => {
      await knockedOut();
      expect(
        screen.getByRole('heading', { name: 'Game over' }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('group')).toBeNull();
      act(() => jest.advanceTimersByTime(10_000));
      expect(
        screen.getByRole('heading', { name: 'Game over' }),
      ).toBeInTheDocument();
    });

    it('fights the boss again from full hearts and HP', async () => {
      await knockedOut();
      await user().click(screen.getByRole('button', { name: 'Fight again' }));
      expect(hp()).toHaveAttribute('aria-valuenow', String(chamber.bossHp));
      expect(hearts()).toHaveAccessibleName(
        `${MAX_HEARTS} of ${MAX_HEARTS} hearts left`,
      );
      expect(screen.getByRole('group')).toBeInTheDocument();
    });

    it('can restart the whole chamber, or go back to the map', async () => {
      const { onReplay, onExit } = await knockedOut();
      await user().click(
        screen.getByRole('button', { name: 'Restart the chamber' }),
      );
      expect(onReplay).toHaveBeenCalled();
      await user().click(
        screen.getByRole('button', { name: 'Back to the map' }),
      );
      expect(onExit).toHaveBeenCalled();
    });
  });

  it('ends with the boss beaten, the stars won, and the way back to the map', async () => {
    const { onClear, onExit, onReplay } = setup();
    await walkToBoss();
    let s = atBoss();
    s = await pickAnswer(s, false); // one heart lost
    while (s.stage === 'boss') s = await pickAnswer(s, true);
    act(() => jest.advanceTimersByTime(DURATION_MS.defeat + 200));

    expect(
      screen.getByRole('heading', { name: 'Chamber cleared!' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('2 of 3 stars')).toBeInTheDocument();
    expect(onClear).toHaveBeenCalledWith(2);

    await user().click(screen.getByRole('button', { name: 'Play again' }));
    expect(onReplay).toHaveBeenCalled();
    await user().click(screen.getByRole('button', { name: 'Back to the map' }));
    expect(onExit).toHaveBeenCalled();
  });
});

describe('developer shortcuts', () => {
  function devSetup(devTools: boolean) {
    render(
      <QuestChamber
        chamber={chamber}
        course="general"
        seed={SEED}
        onClear={jest.fn()}
        onExit={jest.fn()}
        onReplay={jest.fn()}
        devTools={devTools}
      />,
    );
  }

  it('skip rooms and land hits or misses without answering', async () => {
    devSetup(true);
    await user().click(screen.getByRole('button', { name: 'Begin' }));
    await user().click(screen.getByRole('button', { name: 'Solve (dev)' }));
    await user().click(screen.getByRole('button', { name: 'Next door' }));
    await user().click(screen.getByRole('button', { name: 'Solve (dev)' }));
    await user().click(screen.getByRole('button', { name: 'Face the boss' }));

    await user().click(screen.getByRole('button', { name: 'Hit (dev)' }));
    act(() => jest.advanceTimersByTime(DURATION_MS.attack + 200));
    expect(hp()).toHaveAttribute('aria-valuenow', String(chamber.bossHp - 1));
    await user().click(screen.getByRole('button', { name: 'Miss (dev)' }));
    act(() => jest.advanceTimersByTime(DURATION_MS.attack + 200));
    expect(hearts()).toHaveAccessibleName(
      `${MAX_HEARTS - 1} of ${MAX_HEARTS} hearts left`,
    );
  });

  it('stay hidden outside development', async () => {
    devSetup(false);
    await user().click(screen.getByRole('button', { name: 'Begin' }));
    expect(screen.queryByRole('button', { name: /\(dev\)/ })).toBeNull();
  });
});

describe('the chamber’s backdrop', () => {
  it('dresses every scene for its boss: story, rooms and fight', async () => {
    const { container } = render(
      <QuestChamber
        chamber={chamber}
        course="general"
        seed={SEED}
        onClear={jest.fn()}
        onExit={jest.fn()}
        onReplay={jest.fn()}
      />,
    );
    const decor = () => container.querySelectorAll('[data-decor="cracks"]');
    expect(decor()).toHaveLength(1);
    await user().click(screen.getByRole('button', { name: 'Begin' }));
    expect(decor()).toHaveLength(1);
    await solve(0);
    await user().click(screen.getByRole('button', { name: 'Next door' }));
    await solve(1);
    await user().click(screen.getByRole('button', { name: 'Face the boss' }));
    expect(decor()).toHaveLength(1);
  });
});

describe('the fight’s sounds', () => {
  it('strike the boss for a right answer', async () => {
    setup();
    await walkToBoss();
    await pickAnswer(atBoss(), true);
    expect(sounds.hit).toHaveBeenCalledTimes(1);
    expect(sounds.damage).not.toHaveBeenCalled();
  });

  it('miss for a wrong one, then take damage as the boss’s attack lands', async () => {
    setup();
    await walkToBoss();
    const q = atBoss().question!;
    await user().click(choice(q, (q.answer + 1) % q.choices.length));
    expect(sounds.miss).toHaveBeenCalledTimes(1);
    expect(sounds.damage).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(DURATION_MS.attack));
    expect(sounds.damage).toHaveBeenCalledTimes(1);
    expect(sounds.hit).not.toHaveBeenCalled();
  });

  it('play the treasure on the loot screen', async () => {
    setup();
    await walkToBoss();
    let s = atBoss();
    while (s.stage === 'boss') {
      await pickAnswer(s, true);
      s = answer(s, chamber, true);
      act(() => jest.advanceTimersByTime(DURATION_MS.defeat + 200));
    }
    expect(sounds.treasure).toHaveBeenCalledTimes(1);
  });
});

describe('the chamber’s stage', () => {
  it('is reported as it changes, with the boss’s HP, so the music can follow the fight', async () => {
    const onStage = jest.fn();
    render(
      <QuestChamber
        chamber={chamber}
        course="general"
        seed={SEED}
        onClear={jest.fn()}
        onExit={jest.fn()}
        onReplay={jest.fn()}
        onStage={onStage}
      />,
    );
    expect(onStage).toHaveBeenLastCalledWith('story', expect.any(Number));
    await walkToBoss();
    expect(onStage).toHaveBeenLastCalledWith('boss', expect.any(Number));
  });
});

describe('the Alchemist’s chamber', () => {
  const final = alchemistChamber(['balancing'], 'general', SEED);

  it('plays its trials with rooms borrowed from the chosen chambers, then names each question’s topic', async () => {
    render(
      <QuestChamber
        chamber={final}
        course="general"
        seed={SEED}
        onClear={jest.fn()}
        onExit={jest.fn()}
        onReplay={jest.fn()}
      />,
    );
    await user().click(screen.getByRole('button', { name: 'Begin' }));
    expect(
      screen.getByRole('heading', {
        name: 'Room 1 of 2: Trial 1: The Unbalanced Golem’s puzzle',
      }),
    ).toBeInTheDocument();
    await solve(0);
    await user().click(screen.getByRole('button', { name: 'Next door' }));
    await solve(1);
    await user().click(screen.getByRole('button', { name: 'Face the boss' }));
    expect(
      screen.getByRole('img', { name: 'The Alchemist' }),
    ).toBeInTheDocument();
    expect(screen.getByText('From Reaction Balancing')).toBeInTheDocument();
  });
});

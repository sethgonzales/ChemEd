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

  it('costs a heart for a wrong answer, and Mr. G explains the one missed', async () => {
    setup();
    await walkToBoss();
    const s = atBoss();
    await pickAnswer(s, false);
    expect(hearts()).toHaveAccessibleName(
      `${MAX_HEARTS - 1} of ${MAX_HEARTS} hearts left`,
    );
    expect(screen.getByRole('status')).toHaveTextContent(s.question!.explain);
  });

  it('starts the fight over with full hearts after the last one is lost', async () => {
    setup();
    await walkToBoss();
    let s = atBoss();
    s = await pickAnswer(s, true);
    for (let i = 0; i < MAX_HEARTS; i++) s = await pickAnswer(s, false);
    expect(hp()).toHaveAttribute('aria-valuenow', String(chamber.bossHp));
    expect(hearts()).toHaveAccessibleName(
      `${MAX_HEARTS} of ${MAX_HEARTS} hearts left`,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/knocked you down/);
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

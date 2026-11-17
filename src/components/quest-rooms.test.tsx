import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ELEMENTS } from '~/constants/elements';
import { createRng } from '~/utils/quest';
import { ionSymbol } from '~/utils/electron-configurations';
import { configurationRooms } from '~/utils/quest-electrons';
import { elementRiddle } from '~/utils/quest-periodic';
import { formatFormula } from '~/utils/lewis';
import { lewisRooms } from '~/utils/quest-lewis';
import { goalMet, statesRooms } from '~/utils/quest-states';
import { PREDICT_POOL, predict } from '~/utils/predict';
import { reactionRooms } from '~/utils/quest-reactions';
import { titrationPool } from '~/utils/quest-titrations';
import { analyzeCell, coupleFor, newChallenge } from '~/utils/electrochemistry';
import { ROOMS, lewisOpens, roomRng } from './quest-rooms';

const sounds = { miss: jest.fn() };
jest.mock('~/utils/sounds', () => ({
  ...jest.requireActual('~/utils/sounds'),
  useMissSound: () => sounds.miss,
}));
beforeEach(() => sounds.miss.mockClear());

const SEED = 9;
const PeriodicRoom = ROOMS.periodic;

function setup(room: number, course: 'general' | 'ap' = 'general') {
  const onSolve = jest.fn();
  render(
    <PeriodicRoom
      seed={SEED}
      course={course}
      room={room}
      rooms={2}
      onSolve={onSolve}
    />,
  );
  return { onSolve, riddle: elementRiddle(roomRng(SEED, room), course, room) };
}

const answerButton = () =>
  screen.getByRole('button', { name: 'That’s my answer' });

describe('the Periodic Table’s rooms', () => {
  it('ask the Sphinx’s riddle, answered by picking an element on the table', async () => {
    const { onSolve, riddle } = setup(0);
    expect(screen.getByText(riddle.prompt)).toBeInTheDocument();
    expect(answerButton()).toBeDisabled();
    await userEvent.click(
      screen.getByRole('button', { name: riddle.answer.name }),
    );
    await userEvent.click(answerButton());
    expect(onSolve).toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(riddle.answer.name);
  });

  it('say what a wrong pick is instead, and let the student try again', async () => {
    const { onSolve, riddle } = setup(1, 'ap');
    const wrong = ELEMENTS.find((e) => !riddle.fits(e) && e.atomicNumber < 30)!;
    await userEvent.click(screen.getByRole('button', { name: wrong.name }));
    await userEvent.click(answerButton());
    expect(onSolve).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(riddle.hint(wrong));
    await userEvent.click(
      screen.getByRole('button', { name: riddle.answer.name }),
    );
    await userEvent.click(answerButton());
    expect(onSolve).toHaveBeenCalled();
  });

  it('make a wrong pick unmistakable: a miss, a “Not quite!”, and the element crossed out', async () => {
    const { riddle } = setup(1, 'ap');
    const wrong = ELEMENTS.find((e) => !riddle.fits(e) && e.atomicNumber < 30)!;
    await userEvent.click(screen.getByRole('button', { name: wrong.name }));
    await userEvent.click(answerButton());
    expect(screen.getByRole('status')).toHaveTextContent(/Not quite!/);
    expect(sounds.miss).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: `${wrong.name}, not it` }),
    ).toBeInTheDocument();
  });

  it('keep the answer button and its verdict right under the table', () => {
    setup(0);
    const table = screen.getByRole('button', { name: 'Hydrogen' });
    const after = (a: Element, b: Element) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(after(table, answerButton())).toBeTruthy();
    expect(after(table, screen.getByRole('status'))).toBeTruthy();
    // no Stage of its own: the table stands in the chamber's scene
    expect(screen.queryByRole('region', { name: 'Periodic table' })).toBeNull();
  });

  it('give each room its own riddle', () => {
    expect(roomRng(SEED, 0)()).not.toBe(roomRng(SEED, 1)());
    expect(roomRng(SEED, 0)()).toBe(createRng(SEED)());
  });
});

describe('the Electron Configurations rooms', () => {
  const ElectronRoom = ROOMS.electrons;

  it.each([
    ['general', 0],
    ['general', 1],
    ['ap', 0],
    ['ap', 1],
  ] as const)(
    'ask the %s course to draw room %i’s atom or ion, with no answer to show',
    (course, room) => {
      render(
        <ElectronRoom
          seed={SEED}
          course={course}
          room={room}
          rooms={2}
          onSolve={jest.fn()}
        />,
      );
      const { element, charge } = configurationRooms(createRng(SEED), course)[
        room
      ];
      const label = charge ? ionSymbol(element.symbol, charge) : element.name;
      expect(
        screen.getByText(new RegExp(`^Draw ${label}:`)),
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Show answer' })).toBeNull();
    },
  );

  it('stays shut until the drawing checks out', async () => {
    const onSolve = jest.fn();
    render(
      <ElectronRoom
        seed={SEED}
        course="general"
        room={0}
        rooms={2}
        onSolve={onSolve}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(onSolve).not.toHaveBeenCalled();
  });
});

describe('the Lewis Structures rooms', () => {
  const LewisRoom = ROOMS.lewis;

  it.each([
    ['general', 0],
    ['ap', 1],
  ] as const)(
    'ask the %s course to draw room %i’s molecule',
    (course, room) => {
      render(
        <LewisRoom
          seed={SEED}
          course={course}
          room={room}
          rooms={2}
          onSolve={jest.fn()}
        />,
      );
      const m = lewisRooms(createRng(SEED), course)[room];
      expect(
        screen.getByRole('heading', {
          name: `${m.name}, ${formatFormula(m.formula, m.charge)}`,
        }),
      ).toBeInTheDocument();
    },
  );

  it('starts on a blank page, so the whole structure is the student’s', () => {
    render(
      <LewisRoom
        seed={SEED}
        course="general"
        room={0}
        rooms={2}
        onSolve={jest.fn()}
      />,
    );
    expect(screen.queryAllByLabelText(/ atom: /)).toHaveLength(0);
  });

  it('opens for a best or accepted structure, not one that’s only almost there', () => {
    expect(lewisOpens('best')).toBe(true);
    expect(lewisOpens('accepted')).toBe(true);
    expect(lewisOpens('valid')).toBe(false);
    expect(lewisOpens('invalid')).toBe(false);
  });
});

describe('the States of Matter rooms', () => {
  const StatesRoom = ROOMS.states;
  const room = statesRooms(createRng(SEED), 'ap')[1]; // a transition point
  const setup = () => {
    const onSolve = jest.fn();
    render(
      <StatesRoom
        seed={SEED}
        course="ap"
        room={1}
        rooms={2}
        onSolve={onSolve}
      />,
    );
    return onSolve;
  };
  const answer = () =>
    userEvent.click(screen.getByRole('button', { name: 'That’s my answer' }));
  const setTo = (t: number) =>
    fireEvent.change(screen.getByRole('slider'), {
      target: { value: String(t) },
    });

  it('sets the goal over the heating curve, without naming the phase', () => {
    setup();
    expect(
      screen.getByText(
        new RegExp(`^Set ${room.substance.name.toLowerCase()} to its`, 'i'),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /heating curve/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(`${room.start} °C`)).toBeInTheDocument();
  });

  it('stays shut until the thermometer reaches the goal', async () => {
    const onSolve = setup();
    await answer();
    expect(onSolve).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(/Not quite!/);
    expect(sounds.miss).toHaveBeenCalledTimes(1);
    const point =
      room.goal.kind === 'point' && room.goal.point === 'melting'
        ? room.substance.meltC
        : room.substance.boilC;
    setTo(Math.round(point));
    expect(goalMet(room, Math.round(point))).toBe(true);
    await answer();
    expect(onSolve).toHaveBeenCalled();
  });
});

describe('the Chemical Reactions rooms', () => {
  const ReactionRoom = ROOMS.reactions;

  it.each(['general', 'ap'] as const)(
    'deal the %s course its room’s reactants, balancing only for AP',
    (course) => {
      render(
        <ReactionRoom
          seed={SEED}
          course={course}
          room={0}
          rooms={2}
          onSolve={jest.fn()}
        />,
      );
      const pair = PREDICT_POOL[reactionRooms(createRng(SEED))[0]];
      const equation = screen.getByRole('group', { name: 'Equation' });
      for (const r of predict(pair).reactants)
        expect(equation).toHaveTextContent(formatFormula(r.formula));
      const coefficients = screen.queryAllByRole('textbox', {
        name: /coefficient/i,
      });
      expect(coefficients.length > 0).toBe(course === 'ap');
    },
  );

  it('stays shut when a reaction is missed', async () => {
    const onSolve = jest.fn();
    render(
      <ReactionRoom
        seed={SEED}
        course="general"
        room={0}
        rooms={2}
        onSolve={onSolve}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'No reaction' }));
    expect(onSolve).not.toHaveBeenCalled();
  });
});

describe('the Titrations rooms', () => {
  const TitrationRoom = ROOMS.titrations;

  it.each(['general', 'ap'] as const)(
    'give the %s course an unknown from its own pool',
    (course) => {
      render(
        <TitrationRoom
          seed={SEED}
          course={course}
          room={0}
          rooms={2}
          onSolve={jest.fn()}
        />,
      );
      const names = titrationPool(course).map((a) => a.name.toLowerCase());
      const flask = screen.getByText(/^Flask:/);
      expect(names.some((n) => flask.textContent!.includes(n))).toBe(true);
    },
  );
});

describe('the Electrochemistry rooms', () => {
  const VoltaicRoom = ROOMS.electrochemistry;
  const cell = newChallenge(roomRng(SEED, 0));
  const reading = analyzeCell(cell);
  const setup = () => {
    const onSolve = jest.fn();
    render(
      <VoltaicRoom
        seed={SEED}
        course="general"
        room={0}
        rooms={2}
        onSolve={onSolve}
      />,
    );
    return onSolve;
  };
  const predict = async (anode: 'left' | 'right', volts: number) => {
    const metal = coupleFor(cell[anode].electrode).metal;
    await userEvent.click(
      screen.getByRole('radio', { name: `${metal} (${anode})` }),
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Cell voltage (V)' }),
      volts.toFixed(2),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Check' }));
  };

  it('sets up a cell of two metals, with the table of potentials to use', () => {
    setup();
    expect(
      screen.getByRole('group', { name: 'Which is the anode?' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: /Standard reduction potentials/ }),
    ).toBeInTheDocument();
  });

  it('opens for the right anode and voltage, not the wrong anode', async () => {
    const onSolve = setup();
    const other = reading.anode === 'left' ? 'right' : 'left';
    await predict(other, reading.standardVoltage!);
    expect(onSolve).not.toHaveBeenCalled();
  });

  it('opens for a right prediction', async () => {
    const onSolve = setup();
    await predict(reading.anode!, reading.standardVoltage!);
    expect(onSolve).toHaveBeenCalled();
  });
});

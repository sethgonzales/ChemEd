import { act, render as renderBare, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ThemeProvider } from '~/styles/theme-provider';
import userEvent from '@testing-library/user-event';
import { ELEMENTS } from '~/constants/elements';
import { createRng } from '~/utils/quest';
import { ionSymbol } from '~/utils/electron-configurations';
import { configurationRooms } from '~/utils/quest-electrons';
import { elementRiddle } from '~/utils/quest-periodic';
import { formatFormula } from '~/utils/lewis';
import { lewisRooms } from '~/utils/quest-lewis';
import { statesRooms } from '~/utils/quest-states';
import { PARTICLE_MOTION, phaseOf } from '~/utils/states-of-matter';
import { PREDICT_POOL, predict } from '~/utils/predict';
import { reactionRooms } from '~/utils/quest-reactions';
import { titrationPool } from '~/utils/quest-titrations';
import { newUnknown } from '~/utils/titrations';
import { ANALYTE_VOLUME, TITRANT_CONCENTRATION } from '~/constants/titrations';
import { analyzeCell, coupleFor, newChallenge } from '~/utils/electrochemistry';
import { CheckSlot, type SlotCheck } from './check-slot';
import { ROOMS, lewisOpens, roomRng } from './quest-rooms';

const assessed = jest.fn();
jest.mock('~/utils/lewis-arrows', () => {
  const actual = jest.requireActual('~/utils/lewis-arrows');
  return {
    ...actual,
    assessResonance: (...args: unknown[]) => {
      assessed(...args);
      return actual.assessResonance(...args);
    },
  };
});

// the States room's particles take their colour from the theme, as in the app
const render = (ui: ReactElement) => renderBare(ui, { wrapper: ThemeProvider });

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
    ['general', 1],
    ['ap', 0],
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
      const r = lewisRooms(createRng(SEED), course)[room];
      if (r.kind !== 'draw') throw new Error('a drawing');
      const m = r.molecule;
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

  it('grades the drawing without asking for formal-charge marks', async () => {
    render(
      <LewisRoom
        seed={SEED}
        course="ap"
        room={0}
        rooms={2}
        onSolve={jest.fn()}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Check your work' }),
    );
    expect(assessed).toHaveBeenCalled();
    expect(assessed.mock.calls.at(-1)![2]).toEqual({ chargeMarks: false });
  });

  describe('AP’s last room: the best structure by formal charge', () => {
    const choice = () => {
      const r = lewisRooms(createRng(SEED), 'ap')[1];
      if (r.kind !== 'choose') throw new Error('a choice');
      return r;
    };
    const renderChoice = () => {
      const onSolve = jest.fn();
      const onMiss = jest.fn();
      render(
        <LewisRoom
          seed={SEED}
          course="ap"
          room={1}
          rooms={2}
          onSolve={onSolve}
          onMiss={onMiss}
        />,
      );
      return { onSolve, onMiss, ...choice() };
    };
    const option = (i: number) =>
      screen.getByRole('radio', {
        name: new RegExp(`Structure ${'ABC'[i]}`),
      });

    it('shows the molecule’s structures to choose from, their formal charges hidden', () => {
      const { molecule, options } = renderChoice();
      expect(
        screen.getByRole('heading', {
          name: new RegExp(formatFormula(molecule.formula, molecule.charge)),
        }),
      ).toBeInTheDocument();
      expect(screen.getAllByRole('radio')).toHaveLength(options.length);
      expect(screen.queryByText(/formal charges add up/i)).toBeNull();
    });

    it('opens for the best structure', async () => {
      const { onSolve, best } = renderChoice();
      await userEvent.click(option(best));
      await userEvent.click(
        screen.getByRole('button', { name: 'That’s my answer' }),
      );
      expect(onSolve).toHaveBeenCalled();
      expect(screen.getByRole('status')).toHaveTextContent(/formal charge/i);
    });

    it('shakes the door at a worse one, and shows every structure’s formal charges', async () => {
      const { onSolve, onMiss, best } = renderChoice();
      await userEvent.click(option(best === 0 ? 1 : 0));
      await userEvent.click(
        screen.getByRole('button', { name: 'That’s my answer' }),
      );
      expect(onSolve).not.toHaveBeenCalled();
      expect(onMiss).toHaveBeenCalled();
      expect(screen.getByRole('status')).toHaveTextContent(/Not quite/);
      expect(
        screen.getAllByText(/formal charges add up/i).length,
      ).toBeGreaterThan(1);
    });
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
  const setup = (room: number, course: 'general' | 'ap' = 'general') => {
    const onSolve = jest.fn();
    const onMiss = jest.fn();
    render(
      <StatesRoom
        seed={SEED}
        course={course}
        room={room}
        rooms={3}
        onSolve={onSolve}
        onMiss={onMiss}
      />,
    );
    return {
      onSolve,
      onMiss,
      room: statesRooms(createRng(SEED), course)[room],
    };
  };
  const answer = () =>
    userEvent.click(screen.getByRole('button', { name: 'That’s my answer' }));
  const choose = (text: string) =>
    userEvent.click(screen.getByRole('radio', { name: text }));

  it('shows unlabelled particles, describing only how they move', () => {
    const { room } = setup(0);
    if (room.kind !== 'particles') throw new Error('particles');
    const picture = screen.getByRole('img', { name: /particles/i });
    expect(picture).toHaveAccessibleName(
      expect.stringContaining(
        PARTICLE_MOTION[phaseOf(room.substance, room.tempC)],
      ),
    );
    expect(picture).not.toHaveAccessibleName(/solid|liquid|gas|°C/i);
    expect(screen.getByText(room.question.prompt)).toBeInTheDocument();
  });

  it('opens for the right state, and explains a wrong one', async () => {
    const { onSolve, onMiss, room } = setup(0);
    const { question } = room;
    const wrong = question.choices.find((_, i) => i !== question.answer)!;
    await choose(wrong);
    await answer();
    expect(onSolve).not.toHaveBeenCalled();
    expect(onMiss).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent(/Not quite!/);
    expect(screen.getByRole('status')).toHaveTextContent(question.explain);
    await choose(question.choices[question.answer]);
    await answer();
    expect(onSolve).toHaveBeenCalled();
  });

  it('asks its curve question over a lettered heating curve', () => {
    const { room } = setup(1);
    expect(
      screen.getByRole('img', { name: /segments A to E/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(room.question.prompt)).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(
      room.question.choices.length,
    );
  });

  it('asks how the states differ, with no picture to read', () => {
    const { room } = setup(2, 'ap');
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText(room.question.prompt)).toBeInTheDocument();
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

describe('the Titrations rooms, as data and a finished curve', () => {
  const TitrationRoom = ROOMS.titrations;
  const { analyte, concentration } = newUnknown(
    roomRng(SEED, 0),
    titrationPool('general'),
  );
  const equivalence = (concentration * ANALYTE_VOLUME) / TITRANT_CONCENTRATION;
  const setup = () => {
    const onSolve = jest.fn();
    render(
      <TitrationRoom
        seed={SEED}
        course="general"
        room={0}
        rooms={2}
        onSolve={onSolve}
      />,
    );
    return onSolve;
  };
  const answer = async (value: string) => {
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Concentration (M)' }),
      value,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Check' }));
  };

  it('shows the finished curve and its data, with no burette to pour', () => {
    setup();
    expect(
      screen.getByRole('img', {
        name: new RegExp(`Equivalence point at ${equivalence.toFixed(2)} mL`),
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(new RegExp(analyte.name, 'i'))).toBeInTheDocument();
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.queryByRole('button', { name: /drop|pour/i })).toBeNull();
  });

  it('opens for the right concentration', async () => {
    const onSolve = setup();
    await answer(concentration.toFixed(4));
    expect(onSolve).toHaveBeenCalled();
  });

  it('stays shut for a slip in the maths, saying so', async () => {
    const onSolve = setup();
    await answer((concentration * 2).toFixed(4));
    expect(onSolve).not.toHaveBeenCalled();
    expect(screen.getByText(/Not quite/)).toBeInTheDocument();
  });
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

describe('every room with a check tells its door of a miss', () => {
  it.each([
    [
      'periodic',
      async () => {
        const riddle = elementRiddle(roomRng(SEED, 0), 'general', 0);
        const wrong = ELEMENTS.find(
          (e) => !riddle.fits(e) && e.atomicNumber < 30,
        )!;
        await userEvent.click(screen.getByRole('button', { name: wrong.name }));
        await userEvent.click(
          screen.getByRole('button', { name: 'That’s my answer' }),
        );
      },
    ],
    [
      'states',
      async () => {
        const { question } = statesRooms(createRng(SEED), 'general')[0];
        const wrong = question.choices.find((_, i) => i !== question.answer)!;
        await userEvent.click(screen.getByRole('radio', { name: wrong }));
        await userEvent.click(
          screen.getByRole('button', { name: 'That’s my answer' }),
        );
      },
    ],
    [
      'titrations',
      async () => {
        await userEvent.type(
          screen.getByRole('textbox', { name: 'Concentration (M)' }),
          '9',
        );
        await userEvent.click(screen.getByRole('button', { name: 'Check' }));
      },
    ],
  ] as const)('%s', async (id, miss) => {
    const Room = ROOMS[id];
    const onMiss = jest.fn();
    render(
      <Room
        seed={SEED}
        course="general"
        room={0}
        rooms={2}
        onSolve={jest.fn()}
        onMiss={onMiss}
      />,
    );
    await miss();
    expect(onMiss).toHaveBeenCalledTimes(1);
  });
});

describe('in a room beside its door', () => {
  // the room's own check, which goes on the door instead
  const CHECKS: Record<string, string | null> = {
    periodic: 'That’s my answer',
    states: 'That’s my answer',
    electrons: 'Check',
    lewis: 'Check your work',
    reactions: 'Check',
    titrations: 'Check',
    electrochemistry: 'Check',
    balancing: null, // it opens by itself once balanced
  };

  it.each(Object.entries(CHECKS))(
    '%s hands its check to the door, and draws no button of its own',
    async (id, label) => {
      const Room = ROOMS[id];
      let check: SlotCheck | null = null;
      render(
        <CheckSlot onChange={(c) => (check = c)}>
          <Room
            seed={SEED}
            course="general"
            room={0}
            rooms={2}
            onSolve={jest.fn()}
          />
        </CheckSlot>,
      );
      await act(async () => {}); // rooms dealt after mount
      if (label === null) {
        expect(check).toBeNull();
        return;
      }
      expect(check!.label).toBe(label);
      expect(screen.queryByRole('button', { name: label })).toBeNull();
    },
  );
});

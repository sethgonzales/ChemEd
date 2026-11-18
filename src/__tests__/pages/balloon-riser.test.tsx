import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SOURCES } from '~/constants/sources';
import { FADE_OUT_MS } from '~/components/fade-swap';
import BalloonRiser, { DIP_MS, FLIGHT_MS } from '~/pages/balloon-riser';
import { ask } from '~/utils/balloon-briefings';
import { gasLeg, startLevel as newGame } from '~/utils/balloon-game';
import {
  avogadroLeg,
  boyleLeg,
  charlesLeg,
  combinedLeg,
  idealLeg,
  gayLussacLeg,
  rightAnswer,
  tieOffVolume,
} from '~/utils/balloon-legs';

const SEED_RANDOM = 0.25; // Math.random, so the page's seed is known
const seed = Math.floor(SEED_RANDOM * 2 ** 31);

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(Math, 'random').mockReturnValue(SEED_RANDOM);
  localStorage.clear();
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const user = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

async function startBoyle(u: ReturnType<typeof user>) {
  render(<BalloonRiser />);
  await u.click(screen.getByRole('button', { name: 'General Chemistry' }));
  await u.click(screen.getByRole('button', { name: /^Boyle’s law/ }));
  act(() => jest.advanceTimersByTime(DIP_MS)); // the scene dips to the new leg
}

async function answer(u: ReturnType<typeof user>, value: number) {
  await u.type(
    screen.getByRole('textbox', { name: 'Volume to tie off at' }),
    String(Math.round(value)),
  );
  await u.click(screen.getByRole('button', { name: 'Tie off and fly' }));
  act(() => jest.advanceTimersByTime(FLIGHT_MS + 500));
}

describe('Balloon Riser page', () => {
  it('asks for the course, then offers every level, the AP ones too', async () => {
    const u = user();
    render(<BalloonRiser />);
    await u.click(screen.getByRole('button', { name: 'AP Chemistry' }));
    expect(screen.getByRole('button', { name: /^Boyle’s law/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^Free flight/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^Real gases/ })).toBeEnabled();
  });

  it('has Mr. G brief the first leg, in the basket and on the radio', async () => {
    await startBoyle(user());
    expect(screen.getByText(/Next stop: Red Mesa/)).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /Mr\. G in the balloon’s basket/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Leg 1 of 3')).toBeInTheDocument();
  });

  it('flies a right answer onto the next platform', async () => {
    const u = user();
    await startBoyle(u);
    await answer(u, tieOffVolume(boyleLeg(0, seed)));
    expect(screen.getByText('We’re down on Red Mesa!')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Next leg' }));
    act(() => jest.advanceTimersByTime(DIP_MS)); // the scene dips to the new leg
    expect(screen.getByText(/Next stop: Eagle Lookout/)).toBeInTheDocument();
  });

  it('shows the working after a miss, then tries the leg again', async () => {
    const u = user();
    await startBoyle(u);
    await answer(u, tieOffVolume(boyleLeg(0, seed)) * 1.3);
    expect(screen.getByText(/sailed right over Red Mesa/)).toBeInTheDocument();
    expect(screen.getByText(/V₂ = P₁V₁ ÷ P₂/)).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      screen.getByRole('textbox', { name: 'Volume to tie off at' }),
    ).toHaveValue('');
  });

  it('cites the standard atmosphere and the gas constant', () => {
    render(<BalloonRiser />);
    expect(
      screen.getByText(SOURCES.standardAtmosphere.title),
    ).toBeInTheDocument();
    expect(screen.getByText(SOURCES.codata.title)).toBeInTheDocument();
  });
});

async function startLevel(u: ReturnType<typeof user>, name: RegExp) {
  render(<BalloonRiser />);
  await u.click(screen.getByRole('button', { name: 'General Chemistry' }));
  await u.click(screen.getByRole('button', { name }));
  act(() => jest.advanceTimersByTime(DIP_MS)); // the scene dips to the new leg
}

async function answerIn(
  u: ReturnType<typeof user>,
  label: string,
  action: string,
  value: string,
) {
  await u.type(screen.getByRole('textbox', { name: label }), value);
  await u.click(screen.getByRole('button', { name: action }));
  act(() => jest.advanceTimersByTime(FLIGHT_MS + 500));
}

describe('the heater, the burst line and the tank', () => {
  it('heats the helium on Charles’s law, and lands on a right answer', async () => {
    const u = user();
    await startLevel(u, /^Charles’s law/);
    expect(screen.getByText(/Next stop: Lone Tower/)).toBeInTheDocument();
    const right = rightAnswer(charlesLeg(0, seed));
    await answerIn(u, 'Heater temperature', 'Heat and fly', right.toFixed(1));
    expect(screen.getByText('We’re down on Lone Tower!')).toBeInTheDocument();
  });

  it('takes the heater temperature in °C too', async () => {
    const u = user();
    await startLevel(u, /^Charles’s law/);
    const celsius = rightAnswer(charlesLeg(0, seed)) - 273.15;
    await u.click(screen.getByRole('button', { name: /^Unit/ }));
    await u.click(screen.getByRole('button', { name: '°C' }));
    await answerIn(u, 'Heater temperature', 'Heat and fly', celsius.toFixed(1));
    expect(screen.getByText('We’re down on Lone Tower!')).toBeInTheDocument();
  });

  it('bursts on Gay-Lussac’s law when the vent’s set too hot', async () => {
    const u = user();
    await startLevel(u, /^Gay-Lussac’s law/);
    const right = rightAnswer(gayLussacLeg(0, seed));
    await answerIn(
      u,
      'Temperature to vent at',
      'Set the vent and fly',
      (right * 1.1).toFixed(0),
    );
    expect(screen.getByText(/the fabric burst/)).toBeInTheDocument();
    expect(screen.getByText(/T₂ = T₁ × P₂ ÷ P₁/)).toBeInTheDocument();
  });

  it('has Mr. G react the moment it pops, mid-flight', async () => {
    const u = user();
    await startLevel(u, /^Gay-Lussac’s law/);
    const right = rightAnswer(gayLussacLeg(0, seed));
    await u.type(
      screen.getByRole('textbox', { name: 'Temperature to vent at' }),
      (right * 1.1).toFixed(0),
    );
    await u.click(screen.getByRole('button', { name: 'Set the vent and fly' }));
    expect(screen.getByRole('status')).toHaveTextContent('Vent’s set');
    act(() => jest.advanceTimersByTime(FLIGHT_MS / 2));
    expect(screen.getByRole('status')).toHaveTextContent(/^Pop!/);
  });

  it('sets the helium on Avogadro’s law', async () => {
    const u = user();
    await startLevel(u, /^Avogadro’s law/);
    const right = rightAnswer(avogadroLeg(0, seed));
    await answerIn(
      u,
      'Helium to have',
      'Fill or vent and fly',
      right.toFixed(0),
    );
    expect(screen.getByText('We’re down on Clay Mesa!')).toBeInTheDocument();
  });
});

describe('the launch field, first thing', () => {
  it('asks for the course in the sky over the launch field', () => {
    render(<BalloonRiser />);
    expect(
      screen.getByRole('img', {
        name: /Mr\. G in the balloon’s basket, at 200 m/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Morning!/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'General Chemistry' }),
    ).toBeInTheDocument();
  });

  it('lists the levels there too, without instruments yet', async () => {
    const u = user();
    render(<BalloonRiser />);
    await u.click(screen.getByRole('button', { name: 'General Chemistry' }));
    expect(
      screen.getByRole('img', { name: /balloon’s basket/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'The balloon' })).toBeNull();
    expect(screen.getByRole('button', { name: /^Boyle’s law/ })).toBeEnabled();
  });
});

describe('dev tools, for testing a leg', () => {
  it('fly a right answer onto the platform', async () => {
    const u = user();
    await startBoyle(u);
    await u.click(screen.getByRole('button', { name: 'Fly the right answer' }));
    act(() => jest.advanceTimersByTime(FLIGHT_MS + 500));
    expect(screen.getByText('We’re down on Red Mesa!')).toBeInTheDocument();
  });

  it('fly a wrong answer, too high or too low', async () => {
    const u = user();
    await startBoyle(u);
    await u.click(screen.getByRole('button', { name: 'Fly 10% too high' }));
    act(() => jest.advanceTimersByTime(FLIGHT_MS + 500));
    expect(screen.getByText(/sailed right over Red Mesa/)).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Try again' }));
    await u.click(screen.getByRole('button', { name: 'Fly 10% too low' }));
    act(() => jest.advanceTimersByTime(FLIGHT_MS + 500));
    expect(
      screen.getByRole('button', { name: 'Try again' }),
    ).toBeInTheDocument();
  });
});

describe('moving between screens', () => {
  it('keeps the one scene, rather than building a new one each time', async () => {
    const u = user();
    render(<BalloonRiser />);
    const basket = () => screen.getByRole('img', { name: /balloon’s basket/ });
    const first = basket();
    await u.click(screen.getByRole('button', { name: 'General Chemistry' }));
    expect(basket()).toBe(first);
    await u.click(screen.getByRole('button', { name: /^Boyle’s law/ }));
    act(() => jest.advanceTimersByTime(DIP_MS)); // the scene dips to the new leg
    expect(basket()).toBe(first);
  });
});

describe('the back arrow', () => {
  it('leaves for the simulations from the level select', async () => {
    const u = user();
    render(<BalloonRiser />);
    await u.click(screen.getByRole('button', { name: 'General Chemistry' }));
    expect(
      screen.getByRole('link', { name: 'Back to simulations' }),
    ).toHaveAttribute('href', '/');
  });

  it('goes back to the level select from inside a game', async () => {
    const u = user();
    await startBoyle(u);
    await u.click(screen.getByRole('button', { name: 'Back to levels' }));
    act(() => jest.advanceTimersByTime(DIP_MS)); // the scene dips to the new leg
    expect(screen.getByRole('button', { name: /^Boyle’s law/ })).toBeEnabled();
    expect(screen.queryByText('Leg 1 of 3')).not.toBeInTheDocument();
  });
});

describe('between steps', () => {
  // drawn, but on its way out: hidden from screen readers and clicks
  const fading = (text: string | RegExp) =>
    screen.getAllByText(text).some((el) => el.closest('[inert]'));

  async function landFirstLeg(u: ReturnType<typeof user>) {
    await startBoyle(u);
    await u.type(
      screen.getByRole('textbox', { name: 'Volume to tie off at' }),
      String(Math.round(tieOffVolume(boyleLeg(0, seed)))),
    );
    await u.click(screen.getByRole('button', { name: 'Tie off and fly' }));
  }

  it('fades the briefing and the answer out as the flight’s words fade in', async () => {
    await landFirstLeg(user());
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(fading(/Next stop: Red Mesa/)).toBe(true);
    expect(fading('Volume to tie off at')).toBe(true);
    expect(
      screen.queryByRole('button', { name: 'Tie off and fly' }),
    ).toBeNull();
    act(() => jest.advanceTimersByTime(FADE_OUT_MS));
    expect(screen.queryByText('Volume to tie off at')).toBeNull();
  });

  it('keeps your working through the flight', async () => {
    const u = user();
    await startBoyle(u);
    await u.type(
      screen.getByRole('textbox', { name: 'Working' }),
      'P1V1 = P2V2',
    );
    await u.type(
      screen.getByRole('textbox', { name: 'Volume to tie off at' }),
      String(Math.round(tieOffVolume(boyleLeg(0, seed)))),
    );
    await u.click(screen.getByRole('button', { name: 'Tie off and fly' }));
    expect(screen.getByRole('textbox', { name: 'Working' })).toHaveValue(
      'P1V1 = P2V2',
    );
  });

  it('dips the scene out and back in to move on to the next leg', async () => {
    const u = user();
    await landFirstLeg(u);
    act(() => jest.advanceTimersByTime(FLIGHT_MS + 500));
    await u.click(screen.getByRole('button', { name: 'Next leg' }));
    // still the last leg while the veil comes down
    expect(screen.getByText('Leg 1 of 3')).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(DIP_MS));
    expect(screen.getByText('Leg 2 of 3')).toBeInTheDocument();
    expect(screen.getByText(/Next stop:/)).toBeInTheDocument();
  });
});

describe('the answer', () => {
  it('sits apart from Mr. G’s briefing, with its hint', async () => {
    await startBoyle(user());
    const answer = screen.getByRole('group', { name: 'Your answer' });
    const mrG = screen.getByRole('region', { name: 'Mr. G' });
    expect(mrG).not.toContainElement(
      screen.getByRole('textbox', { name: 'Volume to tie off at' }),
    );
    expect(answer).toContainElement(
      screen.getByRole('button', { name: 'Hint' }),
    );
  });
});

describe('the combined gas law level', () => {
  it('flies a right answer onto the next platform', async () => {
    const u = user();
    render(<BalloonRiser />);
    await u.click(screen.getByRole('button', { name: 'General Chemistry' }));
    await u.click(screen.getByRole('button', { name: /^Combined gas law/ }));
    act(() => jest.advanceTimersByTime(DIP_MS)); // the scene dips to the new leg
    await answer(u, rightAnswer(combinedLeg(0, seed)));
    expect(
      screen.getByText(`We’re down on ${combinedLeg(0, seed).leg.to.name}!`),
    ).toBeInTheDocument();
  });
});

describe('the ideal gas law level', () => {
  it('fills an empty balloon and flies a right answer onto the next platform', async () => {
    const u = user();
    render(<BalloonRiser />);
    await u.click(screen.getByRole('button', { name: 'General Chemistry' }));
    await u.click(screen.getByRole('button', { name: /^Ideal gas law/ }));
    act(() => jest.advanceTimersByTime(DIP_MS)); // the scene dips to the new leg
    await u.type(
      screen.getByRole('textbox', { name: 'Helium to fill' }),
      String(Math.round(rightAnswer(idealLeg(0, seed)))),
    );
    await u.click(screen.getByRole('button', { name: 'Fill and fly' }));
    act(() => jest.advanceTimersByTime(FLIGHT_MS + 500));
    expect(
      screen.getByText(`We’re down on ${idealLeg(0, seed).leg.to.name}!`),
    ).toBeInTheDocument();
  });
});

describe('free flight', () => {
  const firstLeg = () => gasLeg(newGame('general', 'free', seed));

  async function flyFirstLeg(u: ReturnType<typeof user>, by: number) {
    render(<BalloonRiser />);
    await u.click(screen.getByRole('button', { name: 'General Chemistry' }));
    await u.click(screen.getByRole('button', { name: /^Free flight/ }));
    act(() => jest.advanceTimersByTime(DIP_MS)); // the scene dips to the new leg
    const g = firstLeg();
    await u.type(
      screen.getByRole('textbox', { name: ask(g).label }),
      String(rightAnswer(g) * by),
    );
    await u.click(screen.getByRole('button', { name: ask(g).action }));
  }

  it('keeps score: the coins collected, and five for landing first time', async () => {
    const u = user();
    await flyFirstLeg(u, 1);
    expect(
      screen.getByRole('img', {
        name: 'Coins on the way: 3 of 3 still to collect',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Score 0')).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(FLIGHT_MS + 500));
    expect(
      screen.getByRole('img', {
        name: 'Coins on the way: 0 of 3 still to collect',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Score 8')).toBeInTheDocument();
  });

  it('loses the leg’s coins after a miss', async () => {
    const u = user();
    await flyFirstLeg(u, 1.3);
    act(() => jest.advanceTimersByTime(FLIGHT_MS + 500));
    await u.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      screen.queryByRole('img', { name: /^Coins/ }),
    ).not.toBeInTheDocument();
  });
});

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SOURCES } from '~/constants/sources';
import BalloonRiser, { FLIGHT_MS } from '~/pages/balloon-riser';
import {
  avogadroLeg,
  boyleLeg,
  charlesLeg,
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
  it('asks for the course, then offers the levels built so far', async () => {
    const u = user();
    render(<BalloonRiser />);
    await u.click(screen.getByRole('button', { name: 'General Chemistry' }));
    expect(screen.getByRole('button', { name: /^Boyle’s law/ })).toBeEnabled();
    expect(
      screen.getByRole('button', { name: /^Combined gas law \(coming soon\)/ }),
    ).toBeDisabled();
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

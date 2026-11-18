import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SOURCES } from '~/constants/sources';
import BalloonRiser, { FLIGHT_MS } from '~/pages/balloon-riser';
import { boyleLeg, tieOffVolume } from '~/utils/balloon-legs';

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
      screen.getByRole('button', { name: /^Charles’s law \(coming soon\)/ }),
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

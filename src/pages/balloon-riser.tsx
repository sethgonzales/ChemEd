import { useEffect, useState, type ReactNode } from 'react';
import BalloonRadio from '~/components/balloon-radio';
import BalloonScene from '~/components/balloon-scene';
import Button from '~/components/button';
import CalcPad, { Working } from '~/components/calc-pad';
import Container from '~/components/container';
import { ATMOSPHERE_SOURCE } from '~/constants/atmosphere';
import {
  POPPED,
  ask,
  briefing,
  hint,
  verdict,
  worked,
} from '~/utils/balloon-briefings';
import { flightState } from '~/utils/balloon-flight';
import {
  arrive,
  fly,
  gasLeg,
  levelsFor,
  next,
  retry,
  startLevel,
  type GameState,
} from '~/utils/balloon-game';
import { boyleLeg, rightAnswer } from '~/utils/balloon-legs';
import {
  loadStars,
  saveStars,
  starsFor,
  type Stars,
} from '~/utils/balloon-progress';
import { COURSES, type Course } from '~/utils/quest';
import { useMissSound, useTreasureSound } from '~/utils/sounds';
import { useMedia } from '~/utils/use-media';

export const FLIGHT_MS = 6000; // a leg's flight, from take-off to landing or miss
const QUICK_FLIGHT_MS = 1500; // with reduced motion
const TICK_MS = 16; // about 60 frames a second, so the flight glides

const newSeed = () => Math.floor(Math.random() * 2 ** 31);

/** Runs a flight's clock from 0 to 1, then calls onDone */
function useFlightClock(running: boolean, onDone: () => void) {
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');
  const duration = reducedMotion ? QUICK_FLIGHT_MS : FLIGHT_MS;
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!running) return;
    setT(0);
    let elapsed = 0;
    const id = setInterval(() => {
      elapsed += TICK_MS;
      setT(Math.min(1, elapsed / duration));
      if (elapsed >= duration) {
        clearInterval(id);
        onDone();
      }
    }, TICK_MS);
    return () => clearInterval(id);
    // onDone changes each render; the clock only restarts with a new flight
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, duration]);
  return t;
}

const SCIENTISTS: Record<string, string> = {
  boyle: 'Boyle',
  charles: 'Charles',
  'gay-lussac': 'Gay-Lussac',
  avogadro: 'Avogadro',
};

const starText = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);

// Mr. G's words float in the sky with no card behind them, part of the
// scene; a shadow keeps them readable against the clouds
const IN_SKY =
  'bg-transparent p-0 [text-shadow:0_1px_2px_rgb(15_23_42/0.9),0_0_6px_rgb(15_23_42/0.6)]';

// the launch field, where every flight starts: what you see before one
const LAUNCH = boyleLeg(0, 0);
const AT_LAUNCH = flightState(LAUNCH, undefined, 0);

/** The launch field, resting, with Mr. G's card in its sky */
function LaunchField({ children }: { children: ReactNode }) {
  return (
    <BalloonScene
      balloon={AT_LAUNCH.balloon}
      flight={AT_LAUNCH.flight}
      distance={AT_LAUNCH.distance}
      leg={LAUNCH.leg}
      instruments={false}
    >
      <BalloonRadio className={IN_SKY}>{children}</BalloonRadio>
    </BalloonScene>
  );
}

function Gate({ onPick }: { onPick: (c: Course) => void }) {
  return (
    <LaunchField>
      <p>
        Morning! Before we take off: which course are you taking? It decides
        which flights I’ll take you on.
      </p>
      <div className="flex flex-wrap gap-2 font-pixel">
        {(Object.keys(COURSES) as Course[]).map((id) => (
          <Button key={id} onClick={() => onPick(id)}>
            {COURSES[id]}
          </Button>
        ))}
      </div>
    </LaunchField>
  );
}

function Levels({
  course,
  stars,
  onPlay,
  onChangeCourse,
}: {
  course: Course;
  stars: Stars;
  onPlay: (level: string) => void;
  onChangeCourse: () => void;
}) {
  const levels = levelsFor(course);
  const general = levels.filter((l) => !l.ap).length;
  return (
    <LaunchField>
      <p>Pick a flight. Each one is a few hops, platform to platform.</p>
      <ol className="grid gap-1.5 text-sm sm:grid-cols-2">
        {levels.map((l, i) => {
          const got = stars[course]?.[l.id];
          return (
            <li key={l.id}>
              <button
                type="button"
                disabled={!l.ready}
                onClick={() => onPlay(l.id)}
                className="pixel-control flex w-full cursor-pointer items-center justify-between gap-2 bg-primary-700 px-2.5 py-1.5 text-left text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>
                  {l.title}
                  {!l.ready && ' (coming soon)'}
                  <span className="sr-only">
                    {l.ap
                      ? `, AP level ${i - general + 1}`
                      : `, level ${i + 1}`}
                  </span>
                </span>
                {got !== undefined && (
                  <span
                    aria-label={`${got} of 3 stars`}
                    className="text-secondary-500"
                  >
                    {starText(got)}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="font-pixel">
        <Button onClick={onChangeCourse}>Change course</Button>
      </div>
    </LaunchField>
  );
}

// test a leg without working it out: never in the built app
const DEV_TOOLS = process.env.NODE_ENV !== 'production';
const DEV_ANSWERS: [string, number][] = [
  ['Fly the right answer', 1],
  ['Fly 10% too high', 1.1],
  ['Fly 10% too low', 0.9],
];

function Flight({
  game,
  setGame,
  onLevels,
}: {
  game: GameState;
  setGame: (g: GameState) => void;
  onLevels: () => void;
}) {
  const playTreasure = useTreasureSound();
  const playMiss = useMissSound();
  const g = gasLeg(game);
  const t = useFlightClock(game.phase === 'flying', () => {
    const done = arrive(game);
    (done.phase === 'landed' ? playTreasure : playMiss)();
    setGame(done);
  });

  const plan = game.plan;
  const shown = flightState(
    g,
    game.phase === 'brief' ? undefined : plan,
    game.phase === 'flying' ? t : 1,
  );
  const question = ask(g);
  const last = game.leg + 1 >= game.legs;

  const goOn = () => {
    const after = next(game);
    if (after.phase === 'done')
      saveStars(game.course, game.level, starsFor(game.misses));
    setGame(after);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-white/80">
        <span>{`Leg ${game.leg + 1} of ${game.legs}`}</span>
        <span className="font-sans">
          {' '}
          · {g.leg.from.name} → {g.leg.to.name}
        </span>
      </p>
      <BalloonScene
        balloon={shown.balloon}
        flight={shown.flight}
        distance={shown.distance}
        leg={g.leg}
      >
        <BalloonRadio className={IN_SKY}>
          {game.phase === 'brief' &&
            briefing(g).map((line) => <p key={line}>{line}</p>)}
          {game.phase === 'flying' && (
            <p role="status">{shown.flight.burst ? POPPED : question.flying}</p>
          )}
          {game.phase === 'landed' && (
            <p role="status" className="font-semibold text-green-300">
              {plan && verdict(plan, g)}
            </p>
          )}
          {game.phase === 'missed' && plan && (
            <>
              <p role="status">{verdict(plan, g)}</p>
              <p>Here’s the working, from the same readings:</p>
              <div className="flex flex-col font-mono text-sm">
                {worked(g).map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>
            </>
          )}

          {game.phase === 'brief' && (
            <CalcPad
              key={`${game.leg}-${game.seed}`}
              label={question.label}
              units={question.units}
              hint={hint(g)}
              action={question.action}
              onSubmit={(v) => setGame(fly(game, v))}
              working={false}
            />
          )}
          {game.phase === 'landed' && (
            <div className="font-pixel">
              <Button pressed onClick={goOn}>
                {last ? 'Finish' : 'Next leg'}
              </Button>
            </div>
          )}
          {game.phase === 'missed' && (
            <div className="flex gap-2 font-pixel">
              <Button
                pressed
                onClick={() => setGame(retry(game, game.seed + 1))}
              >
                Try again
              </Button>
              <Button onClick={onLevels}>Levels</Button>
            </div>
          )}
        </BalloonRadio>
      </BalloonScene>

      {game.phase === 'brief' && <Working key={`${game.leg}-${game.seed}`} />}
      {game.phase === 'brief' && DEV_TOOLS && (
        <div
          role="group"
          aria-label="Dev tools"
          className="flex flex-wrap items-center gap-2 border border-dashed border-white/30 p-2 text-xs"
        >
          <span className="text-white/60">Dev tools</span>
          {DEV_ANSWERS.map(([name, by]) => (
            <Button
              key={name}
              onClick={() => setGame(fly(game, rightAnswer(g) * by))}
            >
              {name}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function Done({ game, onLevels }: { game: GameState; onLevels: () => void }) {
  const stars = starsFor(game.misses);
  return (
    <LaunchField>
      <p role="status" className="font-semibold text-green-300">
        Flight complete!
      </p>
      <p
        aria-label={`${stars} of 3 stars`}
        className="text-2xl text-secondary-500"
      >
        {starText(stars)}
      </p>
      <p>
        {game.misses === 0
          ? `Every landing first time. ${SCIENTISTS[game.level] ?? 'Your teacher'} would be proud.`
          : `${game.misses} missed landing${game.misses === 1 ? '' : 's'} on the way. Fly it again for all three stars.`}
      </p>
      <div className="font-pixel">
        <Button pressed onClick={onLevels}>
          Levels
        </Button>
      </div>
    </LaunchField>
  );
}

export default function BalloonRiser() {
  const [course, setCourse] = useState<Course | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [stars, setStars] = useState<Stars>({});
  useEffect(() => setStars(loadStars()), [game?.phase]);

  const toLevels = () => setGame(null);

  return (
    <Container
      game
      header="Balloon Riser"
      description="Fly from platform to platform. Read the instruments, work out the gas law, and the balloon flies on your answer."
      backHref="/"
      sources={[ATMOSPHERE_SOURCE, 'codata', 'siBrochure', 'ciaawWeights']}
    >
      {!course ? (
        <Gate onPick={setCourse} />
      ) : !game ? (
        <Levels
          course={course}
          stars={stars}
          onPlay={(level) => setGame(startLevel(course, level, newSeed()))}
          onChangeCourse={() => setCourse(null)}
        />
      ) : game.phase === 'done' ? (
        <Done game={game} onLevels={toLevels} />
      ) : (
        <Flight game={game} setGame={setGame} onLevels={toLevels} />
      )}
    </Container>
  );
}

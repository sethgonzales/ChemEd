import { useEffect, useRef, useState } from 'react';
import BalloonRadio from '~/components/balloon-radio';
import BalloonScene from '~/components/balloon-scene';
import Button from '~/components/button';
import CalcPad, { Working } from '~/components/calc-pad';
import Container from '~/components/container';
import FadeSwap from '~/components/fade-swap';
import { Said, TypedBriefing } from '~/components/typed-text';
import { ATMOSPHERE_SOURCE } from '~/constants/atmosphere';
import { VAN_DER_WAALS_SOURCE } from '~/constants/van-der-waals';
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
  coinsLeft,
  fly,
  gasLeg,
  levelsFor,
  next,
  retry,
  score,
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
import { takenBy } from '~/utils/balloon-free';
import { DEV_TOOLS } from '~/utils/dev-tools';
import { COURSES, type Course } from '~/utils/quest';
import { useCoinSound, useMissSound, useTreasureSound } from '~/utils/sounds';
import { useFlightClock } from '~/utils/use-flight-clock';
import { useMedia } from '~/utils/use-media';

export const FLIGHT_MS = 6000; // a leg's flight, from take-off to landing or miss
const QUICK_FLIGHT_MS = 1500; // with reduced motion
// moving to another leg: the scene fades out, switches and fades back in, so
// the view doesn't jump; matches the veil's transition
export const DIP_MS = 300;

const newSeed = () => Math.floor(Math.random() * 2 ** 31);

const SCIENTISTS: Record<string, string> = {
  boyle: 'Boyle',
  charles: 'Charles',
  'gay-lussac': 'Gay-Lussac',
  avogadro: 'Avogadro',
  dalton: 'Dalton',
  graham: 'Graham',
  real: 'van der Waals',
};

const starText = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);

// Mr. G's words float in the sky with no card behind them, part of the
// scene, in whatever colour the scene gives them
const IN_SKY = 'bg-transparent p-0 text-inherit';

// the launch field, where every flight starts: what you see before one
const LAUNCH = boyleLeg(0, 0);
const AT_LAUNCH = flightState(LAUNCH, undefined, 0);

function Gate({ onPick }: { onPick: (c: Course) => void }) {
  return (
    <>
      <p>
        <Said>
          Morning! Before we take off: which course are you taking? It decides
          which flights I’ll take you on.
        </Said>
      </p>
      <div className="flex flex-wrap gap-2 font-pixel">
        {(Object.keys(COURSES) as Course[]).map((id) => (
          <Button key={id} onClick={() => onPick(id)}>
            {COURSES[id]}
          </Button>
        ))}
      </div>
    </>
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
    <>
      <p>
        <Said>
          Pick a flight. Each one is a few hops, platform to platform.
        </Said>
      </p>
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
    </>
  );
}

// test a leg without working it out: while developing, or in a build with
// NEXT_PUBLIC_DEV_TOOLS=true
const DEV_ANSWERS: [string, number][] = [
  ['Fly the right answer', 1],
  ['Fly 10% too high', 1.1],
  ['Fly 10% too low', 0.9],
];

/** Mr. G on the radio through a leg: the briefing, the answer, the verdict */
function FlightRadio({
  game,
  setGame,
  burst,
  onLevels,
  dip,
}: {
  game: GameState;
  setGame: (g: GameState) => void;
  burst: boolean;
  onLevels: () => void;
  dip: (then: () => void) => void;
}) {
  const g = gasLeg(game);
  const plan = game.plan;
  const question = ask(g);
  const last = game.leg + 1 >= game.legs;

  const goOn = () =>
    dip(() => {
      const after = next(game);
      if (after.phase === 'done')
        saveStars(game.course, game.level, starsFor(game.misses));
      setGame(after);
    });

  return (
    <>
      {game.phase === 'brief' && <TypedBriefing lines={briefing(g)} />}
      {game.phase === 'flying' && (
        <p role="status">
          <Said>{burst ? POPPED : question.flying}</Said>
        </p>
      )}
      {game.phase === 'landed' && plan && (
        <p role="status" className="font-semibold text-green-300">
          <Said>{verdict(plan, g)}</Said>
        </p>
      )}
      {game.phase === 'missed' && plan && (
        <>
          <p role="status">
            <Said>{verdict(plan, g)}</Said>
          </p>
          <p>Here’s the working, from the same readings:</p>
          <div className="flex flex-col font-mono text-sm">
            {worked(g).map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
        </>
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
          <Button pressed onClick={() => setGame(retry(game, game.seed + 1))}>
            Try again
          </Button>
          <Button onClick={onLevels}>Levels</Button>
        </div>
      )}
    </>
  );
}

function Done({ game, onLevels }: { game: GameState; onLevels: () => void }) {
  const stars = starsFor(game.misses);
  return (
    <>
      <p role="status" className="font-semibold text-green-300">
        <Said>Flight complete!</Said>
      </p>
      <p
        aria-label={`${stars} of 3 stars`}
        className="text-2xl text-secondary-500"
      >
        {starText(stars)}
      </p>
      <p>
        <Said>
          {game.misses === 0
            ? `Every landing first time. ${SCIENTISTS[game.level] ?? 'Your teacher'} would be proud.`
            : `${game.misses} missed landing${game.misses === 1 ? '' : 's'} on the way. Fly it again for all three stars.`}
        </Said>
      </p>
      {game.level === 'free' && (
        <p>
          <Said>
            {`Score ${score(game)}: ${game.coins} coin${game.coins === 1 ? '' : 's'}, and ${game.firstTry} of ${game.legs} legs landed first time.`}
          </Said>
        </p>
      )}
      <div className="font-pixel">
        <Button pressed onClick={onLevels}>
          Levels
        </Button>
      </div>
    </>
  );
}

export default function BalloonRiser() {
  const [course, setCourse] = useState<Course | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [stars, setStars] = useState<Stars>({});
  useEffect(() => setStars(loadStars()), [game?.phase]);

  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');
  const [dipping, setDipping] = useState(false);
  const dipTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(dipTimer.current), []);
  const dip = (then: () => void) => {
    if (reducedMotion) return then();
    setDipping(true);
    clearTimeout(dipTimer.current);
    dipTimer.current = setTimeout(() => {
      then();
      setDipping(false);
    }, DIP_MS);
  };
  const toLevels = () => dip(() => setGame(null));

  const playTreasure = useTreasureSound();
  const playMiss = useMissSound();
  const t = useFlightClock(
    game?.phase === 'flying' ? `${game.level}-${game.leg}-${game.seed}` : null,
    reducedMotion ? QUICK_FLIGHT_MS : FLIGHT_MS,
    () => {
      if (!game) return;
      const done = arrive(game);
      (done.phase === 'landed' ? playTreasure : playMiss)();
      setGame(done);
    },
  );

  // one scene for every screen, so moving between them doesn't rebuild it:
  // the launch field until a leg is under way
  const flying = game && game.phase !== 'done' ? game : null;
  const g = flying ? gasLeg(flying) : LAUNCH;
  const shown = flying
    ? flightState(
        g,
        flying.phase === 'brief' ? undefined : flying.plan,
        flying.phase === 'flying' ? t : 1,
      )
    : AT_LAUNCH;
  const briefed = flying?.phase === 'brief' ? flying : null;

  // free flight's coins: dropping as the balloon passes, each with a ding
  const free = game?.level === 'free';
  const coins = flying ? coinsLeft(flying) : [];
  const taken =
    flying?.plan && flying.phase !== 'brief'
      ? takenBy(g, flying.plan, coins, flying.phase === 'flying' ? t : 1)
      : coins.map(() => false);
  const takenNow = taken.filter(Boolean).length;
  const playCoin = useCoinSound();
  const heard = useRef(0);
  useEffect(() => {
    if (takenNow > heard.current) playCoin();
    heard.current = takenNow;
  }, [takenNow, playCoin]);
  // the flight's coins count as they're collected, not just on landing
  const scoreNow =
    game && score(game) + (game.phase === 'flying' ? takenNow : 0);

  return (
    <Container
      game
      header="Balloon Riser"
      description="Fly from platform to platform. Read the instruments, work out the gas law, and the balloon flies on your answer."
      {...(game
        ? { back: { label: 'Back to levels', onClick: toLevels } }
        : { backHref: '/' })}
      sources={[
        ATMOSPHERE_SOURCE,
        'codata',
        'siBrochure',
        'ciaawWeights',
        'grahamsLaw',
        VAN_DER_WAALS_SOURCE,
      ]}
    >
      <div className="flex flex-col gap-4">
        {flying && (
          <p className="text-sm text-white/80">
            <span>{`Leg ${flying.leg + 1} of ${flying.legs}`}</span>
            <span className="font-sans">
              {' '}
              · {g.leg.from.name} → {g.leg.to.name}
            </span>
            {free && (
              <span className="text-secondary-500">
                {' · '}
                <span>{`Score ${scoreNow}`}</span>
              </span>
            )}
          </p>
        )}
        <BalloonScene
          balloon={shown.balloon}
          flight={shown.flight}
          distance={shown.distance}
          leg={g.leg}
          instruments={!!flying}
          coins={coins.map((c, i) => ({ ...c, taken: taken[i] }))}
          veiled={dipping}
          controls={
            flying && (
              <FadeSwap
                step={briefed ? `${briefed.leg}-${briefed.seed}` : 'none'}
              >
                {briefed && (
                  <CalcPad
                    label={ask(g).label}
                    units={ask(g).units}
                    hint={hint(g)}
                    action={ask(g).action}
                    onSubmit={(v) => setGame(fly(briefed, v))}
                    working={false}
                    stacked
                  />
                )}
              </FadeSwap>
            )
          }
        >
          <BalloonRadio className={IN_SKY}>
            {/* each step fades in over the last, rather than snapping into place */}
            <FadeSwap
              step={
                !course
                  ? 'gate'
                  : !game
                    ? 'levels'
                    : `${game.phase}-${game.leg}-${game.seed}`
              }
            >
              <div className="flex flex-col gap-1.5">
                {!course ? (
                  <Gate onPick={setCourse} />
                ) : !game ? (
                  <Levels
                    course={course}
                    stars={stars}
                    onPlay={(level) =>
                      dip(() => setGame(startLevel(course, level, newSeed())))
                    }
                    onChangeCourse={() => setCourse(null)}
                  />
                ) : game.phase === 'done' ? (
                  <Done game={game} onLevels={toLevels} />
                ) : (
                  <FlightRadio
                    game={game}
                    setGame={setGame}
                    burst={!!shown.flight.burst}
                    onLevels={toLevels}
                    dip={dip}
                  />
                )}
              </div>
            </FadeSwap>
          </BalloonRadio>
        </BalloonScene>

        {/* yours through the whole leg, flight and all, to check against */}
        {flying && <Working key={`${flying.leg}-${flying.seed}`} />}
        {briefed && DEV_TOOLS && (
          <div
            role="group"
            aria-label="Dev tools"
            className="flex flex-wrap items-center gap-2 border border-dashed border-white/30 p-2 text-xs"
          >
            <span className="text-white/60">Dev tools</span>
            {DEV_ANSWERS.map(([name, by]) => (
              <Button
                key={name}
                onClick={() => setGame(fly(briefed, rightAnswer(g) * by))}
              >
                {name}
              </Button>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}

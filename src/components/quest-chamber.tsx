import { useEffect, useId, useState, type ReactNode } from 'react';
import {
  IconHeart,
  IconHeartFilled,
  IconStar,
  IconStarFilled,
} from '@tabler/icons-react';
import Button from '~/components/button';
import { useGuide } from '~/components/guide';
import MrG from '~/components/mr-g';
import PixelArt from '~/components/pixel-art';
import QuestScene, { FloorLine, ScenePanel } from '~/components/quest-scene';
import TypedStory from '~/components/typed-story';
import { ROOMS } from '~/components/quest-rooms';
import Villain, { DURATION_MS, type VillainMode } from '~/components/villain';
import type { QuestChamber as Chamber } from '~/constants/quest-chambers';
import {
  MAX_HEARTS,
  answer,
  begin,
  rematch,
  solveRoom,
  stars,
  startChamber,
  type Course,
  type QuestState,
  type QuickQuestion,
} from '~/utils/quest';
import {
  useDamageSound,
  useDoorSound,
  useHitSound,
  useMissSound,
  useTreasureSound,
} from '~/utils/sounds';

interface Props {
  chamber: Chamber;
  course: Course;
  seed: number; // a new seed for each play, for new rooms and questions
  onClear: (stars: number) => void;
  onExit: () => void; // back to the map
  onReplay: () => void;
  // the stage (or the boss's door opening), and the boss's HP left: e.g.
  // for the music
  onStage?: (
    stage: QuestState<QuickQuestion>['stage'] | 'door',
    bossHp: number,
  ) => void;
  devTools?: boolean; // shortcuts for testing by hand: solve, hit, miss
}

// the shortcuts are on while developing, never in the built app
const DEV = process.env.NODE_ENV === 'development';
export const DOOR_MS = 1800; // the boss's door swinging open, in a hush

// each screen fades in from the dark as it opens
const fade = (key: string, screen: ReactNode) => (
  <div key={key} data-fade className="quest-fade-in">
    {screen}
  </div>
);

/** The boss's door, swinging open on the dark, its eyes waiting inside */
function BossDoor({ chamber }: { chamber: Chamber }) {
  const { villain } = chamber;
  return (
    <QuestScene backdrop={chamber.id} label={`${villain.name}’s door`}>
      <div className="flex justify-center px-4 pt-16 pb-12">
        <div
          role="img"
          aria-label={`${villain.name}’s door swings open`}
          className="relative flex h-72 w-56 items-end justify-center overflow-hidden bg-black pixel-frame [--frame-fill:#000] [--frame-outline:#1c1917] [perspective:600px]"
        >
          {/* who waits inside, in shadow */}
          <PixelArt
            rows={villain.draw(0, 0)}
            palette={villain.palette}
            className="mb-4 brightness-[0.35]"
          />
          <span className="quest-door-left absolute inset-y-0 left-0 w-1/2 border-r-4 border-amber-950 bg-[repeating-linear-gradient(90deg,#78350f_0_22px,#5b2a0b_22px_26px)]" />
          <span className="quest-door-right absolute inset-y-0 right-0 w-1/2 border-l-4 border-amber-950 bg-[repeating-linear-gradient(90deg,#78350f_0_22px,#5b2a0b_22px_26px)]" />
        </div>
      </div>
    </QuestScene>
  );
}

/** A developer's shortcut, dashed so it's never mistaken for the game's own */
const DevButton = ({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="cursor-pointer border border-dashed border-amber-300 px-2 py-1 text-xs text-amber-200"
  >
    {label} (dev)
  </button>
);

// Mr. G, small beside the story on phones; on wider screens he's in the corner
const PhoneMrG = () => (
  <MrG cloak className="md:hidden shrink-0 self-end w-12 h-auto" />
);

function StoryWall({
  chamber,
  onBegin,
}: {
  chamber: Chamber;
  onBegin: () => void;
}) {
  return (
    <QuestScene
      backdrop={chamber.id}
      label={`${chamber.topic}: the story`}
      footer={
        <div className="flex justify-center">
          <Button pressed onClick={onBegin}>
            Begin
          </Button>
        </div>
      }
    >
      <div className="px-4 pt-12 pb-4 sm:px-12">
        <ScenePanel className="flex gap-3">
          <PhoneMrG />
          <TypedStory lines={chamber.story} />
        </ScenePanel>
      </div>
    </QuestScene>
  );
}

function Room({
  chamber,
  course,
  seed,
  room,
  onOpen,
  devTools,
}: {
  chamber: Chamber;
  course: Course;
  seed: number;
  room: number;
  onOpen: () => void;
  devTools: boolean;
}) {
  const [solved, setSolved] = useState(false);
  const playDoor = useDoorSound();
  const door = chamber.doors[room];
  const last = room + 1 === chamber.rooms;
  // the Alchemist's trials borrow a room from another chamber
  const trial = chamber.trials?.[room];
  const Puzzle = ROOMS[trial?.id ?? chamber.id];

  // the puzzle stands in the chamber, under the story, with the way on
  // just below it
  return (
    <QuestScene
      backdrop={chamber.id}
      label={`Room ${room + 1} of ${chamber.rooms}`}
      footer={
        solved && (
          <div className="flex flex-col items-center gap-2">
            <p className="font-semibold text-green-300">The way is open!</p>
            <Button
              pressed
              onClick={() => {
                playDoor();
                onOpen();
              }}
            >
              {last ? 'Face the boss' : 'Next door'}
            </Button>
          </div>
        )
      }
    >
      {/* edge to edge on a phone, where every pixel of width counts */}
      <div className="flex flex-col gap-4 pt-12 pb-2 sm:px-12">
        <ScenePanel className="flex gap-3">
          <PhoneMrG />
          <div className="flex flex-col gap-2">
            <h3 className="font-pixel text-xl sm:text-2xl">
              Room {room + 1} of {chamber.rooms}: {door.name}
            </h3>
            <TypedStory key={door.name} lines={[door.story]} />
          </div>
        </ScenePanel>
        <Puzzle
          seed={seed}
          course={course}
          room={trial?.room ?? room}
          rooms={chamber.rooms}
          onSolve={() => setSolved(true)}
        />
        {devTools && !solved && (
          <div>
            <DevButton label="Solve" onClick={() => setSolved(true)} />
          </div>
        )}
      </div>
    </QuestScene>
  );
}

function Hearts({ hearts }: { hearts: number }) {
  return (
    <div
      role="img"
      aria-label={`${hearts} of ${MAX_HEARTS} hearts left`}
      className="flex gap-1 text-red-400"
    >
      {Array.from({ length: MAX_HEARTS }, (_, i) =>
        i < hearts ? (
          <IconHeartFilled key={i} size={22} aria-hidden="true" />
        ) : (
          <IconHeart key={i} size={22} aria-hidden="true" />
        ),
      )}
    </div>
  );
}

function HpBar({ name, hp, max }: { name: string; hp: number; max: number }) {
  return (
    <div className="flex flex-1 items-center gap-2 text-xs text-stone-200">
      <span aria-hidden="true">HP</span>
      <div
        role="meter"
        aria-label={`${name}’s HP`}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={hp}
        aria-valuetext={`${hp} of ${max}`}
        className="h-3 max-w-48 flex-1 bg-stone-800 shadow-[0_0_0_var(--pixel)_black]"
      >
        <div
          className="h-full bg-red-500 transition-[width] duration-300"
          style={{ width: `${(hp / max) * 100}%` }}
        />
      </div>
    </div>
  );
}

function Question({
  question,
  onPick,
}: {
  question: QuickQuestion;
  onPick: (i: number) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      {/* the lead-in: where the question comes from, then what it's about */}
      {question.topic && (
        <p className="text-base text-amber-200">From {question.topic}</p>
      )}
      <p className="text-base text-stone-300">{question.about}</p>
      <p id={id} className="text-xl">
        {question.prompt}
      </p>
      {question.shown && (
        <p className="text-2xl text-secondary-500">{question.shown}</p>
      )}
      <div
        role="group"
        aria-labelledby={id}
        className="flex flex-wrap justify-center gap-2"
      >
        {question.choices.map((c, i) => (
          <Button key={`${c}-${i}`} onClick={() => onPick(i)}>
            {c}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** Mr. G's note on a phone, where he isn't in the corner: a bubble by his sprite */
function PhoneNote({ text }: { text: string }) {
  return (
    <div role="note" aria-label="Mr. G" className="flex items-end gap-2">
      <MrG cloak className="h-auto w-12 shrink-0" />
      <ScenePanel className="relative flex-1 p-3 text-sm before:absolute before:bottom-3 before:-left-2 before:size-3 before:rotate-45 before:border-b-2 before:border-l-2 before:border-stone-700 before:bg-stone-950">
        {text}
      </ScenePanel>
    </div>
  );
}

function GameOver({
  chamber,
  onRematch,
  onReplay,
  onExit,
}: {
  chamber: Chamber;
  onRematch: () => void;
  onReplay: () => void;
  onExit: () => void;
}) {
  return (
    <QuestScene
      backdrop={chamber.id}
      label="Game over"
      footer={
        <div className="flex flex-wrap justify-center gap-2">
          <Button pressed onClick={onRematch}>
            Fight again
          </Button>
          <Button onClick={onReplay}>Restart the chamber</Button>
          <Button onClick={onExit}>Back to the map</Button>
        </div>
      }
    >
      <ScenePanel className="mx-4 mt-12 mb-4 flex flex-col items-center gap-3 text-center sm:mx-12">
        <h3 className="font-pixel text-3xl text-red-400">Game over</h3>
        <p>
          {chamber.villain.name} knocked you down. Fight it again with new
          questions (the rooms stay cleared), or start the chamber over.
        </p>
      </ScenePanel>
    </QuestScene>
  );
}

function Loot({
  chamber,
  won,
  onExit,
  onReplay,
}: {
  chamber: Chamber;
  won: number;
  onExit: () => void;
  onReplay: () => void;
}) {
  const playTreasure = useTreasureSound();
  useEffect(() => playTreasure(), [playTreasure]);
  return (
    <QuestScene
      backdrop={chamber.id}
      label="Treasure"
      footer={
        <div className="flex flex-wrap justify-center gap-2">
          <Button pressed onClick={onExit}>
            Back to the map
          </Button>
          <Button onClick={onReplay}>Play again</Button>
        </div>
      }
    >
      <ScenePanel className="mx-4 mt-12 mb-4 flex flex-col items-center gap-3 text-center sm:mx-12">
        <h3 className="font-pixel text-3xl text-amber-200">Chamber cleared!</h3>
        <div
          role="img"
          aria-label={`${won} of ${MAX_HEARTS} stars`}
          className="flex gap-1 text-amber-300"
        >
          {Array.from({ length: MAX_HEARTS }, (_, i) =>
            i < won ? (
              <IconStarFilled key={i} size={36} aria-hidden="true" />
            ) : (
              <IconStar key={i} size={36} aria-hidden="true" />
            ),
          )}
        </div>
        <TypedStory
          lines={[
            `${chamber.villain.name} crumbles, and the way on is open. One star for each heart you kept.`,
          ]}
        />
      </ScenePanel>
    </QuestScene>
  );
}

/** One chamber of the Dungeon Quest: the story, the rooms, the boss, the loot */
export default function QuestChamber({
  chamber,
  course,
  seed,
  onClear,
  onExit,
  onReplay,
  onStage,
  devTools = DEV,
}: Props) {
  const [state, setState] = useState<QuestState<QuickQuestion>>(() =>
    startChamber(chamber, course, seed),
  );
  // the last room's way out: the boss's door opening, then the fight
  const [opening, setOpening] = useState(false);
  useEffect(() => {
    if (!opening) return;
    const timer = setTimeout(() => {
      setState((s) => solveRoom(s, chamber));
      setOpening(false);
    }, DOOR_MS);
    return () => clearTimeout(timer);
  }, [opening, chamber]);
  useEffect(
    () => onStage?.(opening ? 'door' : state.stage, state.bossHp),
    [opening, state.stage, state.bossHp, onStage],
  );
  const [mode, setMode] = useState<VillainMode>('idle');
  const [blow, setBlow] = useState(0); // restarts the villain's animation
  const [feedback, setFeedback] = useState('');
  const [won, setWon] = useState<number | null>(null);
  const playHit = useHitSound();
  const playMiss = useMissSound();
  const playDamage = useDamageSound();
  const { say, visible: guideShowing } = useGuide();
  // Mr. G's explanation, for a phone where he isn't in the corner
  const [note, setNote] = useState('');
  const { villain } = chamber;

  // the damage sounds as the boss's attack lands, halfway through its lunge
  useEffect(() => {
    if (mode !== 'attack') return;
    const timer = setTimeout(playDamage, DURATION_MS.attack / 2);
    return () => clearTimeout(timer);
  }, [mode, blow, playDamage]);

  if (state.stage === 'story')
    return fade(
      'story',
      <StoryWall chamber={chamber} onBegin={() => setState(begin)} />,
    );

  if (opening) return fade('door', <BossDoor chamber={chamber} />);

  if (state.stage === 'room')
    return fade(
      `room-${state.room}`,
      <Room
        key={state.room}
        chamber={chamber}
        course={course}
        seed={seed}
        room={state.room}
        devTools={devTools}
        onOpen={() =>
          state.room + 1 === chamber.rooms
            ? setOpening(true)
            : setState((s) => solveRoom(s, chamber))
        }
      />,
    );

  if (won !== null)
    return fade(
      'loot',
      <Loot chamber={chamber} won={won} onExit={onExit} onReplay={onReplay} />,
    );

  // game over once the boss's last blow has landed
  if (state.stage === 'defeat' && mode === 'idle')
    return fade(
      'over',
      <GameOver
        chamber={chamber}
        onRematch={() => {
          setState((s) => rematch(s, chamber));
          setFeedback('');
          setNote('');
        }}
        onReplay={onReplay}
        onExit={onExit}
      />,
    );

  const pickChoice = (i: number) => {
    const q = state.question!;
    const right = i === q.answer;
    const next = answer(state, chamber, right);
    setNote('');
    if (right) {
      playHit();
      setFeedback(
        next.stage === 'loot'
          ? `Hit! ${villain.name} is beaten!`
          : `Hit! ${villain.name} has ${next.bossHp} HP left.`,
      );
    } else {
      playMiss();
      setFeedback(
        next.stage === 'defeat'
          ? `${villain.name} knocked you down!`
          : `Missed! ${villain.name} strikes back.`,
      );
      // Mr. G explains in his speech bubble, or beside his sprite on a phone
      if (guideShowing) say(q.explain, 'tip');
      else setNote(q.explain);
    }
    setMode(next.stage === 'loot' ? 'defeat' : right ? 'hit' : 'attack');
    setBlow((b) => b + 1);
    setState(next);
  };

  const done = () => {
    if (mode === 'defeat') {
      const n = stars(state.hearts);
      setWon(n);
      onClear(n);
    } else setMode('idle');
  };

  return fade(
    'boss',
    <QuestScene
      room
      backdrop={chamber.id}
      label={`${villain.name}’s chamber`}
      footer={
        <div className="flex flex-col gap-3">
          <p
            role="status"
            className="min-h-6 text-center text-sm text-stone-100"
          >
            {feedback}
          </p>
          {note && <PhoneNote text={note} />}
          {state.stage === 'boss' && state.question && (
            <Question question={state.question} onPick={pickChoice} />
          )}
          {devTools && state.stage === 'boss' && state.question && (
            <div className="flex justify-center gap-2">
              <DevButton
                label="Hit"
                onClick={() => pickChoice(state.question!.answer)}
              />
              <DevButton
                label="Miss"
                onClick={() =>
                  pickChoice(
                    (state.question!.answer + 1) %
                      state.question!.choices.length,
                  )
                }
              />
            </div>
          )}
        </div>
      }
    >
      <div className="flex items-center justify-between gap-4 px-14 pt-2">
        <HpBar name={villain.name} hp={state.bossHp} max={chamber.bossHp} />
        <Hearts hearts={state.hearts} />
      </div>
      {/* room above it to come up close, and floor below its feet to come
          forward onto */}
      <div className="pt-20 pb-10">
        {/* a little smaller on a phone, so it fits even up close */}
        <div className="flex origin-bottom scale-[0.7] justify-center sm:scale-100">
          <Villain
            key={blow}
            villain={villain}
            mode={mode}
            onDone={done}
            prowl
            scale={1.25}
            className="max-w-full h-auto"
          />
        </div>
        <FloorLine />
      </div>
    </QuestScene>,
  );
}

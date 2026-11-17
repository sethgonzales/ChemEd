import { useEffect, useMemo, useRef, useState } from 'react';
import Container from '~/components/container';
import QuestChamber from '~/components/quest-chamber';
import QuestGate from '~/components/quest-gate';
import QuestMap from '~/components/quest-map';
import { CHAMBERS, CHAMBER_IDS, findChamber } from '~/constants/quest-chambers';
import { ALCHEMIST_ID, alchemistChamber } from '~/constants/quest-final';
import {
  COURSES,
  parseSetup,
  recordClear,
  type Course,
  type Progress,
  type QuestSetup,
} from '~/utils/quest';
import {
  loadProgress,
  loadSetup,
  saveProgress,
  saveSetup,
} from '~/utils/quest-storage';
import { QUESTION_SOURCES } from '~/utils/quest-sources';
import { useMusic } from '~/utils/music-player';
import { useChimeSound } from '~/utils/sounds';

type View =
  | { at: 'gate' }
  | { at: 'map' }
  | { at: 'chamber'; id: string; course: Course; seed: number };

// a fresh seed for each play: new rooms and new questions
const newSeed = () => Math.floor(Math.random() * 2 ** 32);

const ALL: QuestSetup = { topics: CHAMBER_IDS, course: 'general' };
const ENTER_PAUSE = 1800; // ms of quiet, with a chime, before a chamber's theme

/**
 * Where a visit starts: a chamber link opens its story, a setup link fills in
 * the gate, and otherwise the saved setup goes straight to the map
 */
function arrive(query: string): { setup: QuestSetup; view: View } {
  const params = new URLSearchParams(query);
  const saved = loadSetup(CHAMBER_IDS);
  const chamber = params.get('chamber');
  if (chamber && (chamber === ALCHEMIST_ID || findChamber(chamber))) {
    const { course } = parseSetup(query, CHAMBER_IDS);
    return {
      setup: saved ?? { ...ALL, course },
      view: { at: 'chamber', id: chamber, course, seed: newSeed() },
    };
  }
  if (params.has('topics') || params.has('course'))
    return { setup: parseSetup(query, CHAMBER_IDS), view: { at: 'gate' } };
  return saved
    ? { setup: saved, view: { at: 'map' } }
    : { setup: ALL, view: { at: 'gate' } };
}

export default function DungeonQuest() {
  const [setup, setSetup] = useState<QuestSetup>(ALL);
  const [progress, setProgress] = useState<Progress>({});
  const [view, setView] = useState<View | null>(null); // read on mount
  // the chamber's stage and boss HP, for the music
  const [stage, setStage] = useState<string>('story');
  const [bossHp, setBossHp] = useState(0);
  // the gate and map have the dungeon's theme; a chamber its own, quicker
  // in the boss fight, and quicker still on the boss's last hit point
  const inChamber = view?.at === 'chamber';
  const fighting = inChamber && stage === 'boss';
  useMusic(
    // hushed while the boss's door swings open, and at game over for its
    // own tune
    view && stage !== 'door' && stage !== 'defeat'
      ? inChamber
        ? view.id
        : 'dungeon'
      : null,
    fighting && (bossHp === 1 ? 'finale' : true),
    // stepping into a chamber: a hush and a chime before its theme
    inChamber && !fighting ? ENTER_PAUSE : 0,
  );
  const playChime = useChimeSound();

  useEffect(() => {
    const start = arrive(window.location.search);
    setSetup(start.setup);
    setView(start.view);
    setProgress(loadProgress());
  }, []);

  // each new screen (a chamber, the map, the gate) starts at the top
  const screenKey =
    view && (view.at === 'chamber' ? `${view.id}:${view.seed}` : view.at);
  const firstScreen = useRef(true);
  useEffect(() => {
    if (!screenKey) return;
    if (firstScreen.current) {
      firstScreen.current = false; // arriving: leave the browser's scroll be
      return;
    }
    window.scrollTo({ top: 0 });
  }, [screenKey]);

  const enter = (s: QuestSetup) => {
    saveSetup(s);
    setSetup(s);
    setView({ at: 'map' });
  };

  const clear = (id: string, course: Course, stars: number) =>
    setProgress((p) => {
      const next = recordClear(p, course, id, stars);
      saveProgress(next);
      return next;
    });

  // the Alchemist's chamber is built from the setup, fresh for each play
  const chamber = useMemo(() => {
    if (view?.at !== 'chamber') return undefined;
    return view.id === ALCHEMIST_ID
      ? alchemistChamber(setup.topics, view.course, view.seed)
      : findChamber(view.id);
  }, [view, setup.topics]);
  // cite the facts behind the chambers in play: this one, or every chosen
  // one (the Alchemist asks from them all)
  const chosen = CHAMBERS.filter((c) => setup.topics.includes(c.id));
  const cited = (
    chamber && chamber.id !== ALCHEMIST_ID ? [chamber] : chosen
  ).flatMap((c) => QUESTION_SOURCES[c.page].sources);

  return (
    <Container
      header="Dungeon Quest"
      description="Fight through the chambers: solve each room, then answer the boss’s questions to beat it."
      backHref="/"
      game
      // in a chamber, the back arrow leaves it for the map
      back={
        view?.at === 'chamber'
          ? {
              label: 'Leave the chamber',
              onClick: () => setView({ at: 'map' }),
            }
          : undefined
      }
      sources={cited}
      className="gap-4"
    >
      {/* each screen fades in from the dark */}
      <div
        key={screenKey ?? 'none'}
        data-fade
        className="quest-fade-in flex flex-col gap-4"
      >
        {view?.at === 'gate' && <QuestGate initial={setup} onEnter={enter} />}
        {view?.at === 'map' && (
          <QuestMap
            setup={setup}
            progress={progress}
            onPick={(id) => {
              playChime();
              setView({
                at: 'chamber',
                id,
                course: setup.course,
                seed: newSeed(),
              });
            }}
            onChange={() => setView({ at: 'gate' })}
          />
        )}
        {view?.at === 'chamber' && chamber && (
          <>
            <p className="font-pixel text-sm">
              {chamber.topic} · {COURSES[view.course]}
            </p>
            <QuestChamber
              key={view.seed}
              chamber={chamber}
              course={view.course}
              seed={view.seed}
              onClear={(stars) => clear(chamber.id, view.course, stars)}
              onExit={() => setView({ at: 'map' })}
              onReplay={() => setView({ ...view, seed: newSeed() })}
              onStage={(s, hp) => {
                setStage(s);
                setBossHp(hp);
              }}
            />
          </>
        )}
      </div>
    </Container>
  );
}
